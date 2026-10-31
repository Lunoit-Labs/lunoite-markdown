import React, { useState, useEffect, useRef } from 'react';
import { ReferenceCard, CardCategory } from '../../types/shelf';
import { X, BookmarkPlus } from 'lucide-react';

interface NewCardModalProps {
  isOpen: boolean;
  initialCard?: ReferenceCard | null;
  initialContent?: string;
  onClose: () => void;
  onSave: (card: Omit<ReferenceCard, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
}

export const NewCardModal: React.FC<NewCardModalProps> = ({
  isOpen,
  initialCard,
  initialContent = '',
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CardCategory>('snippet');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialCard) {
        setTitle(initialCard.title);
        setCategory(initialCard.category);
        setTagsInput(initialCard.tags.join(', '));
        setContent(initialCard.content);
      } else {
        setTitle('');
        setCategory('snippet');
        setTagsInput('');
        setContent(initialContent || '');
      }
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialCard, initialContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSave(
      {
        title: title.trim(),
        category,
        tags,
        content: content.trim(),
      },
      initialCard?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] p-5 shadow-xl text-[#191b1f] dark:text-[#eceef2] transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e3dc] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-[#2d6a4f] dark:text-[#52b788]" aria-hidden="true" />
            <h2 id="card-modal-title" className="font-semibold text-sm">
              {initialCard ? 'Edit Reference Card' : 'New Reference Card'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label htmlFor="card-title" className="block text-xs font-medium text-[#59606d] dark:text-[#9ba2b0] mb-1">
              Title *
            </label>
            <input
              id="card-title"
              ref={titleInputRef}
              type="text"
              required
              placeholder="e.g. STAR: Database Migration"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded border border-[#e5e3dc] dark:border-[#282b33] bg-transparent focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="card-category" className="block text-xs font-medium text-[#59606d] dark:text-[#9ba2b0] mb-1">
                Category
              </label>
              <select
                id="card-category"
                value={category}
                onChange={e => setCategory(e.target.value as CardCategory)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-[#e5e3dc] dark:border-[#282b33] bg-transparent focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
              >
                <option value="star" className="bg-[#ffffff] dark:bg-[#17191e]">
                  STAR Story
                </option>
                <option value="snippet" className="bg-[#ffffff] dark:bg-[#17191e]">
                  Code Snippet
                </option>
                <option value="template" className="bg-[#ffffff] dark:bg-[#17191e]">
                  Template
                </option>
                <option value="note" className="bg-[#ffffff] dark:bg-[#17191e]">
                  Reference Note
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="card-tags" className="block text-xs font-medium text-[#59606d] dark:text-[#9ba2b0] mb-1">
                Tags (comma separated)
              </label>
              <input
                id="card-tags"
                type="text"
                placeholder="Interview, React"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-[#e5e3dc] dark:border-[#282b33] bg-transparent focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="card-content" className="block text-xs font-medium text-[#59606d] dark:text-[#9ba2b0] mb-1">
              Card Content (Markdown) *
            </label>
            <textarea
              id="card-content"
              rows={6}
              required
              placeholder="Write or paste your Markdown snippet..."
              value={content}
              onChange={e => setContent(e.target.value)}
              spellCheck={false}
              className="w-full px-3 py-2 text-xs font-mono rounded border border-[#e5e3dc] dark:border-[#282b33] bg-transparent focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#e5e3dc] dark:border-[#282b33]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#e5e3dc] dark:border-[#282b33] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#2d6a4f] hover:bg-[#24553f] dark:bg-[#52b788] dark:hover:bg-[#429d73] text-white dark:text-[#111215] transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            >
              {initialCard ? 'Save Changes' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
