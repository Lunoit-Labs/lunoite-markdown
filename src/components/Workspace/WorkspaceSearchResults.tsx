import React, { useState } from 'react';
import { FileSearchResult, SearchMatch } from '../../types/search';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface WorkspaceSearchResultsProps {
  results: FileSearchResult[];
  onSelectMatch: (result: FileSearchResult, match: SearchMatch) => void;
}

export const WorkspaceSearchResults: React.FC<WorkspaceSearchResultsProps> = ({
  results,
  onSelectMatch,
}) => {
  // Track collapsed files
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const toggleCollapse = (fileId: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [fileId]: !prev[fileId],
    }));
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 py-1 select-none" role="region" aria-label="Search results">
      {results.map(result => {
        const isCollapsed = !!collapsedFiles[result.fileId];

        return (
          <div
            key={result.fileId}
            className="rounded border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] overflow-hidden"
          >
            {/* File Header */}
            <button
              type="button"
              onClick={() => toggleCollapse(result.fileId)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#f8f7f4]/70 dark:bg-[#111215]/60 hover:bg-[#2d6a4f]/5 dark:hover:bg-[#52b788]/5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
              aria-expanded={!isCollapsed}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-[#59606d] dark:text-[#9ba2b0] shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#59606d] dark:text-[#9ba2b0] shrink-0" />
                )}
                <FileText className="w-3.5 h-3.5 text-[#2d6a4f] dark:text-[#52b788] shrink-0" />
                <span className="text-xs font-medium text-[#191b1f] dark:text-[#eceef2] truncate" title={result.filePath}>
                  {result.fileName}
                </span>
                <span className="text-[10px] text-[#59606d] dark:text-[#9ba2b0] truncate hidden sm:inline" title={result.filePath}>
                  {result.filePath !== result.fileName ? `(${result.filePath})` : ''}
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#59606d] dark:text-[#9ba2b0] shrink-0">
                {result.matches.length}
              </span>
            </button>

            {/* Matches List */}
            {!isCollapsed && (
              <div className="divide-y divide-[#e5e3dc]/50 dark:divide-[#282b33]/50">
                {result.matches.map((match, idx) => (
                  <button
                    key={`${result.fileId}-${match.lineNumber}-${idx}`}
                    type="button"
                    onClick={() => onSelectMatch(result, { ...match, matchIndex: match.matchIndex ?? idx })}
                    className="w-full flex items-start gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[#2d6a4f]/10 dark:hover:bg-[#52b788]/15 transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788] group"
                    title={`Go to line ${match.lineNumber}`}
                  >
                    <span className="text-[11px] font-mono text-[#59606d] dark:text-[#9ba2b0] shrink-0 pt-0.5 min-w-[28px]">
                      L{match.lineNumber}
                    </span>
                    <span className="flex-1 font-mono text-[11px] text-[#191b1f] dark:text-[#eceef2] break-all line-clamp-2">
                      <HighlightedSnippet
                        text={match.lineContent}
                        startIndex={match.matchStartIndex}
                        endIndex={match.matchEndIndex}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface HighlightedSnippetProps {
  text: string;
  startIndex: number;
  endIndex: number;
}

const HighlightedSnippet: React.FC<HighlightedSnippetProps> = ({
  text,
  startIndex,
  endIndex,
}) => {
  if (startIndex < 0 || endIndex > text.length || startIndex >= endIndex) {
    return <span>{text}</span>;
  }

  const before = text.substring(0, startIndex);
  const match = text.substring(startIndex, endIndex);
  const after = text.substring(endIndex);

  return (
    <>
      <span>{before}</span>
      <mark className="bg-[#2d6a4f]/20 dark:bg-[#52b788]/30 text-[#2d6a4f] dark:text-[#52b788] font-semibold px-0.5 rounded">
        {match}
      </mark>
      <span>{after}</span>
    </>
  );
};
