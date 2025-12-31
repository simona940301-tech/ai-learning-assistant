import { Block } from './block-anchoring'

// We need to duplicate the logic or import it. 
// Since importing non-worker modules into a worker can be tricky depending on the bundler config,
// we'll define the core logic here or import a pure logic function.
// For safety and simplicity in this environment, I'll move the pure logic to a shared helper 
// and import it, or just duplicate the pure function if imports are restricted.
// Let's try to keep it self-contained for the worker to avoid complex dependency chains.

// Re-defining interfaces to avoid import issues in some setups, 
// but ideally we share them.
interface Rect {
    x: number
    y: number
    width: number
    height: number
}

interface BlockData {
    id: string
    text: string
    rects: Rect[]
    pageIndex: number
}

// The worker message handler
self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data

    if (type === 'COMPUTE_BLOCKS') {
        const { items, pageIndex, viewport } = payload
        try {
            const blocks = computeBlocks(items, pageIndex, viewport)
            self.postMessage({ type: 'BLOCKS_COMPUTED', payload: { pageIndex, blocks } })
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { error: String(error) } })
        }
    }
}

/**
 * Pure logic for computing blocks (duplicated from service for worker isolation)
 */
function computeBlocks(items: any[], pageIndex: number, viewport: any): BlockData[] {
    if (!items || items.length === 0) return []

    const blocks: BlockData[] = []
    let currentBlock: BlockData | null = null
    let lastY = -1
    let lastX = -1
    let lastHeight = -1

    items.forEach((item: any, index: number) => {
        const x = item.transform[4]
        const y = item.transform[5]
        const width = item.width
        const height = item.height || item.transform[3]

        const isNewLine = Math.abs(y - lastY) > (height * 0.5)
        const isFarApart = Math.abs(y - lastY) > (height * 1.5)

        if (!currentBlock || isFarApart) {
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
            const space = (isNewLine || x > lastX + width) ? ' ' : ''
            currentBlock.text += space + item.str
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
