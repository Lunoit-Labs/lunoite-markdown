import React from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  Quote,
  BookmarkPlus,
} from 'lucide-react';

interface BubbleMenuProps {
  editor: Editor | null;
  onClipSelection: (text: string) => void;
  isActive?: boolean;
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({
  editor,
  onClipSelection,
  isActive = true,
}) => {
  if (!editor || !isActive) return null;

  const handleClip = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    if (selectedText.trim()) {
      onClipSelection(selectedText);
    }
  };

  return (
    <TiptapBubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 p-1 rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] shadow-xl text-[#191b1f] dark:text-[#eceef2] transition-all"
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('bold')
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Bold"
        aria-label="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('italic')
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Italic"
        aria-label="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('strike')
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('code')
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Inline Code"
        aria-label="Inline Code"
      >
        <Code className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-[#e5e3dc] dark:bg-[#282b33] mx-0.5" aria-hidden="true" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Heading 2"
        aria-label="Heading 2"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Heading 3"
        aria-label="Heading 3"
      >
        <Heading3 className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded transition-colors ${
          editor.isActive('blockquote')
            ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
            : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title="Quote"
        aria-label="Quote"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-[#e5e3dc] dark:bg-[#282b33] mx-0.5" aria-hidden="true" />

      {/* Clip to Shelf Card */}
      <button
        type="button"
        onClick={handleClip}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-[#2d6a4f] dark:text-[#52b788] hover:bg-[#2d6a4f]/10 dark:hover:bg-[#52b788]/15 transition-colors"
        title="Save selection as a reference shelf card"
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
        <span>Clip to Card</span>
      </button>
    </TiptapBubbleMenu>
  );
};
