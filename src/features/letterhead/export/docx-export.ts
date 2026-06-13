/**
 * DOCX export for letterhead templates.
 */
import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, TextRun } from 'docx';

import type { Alignment, LetterheadTemplate } from '../types';
import { getEffectiveLetterBody } from '../utils/defaults';

const LETTER_WIDTH = 12240;
const LETTER_HEIGHT = 15840;
const MARGIN = 1440;

function mapAlignment(a: Alignment): (typeof AlignmentType)[keyof typeof AlignmentType] {
  return a === 'center'
    ? AlignmentType.CENTER
    : a === 'right'
      ? AlignmentType.RIGHT
      : AlignmentType.LEFT;
}

function fmt(hex: string): string {
  return hex.replace(/^#/, '');
}
function hp(pt: number): number {
  return pt * 2;
}

function safeFont(f: string): string {
  return f === 'Times' ? 'Times New Roman' : f === 'Courier' ? 'Courier New' : 'Arial';
}

export async function exportLetterheadAsDocx(template: LetterheadTemplate): Promise<Blob> {
  const font = safeFont(template.companyName.fontFamily);
  const layout = template.layout ?? 'centered';
  const color = fmt(template.companyName.color);
  const children: Paragraph[] = [];

  if (layout === 'logo-center') {
    // Clean centered letterhead: Logo, then org name lines, then contact
    // Logo centered
    if (
      template.logo?.data.byteLength &&
      (template.logo.mimeType === 'image/png' || template.logo.mimeType === 'image/jpeg')
    ) {
      const lw = Math.min(template.logo.width, 100);
      const lh = Math.round(lw * 0.6);
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: new Uint8Array(template.logo.data),
              transformation: { width: lw, height: lh },
              type: template.logo.mimeType === 'image/png' ? 'png' : 'jpg',
            }),
          ],
        }),
      );
    }

    // Left + right header text merged as centered lines
    const allHeaderLines = [
      ...(template.headerLeftText ?? '').split('\n').filter((l) => l.trim()),
      ...(template.headerRightText ?? '').split('\n').filter((l) => l.trim()),
    ];
    for (const line of allHeaderLines) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: line, font, size: hp(12), color, bold: true })],
        }),
      );
    }
  } else {
    // Other layouts: logo + company name stacked
    if (
      template.logo?.data.byteLength &&
      (template.logo.mimeType === 'image/png' || template.logo.mimeType === 'image/jpeg')
    ) {
      const lw = Math.min(template.logo.width, 200);
      const lh = Math.round(lw * 0.5);
      children.push(
        new Paragraph({
          alignment: mapAlignment(template.logo.alignment),
          spacing: { after: 200 },
          children: [
            new ImageRun({
              data: new Uint8Array(template.logo.data),
              transformation: { width: lw, height: lh },
              type: template.logo.mimeType === 'image/png' ? 'png' : 'jpg',
            }),
          ],
        }),
      );
    }
    if (template.companyName.content.trim()) {
      children.push(
        new Paragraph({
          alignment: mapAlignment(template.companyName.alignment),
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: template.companyName.content,
              font,
              size: hp(template.companyName.fontSize),
              color,
              bold: true,
            }),
          ],
        }),
      );
    }
    if (template.tagline?.content.trim()) {
      children.push(
        new Paragraph({
          alignment: mapAlignment(template.tagline.alignment),
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: template.tagline.content,
              font: safeFont(template.tagline.fontFamily),
              size: hp(template.tagline.fontSize),
              color: fmt(template.tagline.color),
              italics: true,
            }),
          ],
        }),
      );
    }
  }

  // Contact bar
  const parts = [template.phone, template.email, template.website]
    .map((f) => f.content.trim())
    .filter(Boolean);
  if (parts.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: parts.join('  •  '),
            font,
            size: hp(9),
            color: fmt(template.phone.color || '#6b7280'),
          }),
        ],
      }),
    );
  }

  // Address
  const addr = template.addressLines
    .map((l) => l.content.trim())
    .filter(Boolean)
    .join(', ');
  if (addr) {
    children.push(
      new Paragraph({
        alignment: mapAlignment(template.addressLines[0].alignment),
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: addr,
            font,
            size: hp(9),
            color: fmt(template.addressLines[0].color || '#6b7280'),
          }),
        ],
      }),
    );
  }

  // Separator
  if (template.showSeparator) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 300 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: fmt(template.separatorColor ?? '#cccccc'),
          },
        },
      }),
    );
  } else {
    children.push(new Paragraph({ spacing: { after: 300 } }));
  }

  // Body
  const body = getEffectiveLetterBody(template);
  for (const line of body.split('\n')) {
    children.push(
      new Paragraph({
        spacing: { after: line.trim() === '' ? 200 : 100, line: 276 },
        children: line.trim()
          ? [new TextRun({ text: line, font, size: hp(11), color: '000000' })]
          : [],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: LETTER_WIDTH, height: LETTER_HEIGHT },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
