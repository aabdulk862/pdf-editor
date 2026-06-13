import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface MiniEditorProps {
  /** HTML content or plain text */
  content: string;
  /** Called with HTML string on every change */
  onChange: (html: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Min height in px */
  minHeight?: number;
  /** Show formatting toolbar */
  toolbar?: boolean;
  /** Additional class on the container */
  className?: string;
}

/**
 * Shared TipTap rich text editor component.
 * Supports bold, italic, strike, bullet/ordered lists, and headings.
 * Used across Text Overlay, Form Fill, Canvas Editor, Receipt Generator, and Bookmarks.
 */
export function MiniEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 120,
  toolbar = true,
  className = '',
}: MiniEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-sm max-w-none',
        style: `min-height:${minHeight}px`,
        'data-placeholder': placeholder,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content && content !== undefined) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div
      className={`mini-editor rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 overflow-hidden ${className}`}
    >
      {toolbar && (
        <div className="flex flex-wrap gap-0.5 border-b border-secondary-200 dark:border-secondary-700 px-2 py-1.5 bg-secondary-50 dark:bg-secondary-900">
          <ToolbarBtn
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          >
            B
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          >
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            label="Strikethrough"
          >
            <s>S</s>
          </ToolbarBtn>
          <div className="w-px h-5 bg-secondary-300 dark:bg-secondary-600 mx-1 self-center" />
          <ToolbarBtn
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Bullet list"
          >
            •
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Numbered list"
          >
            1.
          </ToolbarBtn>
        </div>
      )}
      <EditorContent editor={editor} className="px-3 py-2" />
      <style>{`
        .mini-editor .ProseMirror { outline: none; }
        .mini-editor .ProseMirror p { margin: 0.25em 0; }
        .mini-editor .ProseMirror ul, .mini-editor .ProseMirror ol { padding-left: 1.5em; margin: 0.25em 0; }
        .mini-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`min-w-[28px] min-h-[28px] px-1.5 rounded text-xs font-semibold transition-colors
        ${
          active
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
            : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-700'
        }`}
    >
      {children}
    </button>
  );
}
