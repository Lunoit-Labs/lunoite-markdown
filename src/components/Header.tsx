import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  FolderPlus,
  Save,
  Download,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  BookOpen,
  Keyboard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Sidebar,
  FilePlus,
  Search,
  ChevronDown,
} from 'lucide-react';
import { SaveStatus } from '../types/editor';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
  workspaceName?: string;
  fileName: string;
  onRename: (newName: string) => void;
  saveStatus: SaveStatus;
  onOpenFile?: () => void;
  onOpenWorkspace: () => void;
  onCreateNewWorkspace?: () => void;
  onOpenRecentWorkspaces?: () => void;
  onNewFile: () => void;
  onSaveFile: () => void;
  onExportFile: () => void;
  onOpenSearch?: () => void;
  isExplorerOpen: boolean;
  onToggleExplorer: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  isShelfOpen: boolean;
  onToggleShelf: () => void;
  onOpenShortcuts: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  hasFileHandle: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  workspaceName,
  fileName,
  onRename,
  saveStatus,
  onOpenFile,
  onOpenWorkspace,
  onCreateNewWorkspace,
  onOpenRecentWorkspaces,
  onNewFile,
  onSaveFile,
  onExportFile,
  onOpenSearch,
  isExplorerOpen,
  onToggleExplorer,
  isZenMode,
  onToggleZenMode,
  isShelfOpen,
  onToggleShelf,
  onOpenShortcuts,
  theme,
  onToggleTheme,
  hasFileHandle,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(fileName);
  const isSubmittingNameRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(fileName);
  }, [fileName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      const dotIndex = tempName.lastIndexOf('.');
      if (dotIndex > 0) {
        nameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        nameInputRef.current.select();
      }
    }
  }, [isEditingName]);

  const handleNameSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmittingNameRef.current) return;
    isSubmittingNameRef.current = true;

    const trimmed = tempName.trim();
    if (trimmed) {
      const sanitized = trimmed.endsWith('.md')
        ? trimmed
        : `${trimmed}.md`;
      if (sanitized !== fileName) {
        onRename(sanitized);
      }
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      isSubmittingNameRef.current = true;
      setTempName(fileName);
      setIsEditingName(false);
    } else if (e.key === 'Enter') {
      e.stopPropagation();
      handleNameSubmit(e);
    }
  };

  const renderStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium"
            title={hasFileHandle ? 'Synchronized directly with local file on disk' : 'Saved in local storage'}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden sm:inline">{hasFileHandle ? 'Synced to disk' : 'Saved'}</span>
          </span>
        );
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-[11px] text-[#59606d] dark:text-[#9ba2b0] font-medium">
            <Clock className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Saving to disk...</span>
          </span>
        );
      case 'unsaved':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium"
            title="Press Ctrl+S to save changes"
          >
            <AlertCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Unsaved changes</span>
          </span>
        );
      case 'local_only':
        return (
          <span
            className="flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 font-medium"
            title="Working from browser storage"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">Draft</span>
          </span>
        );
    }
  };

  return (
    <header
      className={`border-b border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] px-3 sm:px-4 py-2 transition-opacity duration-200 h-12 ${
        isZenMode ? 'opacity-0 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
      } flex items-center justify-between text-[#191b1f] dark:text-[#eceef2] select-none`}
    >
      {/* Brand, Workspace, and Document Name */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleExplorer}
          className={`p-1.5 rounded transition-colors ${
            isExplorerOpen
              ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
              : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
          } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
          title="Toggle Workspace File Explorer (Alt+E)"
          aria-label="Toggle File Explorer"
        >
          <Sidebar className="w-4 h-4" />
        </button>

        <span
          className="font-serif italic font-semibold text-base sm:text-lg tracking-tight text-[#2d6a4f] dark:text-[#52b788] select-none"
          title="lunoite: distraction-free markdown"
        >
          lunoite
        </span>

        {workspaceName ? (
          <>
            <span className="text-[#e5e3dc] dark:text-[#282b33] hidden sm:inline">/</span>
            {onOpenRecentWorkspaces ? (
              <button
                type="button"
                onClick={onOpenRecentWorkspaces}
                className="flex items-center gap-1 text-xs text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[90px] sm:max-w-[150px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
                title="Switch or manage workspaces"
                aria-label="Switch or manage workspaces"
              >
                <span className="truncate">{workspaceName}</span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
              </button>
            ) : (
              <span className="text-xs text-[#59606d] dark:text-[#9ba2b0] truncate max-w-[90px] sm:max-w-[140px] font-medium">
                {workspaceName}
              </span>
            )}
          </>
        ) : (
          onOpenRecentWorkspaces && (
            <>
              <span className="text-[#e5e3dc] dark:text-[#282b33] hidden sm:inline">/</span>
              <button
                type="button"
                onClick={onOpenRecentWorkspaces}
                className="hidden sm:flex items-center gap-1 text-xs text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 px-1.5 py-0.5 rounded font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
                title="Switch or manage workspaces"
                aria-label="Switch or manage workspaces"
              >
                <span>Workspaces</span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
              </button>
            </>
          )
        )}

        {fileName !== 'No file open' && (
          <>
            <span className="text-[#e5e3dc] dark:text-[#282b33] hidden sm:inline">/</span>

            {/* Editable File Name */}
            {isEditingName ? (
              <form onSubmit={handleNameSubmit} className="flex items-center">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onBlur={() => handleNameSubmit()}
                  onKeyDown={handleNameKeyDown}
                  className="px-2 py-0.5 text-xs font-mono rounded border border-[#2d6a4f] dark:border-[#52b788] bg-transparent text-[#191b1f] dark:text-[#eceef2] focus:outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  isSubmittingNameRef.current = false;
                  setTempName(fileName);
                  setIsEditingName(true);
                }}
                className="text-xs font-mono font-medium truncate max-w-[90px] sm:max-w-[180px] md:max-w-[240px] hover:underline text-left text-[#191b1f] dark:text-[#eceef2]"
                title="Click to rename file"
              >
                {fileName}
              </button>
            )}

            {/* Save Status */}
            <div className="ml-1 sm:ml-2">{renderStatusBadge()}</div>
          </>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Workspace & File Actions */}
        {onOpenFile && (
          <button
            type="button"
            onClick={onOpenFile}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-[#e5e3dc] dark:border-[#282b33] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="Open Markdown File (Ctrl+O)"
            aria-label="Open Markdown File"
          >
            <FileText className="w-3.5 h-3.5 text-[#2d6a4f] dark:text-[#52b788]" />
            <span className="hidden md:inline">Open File</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenWorkspace}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-[#e5e3dc] dark:border-[#282b33] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          title="Open Workspace Folder (Ctrl+Alt+O)"
          aria-label="Open Workspace Folder"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#2d6a4f] dark:text-[#52b788]" />
          <span className="hidden md:inline">Open Folder</span>
        </button>

        {onCreateNewWorkspace && (
          <button
            type="button"
            onClick={onCreateNewWorkspace}
            className="hidden sm:inline-flex p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="Create New Workspace"
            aria-label="New Workspace"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onNewFile}
          className="p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          title="New Markdown Document"
          aria-label="New Document"
        >
          <FilePlus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSaveFile}
          className="flex items-center gap-1 px-2 py-1 sm:px-2.5 text-xs font-medium rounded bg-[#2d6a4f] hover:bg-[#24553f] dark:bg-[#52b788] dark:hover:bg-[#429d73] text-white dark:text-[#111215] transition-colors focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          title="Save file directly to disk (Ctrl+S)"
          aria-label="Save file"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Save</span>
        </button>

        <button
          type="button"
          onClick={onExportFile}
          className="hidden sm:inline-flex p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          title="Export Markdown (.md)"
          aria-label="Export Markdown file"
        >
          <Download className="w-4 h-4" />
        </button>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="Search workspace text (Ctrl+Shift+F)"
            aria-label="Search workspace text"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        <div className="w-[1px] h-4 bg-[#e5e3dc] dark:bg-[#282b33] mx-1 hidden sm:block" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleZenMode}
          className={`hidden sm:inline-flex p-1.5 rounded transition-colors ${
            isZenMode
              ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
              : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
          } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
          title={isZenMode ? 'Exit Zen Mode (Alt+Z)' : 'Enter Zen Focus Mode (Alt+Z)'}
          aria-label="Toggle Zen mode"
        >
          {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleShelf}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
            isShelfOpen
              ? 'bg-[#2d6a4f]/15 text-[#2d6a4f] dark:bg-[#52b788]/20 dark:text-[#52b788]'
              : 'text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5'
          } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
          title="Toggle Reference Shelf (Alt+S)"
          aria-label="Toggle Reference Shelf"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Shelf</span>
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          className="hidden md:inline-flex p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          title="Keyboard shortcuts & guide"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-1.5 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
          title={theme === 'dark' ? 'Switch to daylight paper' : 'Switch to obsidian night'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
