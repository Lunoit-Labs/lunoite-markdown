import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

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

  const shortcuts = [
    { key: 'Ctrl + S', desc: 'Save changes to local file' },
    { key: 'Ctrl + O', desc: 'Open single Markdown file' },
    { key: 'Ctrl + Alt + O', desc: 'Open workspace folder' },
    { key: 'Ctrl + Shift + O', desc: 'Workspace history & switch' },
    { key: 'Ctrl + Alt + N', desc: 'Create new workspace' },
    { key: 'Ctrl + Shift + F', desc: 'Search text across workspace' },
    { key: 'Ctrl + F', desc: 'Find in active document' },
    { key: 'Ctrl + Shift + R', desc: 'Refresh workspace file tree' },
    { key: 'Alt + E', desc: 'Toggle File Explorer sidebar' },
    { key: 'Alt + M', desc: 'Toggle Rendered / Raw Markdown' },
    { key: 'Drag page edge', desc: 'Adjust page width (Double-click to reset)' },
    { key: 'Alt + Z', desc: 'Toggle Zen focus mode' },
    { key: 'Alt + S', desc: 'Toggle Reference Shelf' },
    { key: 'Ctrl + B', desc: 'Bold text formatting' },
    { key: 'Ctrl + I', desc: 'Italic text formatting' },
    { key: 'Ctrl + Z', desc: 'Undo last change' },
    { key: 'Ctrl + Shift + Z', desc: 'Redo last change' },
  ];

  const markdownTriggers = [
    { trigger: '# + Space', desc: 'Heading 1' },
    { trigger: '## + Space', desc: 'Heading 2' },
    { trigger: '### + Space', desc: 'Heading 3' },
    { trigger: '- or * + Space', desc: 'Bullet list item' },
    { trigger: '[] or [ ] + Space', desc: 'Interactive task checklist' },
    { trigger: '> + Space', desc: 'Quote block' },
    { trigger: '``` + Enter', desc: 'Code block' },
    { trigger: '--- + Enter', desc: 'Horizontal divider line' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="w-full max-w-2xl rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] p-6 shadow-2xl text-[#191b1f] dark:text-[#eceef2] transition-all">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e5e3dc] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#2d6a4f] dark:text-[#52b788]" aria-hidden="true" />
            <h2 id="shortcuts-title" className="font-semibold text-sm">
              Keyboard Shortcuts & Markdown Triggers
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <h3 className="font-semibold text-xs text-[#2d6a4f] dark:text-[#52b788] mb-3 uppercase tracking-wider">
              Application Shortcuts
            </h3>
            <ul className="space-y-2.5">
              {shortcuts.map(s => (
                <li key={s.key} className="flex items-center justify-between gap-6 py-0.5">
                  <span className="text-[#59606d] dark:text-[#9ba2b0] whitespace-nowrap">{s.desc}</span>
                  <kbd className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px] font-medium border border-[#e5e3dc] dark:border-[#282b33] text-[#191b1f] dark:text-[#eceef2]">
                    {s.key}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs text-[#2d6a4f] dark:text-[#52b788] mb-3 uppercase tracking-wider">
              Inline Markdown Triggers
            </h3>
            <ul className="space-y-2.5">
              {markdownTriggers.map(t => (
                <li key={t.trigger} className="flex items-center justify-between gap-6 py-0.5">
                  <span className="text-[#59606d] dark:text-[#9ba2b0] whitespace-nowrap">{t.desc}</span>
                  <kbd className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px] font-medium border border-[#e5e3dc] dark:border-[#282b33] text-[#191b1f] dark:text-[#eceef2]">
                    {t.trigger}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-[#e5e3dc] dark:border-[#282b33]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#2d6a4f] hover:bg-[#24553f] dark:bg-[#52b788] dark:hover:bg-[#429d73] text-white dark:text-[#111215] transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
