import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-react';
import { SearchHighlightStorage, SearchMatchRange } from '../../lib/searchHighlightExtension';

interface EditorFindBarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  isZenMode?: boolean;
}

export const EditorFindBar: React.FC<EditorFindBarProps> = ({
  editor,
  isOpen,
  onClose,
  initialQuery,
  isZenMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery || '');
  const [matchCase, setMatchCase] = useState(false);
  const [matches, setMatches] = useState<SearchMatchRange[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state from editor storage
  const syncFromEditor = useCallback(() => {
    if (!editor) return;
    const storage = editor.storage as unknown as { searchHighlight?: SearchHighlightStorage };
    const currentMatches = storage?.searchHighlight?.matches || [];
    const currentActiveIndex = storage?.searchHighlight?.activeIndex ?? 0;
    setMatches(currentMatches);
    setActiveIndex(currentActiveIndex);
  }, [editor]);

  // Sync initial query if passed
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== searchTerm) {
      setSearchTerm(initialQuery);
      if (editor && initialQuery.trim()) {
        editor.commands.setSearchTerm(initialQuery, matchCase);
        syncFromEditor();
      }
    }
  }, [initialQuery, editor, matchCase, syncFromEditor]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      syncFromEditor();
    }
  }, [isOpen, syncFromEditor]);

  // Subscribe to editor transactions to keep match count and active index in real-time sync
  useEffect(() => {
    if (!editor) return;

    syncFromEditor();

    const handleSync = () => {
      syncFromEditor();
    };

    editor.on('transaction', handleSync);
    editor.on('update', handleSync);

    return () => {
      editor.off('transaction', handleSync);
      editor.off('update', handleSync);
    };
  }, [editor, syncFromEditor]);

  // Handle immediate input change (typing, backspace, paste)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (!editor) return;

    if (val.trim()) {
      editor.commands.setSearchTerm(val, matchCase);
    } else {
      editor.commands.clearSearchTerm();
    }
    syncFromEditor();
  };

  const handleNext = () => {
    if (editor) {
      editor.commands.nextMatch();
      syncFromEditor();
    }
  };

  const handlePrev = () => {
    if (editor) {
      editor.commands.previousMatch();
      syncFromEditor();
    }
  };

  const handleToggleMatchCase = () => {
    const nextMatchCase = !matchCase;
    setMatchCase(nextMatchCase);
    if (!editor) return;

    if (searchTerm.trim()) {
      editor.commands.setSearchTerm(searchTerm, nextMatchCase);
    } else {
      editor.commands.clearSearchTerm();
    }
    syncFromEditor();
  };

  const handleClear = () => {
    setSearchTerm('');
    if (editor) {
      editor.commands.clearSearchTerm();
    }
    setMatches([]);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    if (editor) {
      editor.commands.clearSearchTerm();
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`absolute ${
        isZenMode ? 'top-3' : 'top-12'
      } right-4 sm:right-8 z-40 flex items-center gap-1.5 p-1.5 rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] shadow-lg text-[#191b1f] dark:text-[#eceef2] select-none text-xs animate-in fade-in slide-in-from-top-2 duration-150`}
      role="search"
      aria-label="Find in Document"
    >
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 absolute left-2 text-[#59606d] dark:text-[#9ba2b0] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Find in page..."
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="pl-7 pr-6 py-1 w-36 sm:w-48 text-xs font-mono rounded border border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] text-[#191b1f] dark:text-[#eceef2] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 p-0.5 text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]"
            title="Clear text"
            aria-label="Clear text"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Match Count Badge */}
      <span className="text-[11px] font-mono px-1.5 text-[#59606d] dark:text-[#9ba2b0] min-w-[36px] text-center">
        {searchTerm.trim() ? (
          matches.length > 0 ? (
            `${activeIndex + 1}/${matches.length}`
          ) : (
            '0/0'
          )
        ) : (
          ''
        )}
      </span>

      {/* Previous Match */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={matches.length === 0}
        className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
        title="Previous Match (Shift+Enter)"
        aria-label="Previous match"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Next Match */}
      <button
        type="button"
        onClick={handleNext}
        disabled={matches.length === 0}
        className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
        title="Next Match (Enter)"
        aria-label="Next match"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Match Case Toggle */}
      <button
        type="button"
        onClick={handleToggleMatchCase}
        className={`p-1 rounded border text-[10px] font-mono transition-colors ${
          matchCase
            ? 'border-[#2d6a4f] text-[#2d6a4f] bg-[#2d6a4f]/10 dark:border-[#52b788] dark:text-[#52b788] dark:bg-[#52b788]/20 font-bold'
            : 'border-transparent text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]'
        } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
        title="Match Case"
        aria-label="Match case"
        aria-pressed={matchCase}
      >
        <CaseSensitive className="w-3.5 h-3.5" />
      </button>

      {/* Close Find Bar */}
      <button
        type="button"
        onClick={handleClose}
        className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
        title="Close (Esc)"
        aria-label="Close find bar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
