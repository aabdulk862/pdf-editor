/**
 * DOCX export for letterhead templates.
 * Generates a Word document (.docx) with the letterhead header and placeholder body text.
 */
import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, TextRun } from 'docx';

import type { Alignment, LetterheadTemplate, LetterheadTextField } from '../types';

/** Convert mm to EMU (English Metric Units) used by docx for page dimensions. */
function mmToTwip(mm: number): number {
  return Math.round(mm * 56.692);
}

/** Map template alignment to docx AlignmentType. */
function mapAlignment(alignment: Alignment): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (alignment) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    default:
      return AlignmentType.LEFT;
  }
}

/** Strip '#' prefix from hex color for docx. */
function formatColor(hex: string): string {
  return hex.replace(/^#/, '');
}

/** Convert pt font size to half-points (docx uses half-points). */
function ptToHalfPoints(pt: number): number {
  return pt * 2;
}

/** Create a TextRun from a LetterheadTextField. */
function createTextRun(field: LetterheadTextField): TextRun {
  return new TextRun({
    text: field.content,
    font: field.fontFamily,
    size: ptToHalfPoints(field.fontSize),
    color: formatColor(field.color),
  });
}

/** Create a Paragraph from a LetterheadTextField. */
function createTextParagraph(field: LetterheadTextField): Paragraph {
  if (!field.content.trim()) return new Paragraph({});

  return new Paragraph({
    alignment: mapAlignment(field.alignment),
    spacing: { after: 40 },
    children: [createTextRun(field)],
  });
}

/**
 * Export a letterhead template as a DOCX Blob.
 * The document includes the letterhead header section and placeholder body text.
 */
export async function exportLetterheadAsDocx(template: LetterheadTemplate): Promise<Blob> {
  const headerChildren: Paragraph[] = [];

  // ─── Logo ────────────────────────────────────────────────────────────────
  if (template.logo && template.logo.data.byteLength > 0) {
    // Only support raster images (PNG/JPEG) in docx ImageRun
    if (template.logo.mimeType === 'image/png' || template.logo.mimeType === 'image/jpeg') {
      const logoWidth = template.logo.width;
      // Maintain a reasonable aspect ratio — assume roughly 1:0.5 if unknown
      const logoHeight = Math.round(logoWidth * 0.5);

      headerChildren.push(
        new Paragraph({
          alignment: mapAlignment(template.logo.alignment),
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: new Uint8Array(template.logo.data),
              transformation: { width: logoWidth, height: logoHeight },
              type: template.logo.mimeType === 'image/png' ? 'png' : 'jpg',
            }),
          ],
        }),
      );
    }
  }

  // ─── Company Name ────────────────────────────────────────────────────────
  if (template.companyName.content.trim()) {
    headerChildren.push(
      new Paragraph({
        alignment: mapAlignment(template.companyName.alignment),
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: template.companyName.content,
            font: template.companyName.fontFamily,
            size: ptToHalfPoints(template.companyName.fontSize),
            color: formatColor(template.companyName.color),
            bold: true,
          }),
        ],
      }),
    );
  }

  // ─── Address Lines ───────────────────────────────────────────────────────
  for (const line of template.addressLines) {
    if (line.content.trim()) {
      headerChildren.push(createTextParagraph(line));
    }
  }

  // ─── Phone, Email, Website ───────────────────────────────────────────────
  const contactFields = [template.phone, template.email, template.website];
  for (const field of contactFields) {
    if (field.content.trim()) {
      headerChildren.push(createTextParagraph(field));
    }
  }

  // ─── Tagline ─────────────────────────────────────────────────────────────
  if (template.tagline && template.tagline.content.trim()) {
    headerChildren.push(
      new Paragraph({
        alignment: mapAlignment(template.tagline.alignment),
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: template.tagline.content,
            font: template.tagline.fontFamily,
            size: ptToHalfPoints(template.tagline.fontSize),
            color: formatColor(template.tagline.color),
            italics: true,
          }),
        ],
      }),
    );
  }

  // ─── Separator ───────────────────────────────────────────────────────────
  if (template.showSeparator) {
    const sepColor = formatColor(template.separatorColor ?? '#E5E7EB');
    headerChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 200 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: sepColor,
          },
        },
      }),
    );
  } else {
    // Add some spacing before body even without separator
    headerChildren.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // ─── Body Placeholder ────────────────────────────────────────────────────
  const bodyParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Dear [Recipient],',
          font: 'Helvetica',
          size: ptToHalfPoints(12),
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Your letter content here.',
          font: 'Helvetica',
          size: ptToHalfPoints(12),
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Sincerely,',
          font: 'Helvetica',
          size: ptToHalfPoints(12),
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '[Your Name]',
          font: 'Helvetica',
          size: ptToHalfPoints(12),
        }),
      ],
    }),
  ];

  // ─── Document ────────────────────────────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mmToTwip(210), // A4 width
              height: mmToTwip(297), // A4 height
            },
            margin: {
              top: mmToTwip(25),
              right: mmToTwip(25),
              bottom: mmToTwip(20),
              left: mmToTwip(25),
            },
          },
        },
        children: [...headerChildren, ...bodyParagraphs],
      },
    ],
  });

  return Packer.toBlob(doc);
}
