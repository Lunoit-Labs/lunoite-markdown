import React from 'react';
import { DocumentStats } from '../types/editor';
import { HardDrive, Globe } from 'lucide-react';

interface StatusBarProps {
  stats: DocumentStats;
  fileName: string;
  filePath?: string;
  workspaceName?: string;
  hasFileHandle: boolean;
  isZenMode: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  fileName,
  filePath,
  workspaceName,
  hasFileHandle,
  isZenMode,
}) => {
  if (isZenMode) return null;

  const displayPath = filePath || fileName;

  return (
    <footer
      className="h-7 border-t border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] px-3 sm:px-4 flex items-center justify-between text-[11px] text-[#59606d] dark:text-[#9ba2b0] select-none transition-colors"
      role="contentinfo"
      aria-label="Document status bar"
    >
      {/* Document Metrics */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span>
          <strong className="font-medium text-[#191b1f] dark:text-[#eceef2]">{stats.words}</strong> words
        </span>
        <span className="text-[#e5e3dc] dark:text-[#282b33]" aria-hidden="true">•</span>
        <span>
          <strong className="font-medium text-[#191b1f] dark:text-[#eceef2]">{stats.characters}</strong> chars
        </span>
        <span className="text-[#e5e3dc] dark:text-[#282b33] hidden sm:inline" aria-hidden="true">•</span>
        <span className="hidden sm:inline">
          <strong className="font-medium text-[#191b1f] dark:text-[#eceef2]">{stats.lines}</strong> lines
        </span>
        <span className="text-[#e5e3dc] dark:text-[#282b33]" aria-hidden="true">•</span>
        <span>
          {stats.readingTimeMinutes} min read
        </span>
      </div>

      {/* Workspace & Disk Sync Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {hasFileHandle ? (
            <span
              className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
              title={`Directly synchronized to disk: ${workspaceName ? `${workspaceName}/` : ''}${displayPath}`}
            >
              <HardDrive className="w-3 h-3" />
              <span className="hidden md:inline font-mono text-[10px]">
                {workspaceName ? `${workspaceName}/` : ''}{displayPath}
              </span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-[#59606d] dark:text-[#9ba2b0]"
              title="Working from temporary storage. Open a folder to auto-sync directly to your local drive."
            >
              <Globe className="w-3 h-3" />
              <span className="hidden md:inline font-mono text-[10px]">Browser draft</span>
            </span>
          )}
        </div>

        <span className="text-[#e5e3dc] dark:text-[#282b33] hidden lg:inline" aria-hidden="true">|</span>

        <span className="hidden lg:inline text-[10px]">
          Press <kbd className="px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 font-mono">Ctrl+S</kbd> to save
        </span>
      </div>
    </footer>
  );
};
