import React, { useEffect, useRef } from 'react';
import { Search, X, CaseSensitive } from 'lucide-react';
import { FileTreeNode, OpenTab } from '../../types/workspace';
import { SearchMatch } from '../../types/search';
import { useWorkspaceSearch } from '../../hooks/useWorkspaceSearch';
import { WorkspaceSearchResults } from './WorkspaceSearchResults';

interface WorkspaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FileTreeNode[];
  readFile: (fileHandle?: FileSystemFileHandle, nativePath?: string) => Promise<string>;
  openTabs: OpenTab[];
  onSelectMatch: (node: FileTreeNode, match: SearchMatch, query?: string) => void;
  workspaceName?: string;
}

export const WorkspaceSearchModal: React.FC<WorkspaceSearchModalProps> = ({
  isOpen,
  onClose,
  tree,
  readFile,
  openTabs,
  onSelectMatch,
  workspaceName,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    query,
    setQuery,
    matchCase,
    setMatchCase,
    isSearching,
    results,
    totalMatches,
    totalFiles,
    clearSearch,
  } = useWorkspaceSearch({
    tree,
    readFile,
    openTabs,
  });

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Workspace Text Search"
    >
      <div
        className="w-full max-w-2xl max-h-[75vh] flex flex-col rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] shadow-xl text-[#191b1f] dark:text-[#eceef2] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e3dc] dark:border-[#282b33]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#2d6a4f] dark:text-[#52b788]" aria-hidden="true" />
            <h2 className="font-serif italic font-semibold text-sm">
              Search Workspace
            </h2>
            {workspaceName && (
              <span className="text-xs text-[#59606d] dark:text-[#9ba2b0] font-mono">
                ({workspaceName})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            aria-label="Close search dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Controls */}
        <div className="p-3 border-b border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215]">
          <div className="relative flex items-center gap-1.5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#59606d] dark:text-[#9ba2b0] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search text across all files in workspace..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 pl-9 pr-8 py-2 text-xs sm:text-sm font-mono rounded border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]"
                title="Clear query"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Match Case Toggle */}
            <button
              type="button"
              onClick={() => setMatchCase(prev => !prev)}
              className={`p-2 rounded border transition-colors ${
                matchCase
                  ? 'border-[#2d6a4f] text-[#2d6a4f] bg-[#2d6a4f]/10 dark:border-[#52b788] dark:text-[#52b788] dark:bg-[#52b788]/20 font-bold'
                  : 'border-[#e5e3dc] dark:border-[#282b33] text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] bg-[#ffffff] dark:bg-[#17191e]'
              } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
              title="Match Case"
              aria-label="Toggle match case"
              aria-pressed={matchCase}
            >
              <CaseSensitive className="w-4 h-4" />
            </button>
          </div>

          {/* Results Summary Subtitle */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#59606d] dark:text-[#9ba2b0] px-1">
            <span>
              {isSearching ? (
                'Searching files...'
              ) : query.trim() ? (
                totalMatches > 0 ? (
                  `${totalMatches} match${totalMatches === 1 ? '' : 'es'} in ${totalFiles} file${totalFiles === 1 ? '' : 's'}`
                ) : (
                  `No matches found for "${query}"`
                )
              ) : (
                'Type words, sentences, or code snippets to search'
              )}
            </span>
            <span className="font-mono text-[10px]">Esc to close</span>
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[160px] max-h-[50vh]">
          {!workspaceName && tree.length === 0 && openTabs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] space-y-1.5">
              <p className="font-medium text-[#191b1f] dark:text-[#eceef2]">
                No workspace folder open
              </p>
              <p>Open a folder (Ctrl+O) to search across all your documents and notes.</p>
            </div>
          ) : query.trim() && results.length > 0 ? (
            <WorkspaceSearchResults
              results={results}
              onSelectMatch={(result, match) => {
                onSelectMatch(result.node, match, query);
                onClose();
              }}
            />
          ) : query.trim() && !isSearching ? (
            <div className="py-12 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] space-y-1">
              <p className="font-medium text-[#191b1f] dark:text-[#eceef2]">
                No matching text found
              </p>
              <p>Check spelling or try turning off case sensitivity.</p>
            </div>
          ) : !query.trim() ? (
            <div className="py-12 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] space-y-1">
              <p className="font-medium text-[#191b1f] dark:text-[#eceef2]">
                Full Workspace Text Search
              </p>
              <p>Searches the full contents of all notes and files in your workspace folder.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
