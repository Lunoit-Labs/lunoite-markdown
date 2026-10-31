import React, { useState, useEffect, useRef } from 'react';
import { RecentWorkspace } from '../../types/workspace';
import { formatRelativeTime } from '../../lib/formatDate';
import { ConfirmModal } from '../ConfirmModal';
import {
  FolderOpen,
  FolderPlus,
  Clock,
  Search,
  X,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface RecentWorkspacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentWorkspaces: RecentWorkspace[];
  activeWorkspaceName?: string;
  onSelectRecent: (recent: RecentWorkspace) => void;
  onRemoveRecent: (id: string) => void;
  onClearAllRecent: () => void;
  onOpenOtherWorkspace: () => void;
  onCreateNewWorkspace: () => void;
}

export const RecentWorkspacesModal: React.FC<RecentWorkspacesModalProps> = ({
  isOpen,
  onClose,
  recentWorkspaces,
  activeWorkspaceName,
  onSelectRecent,
  onRemoveRecent,
  onClearAllRecent,
  onOpenOtherWorkspace,
  onCreateNewWorkspace,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilterQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredWorkspaces = recentWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(filterQuery.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-workspaces-title"
    >
      <div className="bg-[#ffffff] dark:bg-[#17191e] border border-[#e5e3dc] dark:border-[#282b33] rounded-xl max-w-lg w-full flex flex-col max-h-[85vh] shadow-xl text-[#191b1f] dark:text-[#eceef2] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e5e3dc] dark:border-[#282b33] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2d6a4f]/10 dark:bg-[#52b788]/15 text-[#2d6a4f] dark:text-[#52b788]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="recent-workspaces-title" className="font-serif text-lg font-semibold tracking-tight">
                Workspace History
              </h2>
              <p className="text-xs text-[#59606d] dark:text-[#9ba2b0]">
                Quickly reopen previous folders or switch workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter input */}
        <div className="p-3 border-b border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#59606d] dark:text-[#9ba2b0] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search recent workspaces..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] text-[#191b1f] dark:text-[#eceef2] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
            />
          </div>
        </div>

        {/* List of recent workspaces */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-[#e5e3dc]/50 dark:divide-[#282b33]/50">
          {filteredWorkspaces.length > 0 ? (
            filteredWorkspaces.map(ws => {
              const isActive = ws.name === activeWorkspaceName;
              return (
                <div
                  key={ws.id}
                  onClick={() => {
                    onSelectRecent(ws);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#2d6a4f]/10 dark:bg-[#52b788]/15 border border-[#2d6a4f]/20 dark:border-[#52b788]/20'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRecent(ws);
                      onClose();
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs truncate text-[#191b1f] dark:text-[#eceef2]">
                          {ws.name}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#2d6a4f]/15 dark:bg-[#52b788]/20 text-[#2d6a4f] dark:text-[#52b788]">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#59606d] dark:text-[#9ba2b0]">
                        Opened {formatRelativeTime(ws.lastOpened)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onRemoveRecent(ws.id)}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-500/10 transition-opacity text-[#59606d] dark:text-[#9ba2b0] focus:opacity-100 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
                      title="Remove from history"
                      aria-label={`Remove ${ws.name} from history`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] space-y-1">
              <p className="font-medium text-sm text-[#191b1f] dark:text-[#eceef2]">
                {filterQuery ? 'No matching workspaces found' : 'No workspace history'}
              </p>
              <p>
                {filterQuery
                  ? 'Try searching with another name.'
                  : 'Open a local folder or create a new workspace to see it listed here.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] flex flex-wrap items-center justify-between gap-2 rounded-b-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOtherWorkspace();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e5e3dc] dark:border-[#282b33] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#2d6a4f] dark:text-[#52b788]" />
              <span>Open Other Folder...</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateNewWorkspace();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2d6a4f] hover:bg-[#24553f] dark:bg-[#52b788] dark:hover:bg-[#429d73] text-white dark:text-[#111215] shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Workspace...</span>
            </button>
          </div>

          {recentWorkspaces.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="text-xs text-[#59606d] dark:text-[#9ba2b0] hover:text-red-600 hover:underline px-2 py-1"
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Clear Workspace History?"
        message="Are you sure you want to clear your recent workspaces history? Your actual files and folders on disk will not be affected."
        confirmLabel="Clear History"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          setIsClearAllConfirmOpen(false);
          onClearAllRecent();
        }}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />
    </div>
  );
};
