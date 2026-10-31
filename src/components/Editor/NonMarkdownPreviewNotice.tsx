import React from 'react';
import { AlertTriangle, FileCode, Eye, Loader2 } from 'lucide-react';

interface NonMarkdownPreviewNoticeProps {
  fileName: string;
  extension?: string;
  onForceShow: () => void;
  isLoading?: boolean;
}

export const NonMarkdownPreviewNotice: React.FC<NonMarkdownPreviewNoticeProps> = ({
  fileName,
  extension,
  onForceShow,
  isLoading = false,
}) => {
  const displayExt = extension || fileName.split('.').pop() || 'unknown';

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f8f7f4] dark:bg-[#111215] text-[#191b1f] dark:text-[#eceef2] select-none transition-colors"
      role="region"
      aria-label="Non-Markdown preview warning"
    >
      <div className="max-w-md w-full bg-[#ffffff] dark:bg-[#17191e] border border-[#e5e3dc] dark:border-[#282b33] rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-5 transition-colors">
        {/* Warning Icon Badge */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 shadow-2xs">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1.5">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[#191b1f] dark:text-[#eceef2]">
            Non-Markdown Document
          </h2>
          <p className="text-xs text-[#59606d] dark:text-[#9ba2b0]">
            Automatic preview paused to preserve editor stability
          </p>
        </div>

        {/* File Metadata Card */}
        <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl bg-[#f8f7f4] dark:bg-[#111215] border border-[#e5e3dc] dark:border-[#282b33]">
          <FileCode className="w-4 h-4 text-[#59606d] dark:text-[#9ba2b0] shrink-0" aria-hidden="true" />
          <span className="font-mono text-xs font-medium truncate text-[#191b1f] dark:text-[#eceef2] max-w-[220px]" title={fileName}>
            {fileName}
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-[#e5e3dc]/60 dark:bg-[#282b33] text-[#59606d] dark:text-[#9ba2b0]">
            .{displayExt.toLowerCase()}
          </span>
        </div>

        {/* Explanatory Body Copy */}
        <p className="text-xs text-[#59606d] dark:text-[#9ba2b0] leading-relaxed text-balance">
          This file is not a Markdown document (.md or .markdown). Displaying raw source code, binary data, or unsupported formats in the WYSIWYG editor may cause visual artifacts or slow performance.
        </p>

        {/* Force Show Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onForceShow}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium rounded-lg bg-[#2d6a4f] hover:bg-[#24553f] active:bg-[#1f4735] dark:bg-[#52b788] dark:hover:bg-[#43a175] text-white dark:text-[#111215] shadow-xs transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title={`Force show ${fileName} in the editor`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Reading file...</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>Force Show Contents</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
