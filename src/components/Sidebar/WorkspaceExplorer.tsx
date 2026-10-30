import React, { useState, useEffect, useCallback } from 'react';
import { FileTreeNode as TreeNodeType, WorkspaceState, OpenTab, isMarkdownFile, ensureMarkdownExtension } from '../../types/workspace';
import { SearchMatch } from '../../types/search';
import { FileTreeNode } from './FileTreeNode';
import { WorkspaceSearchResults } from '../Workspace/WorkspaceSearchResults';
import { useWorkspaceSearch } from '../../hooks/useWorkspaceSearch';
import {
  FolderOpen,
  FilePlus,
  FolderPlus,
  FolderMinus,
  RefreshCw,
  Search,
  X,
  FolderX,
  FolderTree,
  CaseSensitive,
  Filter,
} from 'lucide-react';

interface WorkspaceExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: WorkspaceState;
  activeFileId: string | null;
  onSelectFile: (node: TreeNodeType, targetMatch?: SearchMatch, query?: string) => void;
  onCreateFile: (parentHandle?: FileSystemDirectoryHandle, name?: string, parentNativePath?: string) => void;
  onCreateFolder: (parentHandle?: FileSystemDirectoryHandle, name?: string, parentNativePath?: string) => void;
  onDeleteNode: (parentHandle?: FileSystemDirectoryHandle, name?: string, node?: TreeNodeType) => void;
  onRenameNode: (
    parentHandle?: FileSystemDirectoryHandle,
    oldName?: string,
    newName?: string,
    kind?: 'file' | 'directory',
    node?: TreeNodeType
  ) => void;
  onRefresh: () => void | Promise<unknown>;
  onCloseWorkspace: () => void;
  readFile?: (fileHandle?: FileSystemFileHandle, nativePath?: string) => Promise<string>;
  openTabs?: OpenTab[];
  activeSidebarTab?: 'files' | 'search';
  onTabChange?: (tab: 'files' | 'search') => void;
}

export const WorkspaceExplorer: React.FC<WorkspaceExplorerProps> = ({
  isOpen,
  onClose,
  workspace,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteNode,
  onRenameNode,
  onRefresh,
  onCloseWorkspace,
  readFile,
  openTabs = [],
  activeSidebarTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<'files' | 'search'>('files');
  const activeTab = activeSidebarTab !== undefined ? activeSidebarTab : internalTab;

  const [isRefreshingWorkspace, setIsRefreshingWorkspace] = useState(false);
  const [refreshingFolderId, setRefreshingFolderId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshingWorkspace(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshingWorkspace(false), 450);
    }
  };

  const handleRefreshFolder = async (node: TreeNodeType) => {
    setRefreshingFolderId(node.id);
    handleExpandFolder(node.id);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshingFolderId(null), 450);
    }
  };

  const handleTabSwitch = (tab: 'files' | 'search') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Quick file filter (for files tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [hideNonMarkdown, setHideNonMarkdown] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('lunoite_hide_non_markdown');
      if (saved !== null) {
        return saved === 'true';
      }
      return true;
    } catch {
      return true;
    }
  });


  useEffect(() => {
    try {
      localStorage.setItem('lunoite_hide_non_markdown', String(hideNonMarkdown));
    } catch {
      // ignore
    }
  }, [hideNonMarkdown]);

  const workspaceStorageKey = workspace.name
    ? `lunoite_expanded_folders_${workspace.name}`
    : 'lunoite_expanded_folders_default';

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(workspaceStorageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed);
        }
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(workspaceStorageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setExpandedFolderIds(new Set<string>(parsed));
          return;
        }
      }
    } catch {
      // ignore
    }
    setExpandedFolderIds(new Set<string>());
  }, [workspaceStorageKey]);

  const handleToggleExpand = useCallback(
    (folderId: string) => {
      setExpandedFolderIds(prev => {
        const next = new Set(prev);
        if (next.has(folderId)) {
          next.delete(folderId);
        } else {
          next.add(folderId);
        }
        try {
          localStorage.setItem(workspaceStorageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [workspaceStorageKey]
  );

  const handleExpandFolder = useCallback(
    (folderId: string) => {
      setExpandedFolderIds(prev => {
        if (prev.has(folderId)) return prev;
        const next = new Set(prev);
        next.add(folderId);
        try {
          localStorage.setItem(workspaceStorageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [workspaceStorageKey]
  );

  const handleCollapseAllFolders = useCallback(() => {
    setExpandedFolderIds(new Set<string>());
    try {
      localStorage.setItem(workspaceStorageKey, JSON.stringify([]));
    } catch {
      // ignore
    }
  }, [workspaceStorageKey]);

  const handleSelectFileWithReveal = useCallback(
    (node: TreeNodeType, targetMatch?: SearchMatch, query?: string) => {
      if (node.path && node.path.includes('/')) {
        const parts = node.path.split('/');
        const ancestors: string[] = [];
        let current = '';
        for (let i = 0; i < parts.length - 1; i++) {
          current = current ? `${current}/${parts[i]}` : parts[i];
          ancestors.push(current);
        }
        if (ancestors.length > 0) {
          setExpandedFolderIds(prev => {
            let changed = false;
            const next = new Set(prev);
            for (const a of ancestors) {
              if (!next.has(a)) {
                next.add(a);
                changed = true;
              }
            }
            if (changed) {
              try {
                localStorage.setItem(workspaceStorageKey, JSON.stringify(Array.from(next)));
              } catch {
                // ignore
              }
              return next;
            }
            return prev;
          });
        }
      }
      onSelectFile(node, targetMatch, query);
    },
    [onSelectFile, workspaceStorageKey]
  );

  const [isNewFilePromptOpen, setIsNewFilePromptOpen] = useState(false);
  const [isNewFolderPromptOpen, setIsNewFolderPromptOpen] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  const [targetDirHandle, setTargetDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [targetDirNativePath, setTargetDirNativePath] = useState<string | null>(null);

  // Full-text workspace search hook
  const {
    query: textQuery,
    setQuery: setTextQuery,
    matchCase,
    setMatchCase,
    isSearching: isTextSearching,
    results: textResults,
    totalMatches,
    totalFiles,
    clearSearch: clearTextSearch,
  } = useWorkspaceSearch({
    tree: workspace.tree,
    readFile: readFile || (async (h?: FileSystemFileHandle) => (h ? (await h.getFile()).text() : '')),
    openTabs,
  });

  if (!isOpen || (!workspace.rootHandle && !workspace.nativePath)) return null;

  const handleOpenNewFilePrompt = (dirHandle?: FileSystemDirectoryHandle, dirNativePath?: string) => {
    setTargetDirHandle(dirHandle || workspace.rootHandle || null);
    setTargetDirNativePath(dirNativePath || workspace.nativePath || null);
    setNewEntryName('');
    setIsNewFilePromptOpen(true);
  };

  const handleOpenNewFolderPrompt = (dirHandle?: FileSystemDirectoryHandle, dirNativePath?: string) => {
    setTargetDirHandle(dirHandle || workspace.rootHandle || null);
    setTargetDirNativePath(dirNativePath || workspace.nativePath || null);
    setNewEntryName('');
    setIsNewFolderPromptOpen(true);
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((targetDirHandle || targetDirNativePath) && newEntryName.trim()) {
      const cleanName = ensureMarkdownExtension(newEntryName.trim());
      onCreateFile(targetDirHandle as FileSystemDirectoryHandle, cleanName, targetDirNativePath || undefined);
      setIsNewFilePromptOpen(false);
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((targetDirHandle || targetDirNativePath) && newEntryName.trim()) {
      onCreateFolder(targetDirHandle as FileSystemDirectoryHandle, newEntryName.trim(), targetDirNativePath || undefined);
      setIsNewFolderPromptOpen(false);
    }
  };

  // Filter tree recursively for files tab
  const filterNodes = (
    nodes: TreeNodeType[],
    query: string,
    hideNonMd: boolean
  ): TreeNodeType[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed && !hideNonMd) return nodes;

    return nodes.reduce<TreeNodeType[]>((acc, node) => {
      if (node.kind === 'directory') {
        const matchesDirName = trimmed ? node.name.toLowerCase().includes(trimmed) : false;
        const childQuery = matchesDirName ? '' : query;
        const filteredChildren = filterNodes(node.children || [], childQuery, hideNonMd);

        if (filteredChildren.length > 0 || (matchesDirName && !hideNonMd)) {
          acc.push({ ...node, children: filteredChildren });
        }
      } else {
        if (hideNonMd && !isMarkdownFile(node)) {
          return acc;
        }
        if (!trimmed || node.name.toLowerCase().includes(trimmed)) {
          acc.push(node);
        }
      }
      return acc;
    }, []);
  };

  const displayedTree = filterNodes(workspace.tree, searchQuery, hideNonMarkdown);


  return (
    <aside
      className="w-64 sm:w-72 border-r border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] flex flex-col shrink-0 text-[#191b1f] dark:text-[#eceef2] select-none transition-colors duration-200"
      aria-label="Workspace Explorer"
    >
      {/* Workspace Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#e5e3dc] dark:border-[#282b33]">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="w-4 h-4 text-[#2d6a4f] dark:text-[#52b788] shrink-0" aria-hidden="true" />
          <h2 className="font-semibold text-xs truncate" title={workspace.name}>
            {workspace.name}
          </h2>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleOpenNewFilePrompt()}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="New Markdown file at root"
            aria-label="New file"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewFolderPrompt()}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="New folder at root"
            aria-label="New folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAllFolders}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="Collapse all folders"
            aria-label="Collapse all folders"
          >
            <FolderMinus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="Refresh workspace folder (Ctrl+Shift+R)"
            aria-label="Refresh workspace folder"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingWorkspace ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onCloseWorkspace}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:text-red-600 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            title="Close workspace folder"
            aria-label="Close workspace"
          >
            <FolderX className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#59606d] dark:text-[#9ba2b0] hover:bg-black/5 dark:hover:bg-white/5 sm:hidden focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            aria-label="Close explorer panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs: Files vs Search */}
      <div className="flex border-b border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4]/60 dark:bg-[#111215]/50 px-2 pt-1 gap-1" role="tablist">
        <button
          type="button"
          onClick={() => handleTabSwitch('files')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'files'
              ? 'border-[#2d6a4f] text-[#2d6a4f] dark:border-[#52b788] dark:text-[#52b788]'
              : 'border-transparent text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]'
          } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
          aria-selected={activeTab === 'files'}
          role="tab"
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-[#2d6a4f] text-[#2d6a4f] dark:border-[#52b788] dark:text-[#52b788]'
              : 'border-transparent text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]'
          } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
          aria-selected={activeTab === 'search'}
          role="tab"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          {totalMatches > 0 && (
            <span className="text-[10px] font-mono px-1 rounded-full bg-[#2d6a4f]/15 dark:bg-[#52b788]/20 text-[#2d6a4f] dark:text-[#52b788]">
              {totalMatches}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'files' ? (
        <>
          {/* Instant File Name Filter & Type Toggle */}
          <div className="p-2 border-b border-[#e5e3dc] dark:border-[#282b33] flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#59606d] dark:text-[#9ba2b0] pointer-events-none" />
              <input
                type="text"
                placeholder="Filter files by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1 text-xs rounded border border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]"
                  title="Clear filter"
                  aria-label="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setHideNonMarkdown(prev => !prev)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors shrink-0 flex items-center gap-1 ${
                hideNonMarkdown
                  ? 'border-[#2d6a4f] text-[#2d6a4f] bg-[#2d6a4f]/10 dark:border-[#52b788] dark:text-[#52b788] dark:bg-[#52b788]/20 font-semibold shadow-xs'
                  : 'border-[#e5e3dc] dark:border-[#282b33] text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] bg-[#ffffff] dark:bg-[#17191e]'
              } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
              title={
                hideNonMarkdown
                  ? 'Hiding non-.md files (click to show all files)'
                  : 'Showing all files (click to hide non-.md files)'
              }
              aria-label="Toggle hide non-markdown files"
              aria-pressed={hideNonMarkdown}
            >
              <Filter className="w-3 h-3" />
              <span>.md</span>
            </button>
          </div>


          {/* New File Inline Form */}
          {isNewFilePromptOpen && (
            <form onSubmit={handleCreateFileSubmit} className="p-2 bg-[#f8f7f4] dark:bg-[#111215] border-b border-[#e5e3dc] dark:border-[#282b33]">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-medium text-[#59606d] dark:text-[#9ba2b0] truncate">
                  New File in {targetDirHandle?.name || (targetDirNativePath ? targetDirNativePath.split(/[\\/]/).pop() : workspace.name) || 'workspace'}:
                </label>
                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#59606d] dark:text-[#9ba2b0]">
                  .md default
                </span>
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="Note title (e.g. Journal)"
                  value={newEntryName}
                  onChange={e => setNewEntryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setIsNewFilePromptOpen(false);
                  }}
                  className="flex-1 px-2 py-1 text-xs rounded border border-[#2d6a4f] dark:border-[#52b788] bg-transparent text-[#191b1f] dark:text-[#eceef2] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-1 text-xs font-medium rounded bg-[#2d6a4f] text-white dark:bg-[#52b788] dark:text-[#111215] focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewFilePromptOpen(false)}
                  className="px-1.5 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#59606d] dark:text-[#9ba2b0]"
                  aria-label="Cancel new file"
                >
                  ✕
                </button>
              </div>
            </form>
          )}

          {/* New Folder Inline Form */}
          {isNewFolderPromptOpen && (
            <form onSubmit={handleCreateFolderSubmit} className="p-2 bg-[#f8f7f4] dark:bg-[#111215] border-b border-[#e5e3dc] dark:border-[#282b33]">
              <label className="block text-[10px] font-medium text-[#59606d] dark:text-[#9ba2b0] mb-1">
                New Folder in {targetDirHandle?.name || (targetDirNativePath ? targetDirNativePath.split(/[\\/]/).pop() : workspace.name) || 'workspace'}:
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="documentation"
                  value={newEntryName}
                  onChange={e => setNewEntryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setIsNewFolderPromptOpen(false);
                  }}
                  className="flex-1 px-2 py-1 text-xs rounded border border-[#2d6a4f] dark:border-[#52b788] bg-transparent text-[#191b1f] dark:text-[#eceef2] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-1 text-xs font-medium rounded bg-[#2d6a4f] text-white dark:bg-[#52b788] dark:text-[#111215] focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewFolderPromptOpen(false)}
                  className="px-1.5 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#59606d] dark:text-[#9ba2b0]"
                  aria-label="Cancel new folder"
                >
                  ✕
                </button>
              </div>
            </form>
          )}

          {/* File Tree List */}
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5" role="tree">
            {displayedTree.length > 0 ? (
              displayedTree.map(node => (
                <FileTreeNode
                  key={node.id}
                  node={node}
                  activeFileId={activeFileId}
                  expandedFolderIds={expandedFolderIds}
                  onToggleExpand={handleToggleExpand}
                  onExpandFolder={handleExpandFolder}
                  isSearching={Boolean(searchQuery.trim())}
                  onSelectFile={handleSelectFileWithReveal}
                  onCreateFileInDir={(dirHandle, dirNativePath) => handleOpenNewFilePrompt(dirHandle, dirNativePath)}
                  onCreateFolderInDir={(dirHandle, dirNativePath) => handleOpenNewFolderPrompt(dirHandle, dirNativePath)}
                  onDeleteNode={onDeleteNode}
                  onRenameNode={onRenameNode}
                  onRefreshFolder={handleRefreshFolder}
                  refreshingFolderId={refreshingFolderId}
                />
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] px-3 space-y-1.5">
                <p>
                  {searchQuery
                    ? 'No matching files found'
                    : hideNonMarkdown
                      ? 'No Markdown (.md) files found'
                      : 'Workspace folder is empty'}
                </p>
                {hideNonMarkdown && !searchQuery && (
                  <button
                    type="button"
                    onClick={() => setHideNonMarkdown(false)}
                    className="text-[11px] text-[#2d6a4f] dark:text-[#52b788] underline hover:opacity-80 transition-opacity"
                  >
                    Show all workspace files
                  </button>
                )}
              </div>
            )}

          </div>
        </>
      ) : (
        /* Workspace Text Search Panel */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-2 border-b border-[#e5e3dc] dark:border-[#282b33] space-y-1.5 bg-[#f8f7f4]/40 dark:bg-[#111215]/30">
            <div className="relative flex items-center gap-1">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#59606d] dark:text-[#9ba2b0] pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search text in workspace..."
                value={textQuery}
                onChange={e => setTextQuery(e.target.value)}
                className="flex-1 pl-7 pr-6 py-1 text-xs rounded border border-[#e5e3dc] dark:border-[#282b33] bg-[#ffffff] dark:bg-[#17191e] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
              />
              {textQuery && (
                <button
                  type="button"
                  onClick={clearTextSearch}
                  className="absolute right-9 top-1/2 -translate-y-1/2 p-0.5 text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2]"
                  title="Clear text query"
                  aria-label="Clear query"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setMatchCase(prev => !prev)}
                className={`p-1 rounded border text-[11px] font-mono transition-colors ${
                  matchCase
                    ? 'border-[#2d6a4f] text-[#2d6a4f] bg-[#2d6a4f]/10 dark:border-[#52b788] dark:text-[#52b788] dark:bg-[#52b788]/20 font-bold'
                    : 'border-[#e5e3dc] dark:border-[#282b33] text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] bg-[#ffffff] dark:bg-[#17191e]'
                } focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]`}
                title="Match Case"
                aria-label="Toggle match case"
                aria-pressed={matchCase}
              >
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[10px] text-[#59606d] dark:text-[#9ba2b0] px-1 truncate">
              {isTextSearching ? (
                'Searching workspace...'
              ) : textQuery.trim() ? (
                totalMatches > 0 ? (
                  `${totalMatches} match${totalMatches === 1 ? '' : 'es'} in ${totalFiles} file${totalFiles === 1 ? '' : 's'}`
                ) : (
                  'No matches found'
                )
              ) : (
                'Type words to search whole workspace'
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {textQuery.trim() && textResults.length > 0 ? (
              <WorkspaceSearchResults
                results={textResults}
                onSelectMatch={(result, match) => handleSelectFileWithReveal(result.node, match, textQuery)}
              />
            ) : textQuery.trim() && !isTextSearching ? (
              <div className="py-8 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] px-3 space-y-1">
                <p className="font-medium text-[#191b1f] dark:text-[#eceef2]">No results found</p>
                <p>Try searching for different keywords or checking case sensitivity.</p>
              </div>
            ) : !textQuery.trim() ? (
              <div className="py-8 text-center text-xs text-[#59606d] dark:text-[#9ba2b0] px-3 space-y-1">
                <p className="font-medium text-[#191b1f] dark:text-[#eceef2]">Workspace Search</p>
                <p>Find text, links, or code across all files in your folder.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </aside>
  );
};
