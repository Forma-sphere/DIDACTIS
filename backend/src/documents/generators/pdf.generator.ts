import * as PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

export function generatePdf(
  filePath: string,
  title: string,
  sections: { heading: string; content: string }[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(1.5);

    for (const section of sections) {
      doc.fontSize(14).font('Helvetica-Bold').text(section.heading);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(section.content);
      doc.moveDown(1);
    }

    doc.end();
  });
}
