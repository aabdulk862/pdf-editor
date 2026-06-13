import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Pagination } from 'tiptap-pagination-breaks';
import { useEffect } from 'react';

interface Props {
  content: string;
  onChange: (text: string) => void;
}

/** Convert plain text to HTML paragraphs for TipTap */
function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.trim() ? `<p>${line}</p>` : '<p><br></p>'))
    .join('');
}

/** Extract plain text from TipTap HTML */
function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const paragraphs = div.querySelectorAll('p');
  if (paragraphs.length === 0) return div.textContent || '';
  return Array.from(paragraphs)
    .map((p) => p.textContent || '')
    .join('\n');
}

export function LetterBodyEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Pagination.configure({
        pageHeight: 720, // 7.5in body area on US Letter (11in - 2in margins - 1.5in header)
        pageWidth: 624, // 6.5in content width (8.5in - 2in margins)
        pageMargin: 0,
      }),
    ],
    content: textToHtml(content),
    onUpdate: ({ editor }) => {
      onChange(htmlToText(editor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[600px]',
        style:
          'font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #111827;',
      },
    },
  });

  // Sync external content changes (e.g. from helper buttons)
  useEffect(() => {
    if (!editor) return;
    const currentText = htmlToText(editor.getHTML());
    if (currentText !== content) {
      editor.commands.setContent(textToHtml(content), false);
    }
  }, [content, editor]);

  return (
    <div className="letter-editor">
      <EditorContent editor={editor} />
      <style>{`
        .letter-editor .ProseMirror {
          padding: 0;
          width: 100%;
        }
        .letter-editor .ProseMirror p {
          margin: 0 0 0.2em 0;
        }
        .letter-editor .page-break {
          height: 24px;
          width: 100%;
          border-top: 2px dashed #9ca3af;
          margin: 12px 0;
          position: relative;
        }
        .letter-editor .page-break .page-number {
          position: absolute;
          right: 0;
          top: 2px;
          font-size: 11px;
          color: #6b7280;
          font-family: sans-serif;
        }
      `}</style>
    </div>
  );
}
