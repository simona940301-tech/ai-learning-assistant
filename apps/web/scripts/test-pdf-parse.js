
const pdf = require('pdf-parse');
console.log('Type of pdf export:', typeof pdf);
console.log('Keys of pdf export:', Object.keys(pdf));
if (typeof pdf === 'function') {
    console.log('pdf is a function');
}
try {
    const PDFParseClass = pdf.PDFParse || pdf.default?.PDFParse || pdf.default || pdf;
    console.log('PDFParseClass type:', typeof PDFParseClass);
    if (typeof PDFParseClass === 'function') {
        try {
            const instance = new PDFParseClass({ data: Buffer.from('test') });
            console.log('Successfully instantiated PDFParseClass');
        } catch (e) {
            console.log('Failed to instantiate PDFParseClass:', e.message);
        }
    }
} catch (e) {
    console.log('Error checking class:', e);
}
