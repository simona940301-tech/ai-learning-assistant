import { TextItem } from 'pdfjs-dist/types/src/display/api'

export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

export interface Block {
    id: string
    text: string
    rects: Rect[]
    pageIndex: number
}

/**
 * Block Anchoring Service
 * 
 * Groups raw PDF text items into logical blocks (paragraphs) to provide
 * stable anchors for AI interactions, solving the "fuzzy selection" problem.
 */
export class BlockAnchoringService {
    /**
     * Groups PDF text items into logical blocks based on Y-coordinate and font style.
     * 
     * @param items Raw text items from PDF.js
     * @param pageIndex The page index (0-based)
     * @param viewport The PDF page viewport (for coordinate normalization if needed)
     */
    static computeBlocks(items: any[], pageIndex: number, viewport: any): Block[] {
        if (!items || items.length === 0) return []

        const blocks: Block[] = []
        let currentBlock: Block | null = null
        let lastY = -1
        let lastX = -1
        let lastHeight = -1

        // Sort items by Y (top to bottom) then X (left to right)
        // Note: PDF coordinates usually have (0,0) at bottom-left, but PDF.js viewport handles this.
        // We assume items are roughly in reading order, but sorting helps.
        // For simplicity, we process them as provided by PDF.js which is usually reading order.

        items.forEach((item, index) => {
            // PDF.js text item structure:
            // item.str: string
            // item.transform: [scaleX, skewY, skewX, scaleY, x, y]
            // item.width: number
            // item.height: number

            const x = item.transform[4]
            const y = item.transform[5] // Note: In PDF coords, Y increases upwards usually, but check viewport
            const width = item.width
            const height = item.height || item.transform[3] // Fallback to scaleY

            // Heuristic for new block:
            // 1. Significant Y difference (new line that is far apart)
            // 2. Significant X difference (new column - simplified)
            // 3. Different font style (header vs body - simplified)

            // Simplified Y-diff check (assuming standard horizontal text)
            // We use a threshold relative to font height
            const isNewLine = Math.abs(y - lastY) > (height * 0.5)
            const isFarApart = Math.abs(y - lastY) > (height * 1.5) // Gap > 1.5 lines -> new paragraph

            if (!currentBlock || isFarApart) {
                // Start new block
                if (currentBlock) {
                    blocks.push(currentBlock)
                }

                currentBlock = {
                    id: `block-${pageIndex}-${index}`,
                    text: item.str,
                    rects: [{ x, y, width, height }],
                    pageIndex
                }
            } else {
                // Append to current block
                // Add space if needed (heuristic: x gap > char width)
                // For now, just add space if it's a new line or significant gap
                const space = (isNewLine || x > lastX + width) ? ' ' : ''
                currentBlock.text += space + item.str

                // Merge rects if possible, or push new rect
                // For simplicity, we store individual item rects and can union them later
                currentBlock.rects.push({ x, y, width, height })
            }

            lastY = y
            lastX = x
            lastHeight = height
        })

        if (currentBlock) {
            blocks.push(currentBlock)
        }

        return blocks
    }

    /**
     * Finds the block that best matches the user's selection.
     * 
     * @param selectedText The text selected by the user
     * @param blocks The computed blocks for the page
     */
    static findSelectedBlock(selectedText: string, blocks: Block[]): Block | null {
        if (!selectedText || !blocks) return null

        // Normalize text for comparison (remove extra spaces, newlines)
        const normalizedSelection = selectedText.replace(/\s+/g, '').toLowerCase()

        let bestMatch: Block | null = null
        let maxOverlap = 0

        for (const block of blocks) {
            const normalizedBlockText = block.text.replace(/\s+/g, '').toLowerCase()

            // Check if selection is contained in block or block is contained in selection
            if (normalizedBlockText.includes(normalizedSelection) || normalizedSelection.includes(normalizedBlockText)) {
                // Simple containment check
                // Prefer the block that contains the selection
                if (normalizedBlockText.includes(normalizedSelection)) {
                    return block // Found exact container
                }

                // If selection spans multiple blocks, this logic needs to be enhanced to return multiple blocks
                // For now, we return the first matching block (usually the start block)
                bestMatch = block
            }
        }

        return bestMatch
    }
}
