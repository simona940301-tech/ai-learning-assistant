/**
 * Test script for PDF extraction
 * 
 * Usage: tsx scripts/test-pdf-extraction.ts <path-to-pdf>
 */

import { extractTextFromPDF, cleanText } from '../lib/utils/text-extraction'
import { readFileSync } from 'fs'
import { resolve } from 'path'

async function testPDFExtraction(pdfPath: string) {
    console.log('='.repeat(60))
    console.log('PDF Extraction Test')
    console.log('='.repeat(60))
    console.log(`Testing file: ${pdfPath}`)
    console.log('')

    try {
        // Read PDF file
        const buffer = readFileSync(resolve(pdfPath))
        console.log(`✓ File loaded: ${buffer.length} bytes`)
        console.log('')

        // Extract text
        const { text, numPages } = await extractTextFromPDF(buffer)
        console.log('Extraction Results:')
        console.log(`  Pages: ${numPages}`)
        console.log(`  Raw text length: ${text.length} characters`)
        console.log('')

        // Clean text
        const cleaned = cleanText(text)
        console.log(`  Cleaned text length: ${cleaned.length} characters`)
        console.log('')

        // Validation check
        const minLength = 50
        if (cleaned.length < minLength) {
            console.log(`❌ FAIL: Text too short (${cleaned.length} < ${minLength})`)
            console.log(`   This would trigger the "文件內容太少" error`)
        } else {
            console.log(`✓ PASS: Text length sufficient (${cleaned.length} >= ${minLength})`)
        }
        console.log('')

        // Show preview
        if (cleaned.length > 0) {
            console.log('Text Preview (first 500 chars):')
            console.log('-'.repeat(60))
            console.log(cleaned.substring(0, 500))
            console.log('-'.repeat(60))
        } else {
            console.log('⚠️  WARNING: No text extracted!')
            console.log('   This PDF may be:')
            console.log('   - A scanned image without OCR')
            console.log('   - An empty document')
            console.log('   - Corrupted or password-protected')
        }

    } catch (error) {
        console.error('❌ ERROR:', error)
        if (error instanceof Error) {
            console.error('   Message:', error.message)
            console.error('   Stack:', error.stack)
        }
    }

    console.log('')
    console.log('='.repeat(60))
}

// Main execution
const pdfPath = process.argv[2]

if (!pdfPath) {
    console.error('Usage: tsx scripts/test-pdf-extraction.ts <path-to-pdf>')
    console.error('Example: tsx scripts/test-pdf-extraction.ts ~/Downloads/sample.pdf')
    process.exit(1)
}

testPDFExtraction(pdfPath)
    .then(() => {
        console.log('Test completed')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Test failed:', error)
        process.exit(1)
    })
