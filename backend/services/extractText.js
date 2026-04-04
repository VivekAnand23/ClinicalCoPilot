const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const Tesseract = require('tesseract.js');

async function extractTextFromPDF(fileBuffer) {
  try {
    const uint8 = new Uint8Array(fileBuffer);
    const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;

    const pageTexts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      pageTexts.push(pageText);
    }

    const text = pageTexts.join('\n\n');

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }

    return text;
  } catch (err) {
    if (err.message.includes('No text')) throw err;
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

async function extractTextFromImage(fileBuffer) {
  try {
    const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng');

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the image');
    }

    return text;
  } catch (err) {
    if (err.message.includes('No text')) throw err;
    throw new Error(`Image OCR failed: ${err.message}`);
  }
}

async function extractText(fileBuffer, fileType) {
  if (fileType === 'pdf') {
    return extractTextFromPDF(fileBuffer);
  }
  if (['jpg', 'png', 'heic'].includes(fileType)) {
    return extractTextFromImage(fileBuffer);
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}

module.exports = { extractText, extractTextFromPDF, extractTextFromImage };
