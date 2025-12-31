
const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
    try {
        const PDFParseClass = pdf.PDFParse || pdf.default?.PDFParse || pdf.default || pdf;
        // Minimal PDF 1.4 header and body (this might be too simple but let's try)
        // Actually, creating a valid PDF binary in JS string is hard.
        // I will just try to instantiate and call getText on a dummy buffer and see if it throws or returns empty.
        // If it returns empty on garbage, that's expected.
        // But I want to know the structure of the return value of getText().

        // Let's mock the internal behavior if we can't provide a real PDF.
        // Or better, let's just see if we can find a PDF in the repo to test with.

        console.log('Testing PDFParseClass...');
        const parser = new PDFParseClass({ data: Buffer.from('%PDF-1.4\n%...') }); // Invalid PDF
        try {
            const data = await parser.getText();
            console.log('getText returned:', data);
        } catch (e) {
            console.log('getText failed (expected for invalid PDF):', e.message);
        }
    } catch (e) {
        console.error(e);
    }
}

test();
