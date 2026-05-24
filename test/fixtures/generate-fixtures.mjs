/**
 * Script to generate PDF test fixtures using pdf-lib.
 * Run with: node test/fixtures/generate-fixtures.mjs
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function createSample1Page() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText('Sample PDF - Page 1', {
    x: 50,
    y: 700,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText('This is a test fixture for the PDF Editor.', {
    x: 50,
    y: 650,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const bytes = await doc.save();
  writeFileSync(join(__dirname, 'sample-1page.pdf'), bytes);
  console.log('Created sample-1page.pdf');
}

async function createSample5Pages() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 5; i++) {
    const page = doc.addPage([612, 792]); // US Letter

    page.drawText(`Sample PDF - Page ${i}`, {
      x: 50,
      y: 700,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`This is page ${i} of 5 in the test fixture.`, {
      x: 50,
      y: 650,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const bytes = await doc.save();
  writeFileSync(join(__dirname, 'sample-5pages.pdf'), bytes);
  console.log('Created sample-5pages.pdf');
}

async function main() {
  await createSample1Page();
  await createSample5Pages();
  console.log('All fixtures generated successfully.');
}

main().catch((err) => {
  console.error('Failed to generate fixtures:', err);
  process.exit(1);
});
