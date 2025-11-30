/**
 * Lightweight self-check for pdf-parse v2 in our Next.js server runtime.
 * Downloads a tiny public PDF and verifies extractTextFromPDF returns text and page count.
 */
import https from 'https'
import { extractTextFromPDF } from '../lib/utils/text-extraction'

async function fetchPdf(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download PDF, status ${res.statusCode}`))
          res.resume()
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function main() {
  const buffer = await fetchPdf('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
  const result = await extractTextFromPDF(buffer)
  if (!result.text || result.text.length === 0) {
    throw new Error('No text extracted from sample PDF')
  }
  if (result.numPages !== 1) {
    throw new Error(`Unexpected page count: ${result.numPages}`)
  }
  console.log('[verify-pdf-parse] ✅ OK', { length: result.text.length, pages: result.numPages })
}

main().catch((err) => {
  console.error('[verify-pdf-parse] ❌ Failed:', err)
  process.exit(1)
})
