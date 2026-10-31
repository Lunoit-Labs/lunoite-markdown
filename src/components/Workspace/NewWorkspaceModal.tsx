import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, Folder, X, AlertCircle, Loader2 } from 'lucide-react';
import { isTauri, pickNativeDirectory } from '../../lib/tauri';
import { ensureMarkdownExtension } from '../../types/workspace';

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkspace: (
    name: string,
    parentPathOrHandle?: string | FileSystemDirectoryHandle | null,
    initialNoteTitle?: string,
    initialNoteContent?: string
  ) => Promise<boolean>;
  currentWorkspaceNativePath?: string;
}

export const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreateWorkspace,
  currentWorkspaceNativePath,
}) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [selectedParentHandle, setSelectedParentHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [createStarterNote, setCreateStarterNote] = useState(true);
  const [starterNoteName, setStarterNoteName] = useState('Welcome.md');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setWorkspaceName('');
      setCreateStarterNote(true);
      setStarterNoteName('Welcome.md');
      setErrorMessage(null);
      setIsSubmitting(false);

      // Pre-fill local parent path from storage or current workspace parent
      let initialParent = '';
      try {
        const saved = localStorage.getItem('lunoite_default_workspace_parent');
        if (saved) initialParent = saved;
      } catch {
        // ignore
      }

      if (!initialParent && currentWorkspaceNativePath) {
        const lastSlash = Math.max(
          currentWorkspaceNativePath.lastIndexOf('/'),
          currentWorkspaceNativePath.lastIndexOf('\\')
        );
        if (lastSlash > 0) {
          initialParent = currentWorkspaceNativePath.substring(0, lastSlash);
        }
      }

      setLocalPath(initialParent);
      setSelectedParentHandle(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, currentWorkspaceNativePath]);

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

  const handleChooseLocation = async () => {
    if (isTauri()) {
      const chosen = await pickNativeDirectory();
      if (chosen) {
        setLocalPath(chosen);
        try {
          localStorage.setItem('lunoite_default_workspace_parent', chosen);
        } catch {
          // ignore
        }
        if (errorMessage) setErrorMessage(null);
      }
    } else if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        if (handle) {
          setSelectedParentHandle(handle);
          setLocalPath(handle.name);
          if (errorMessage) setErrorMessage(null);
        }
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to pick directory:', err);
        }
      }
    }
  };

  const getResolvedPathPreview = () => {
    if (!localPath) return null;
    const trimmed = workspaceName.trim() || 'workspace-name';
    const separator = localPath.includes('/') ? '/' : '\\';
    const cleanParent = localPath.endsWith('/') || localPath.endsWith('\\')
      ? localPath.slice(0, -1)
      : localPath;
    return `${cleanParent}${separator}${trimmed}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a workspace name.');
      return;
    }

    let parentToUse: string | FileSystemDirectoryHandle | null =
      isTauri() ? localPath : selectedParentHandle;

    // If no parent path is chosen yet, open picker first
    if (!parentToUse) {
      if (isTauri()) {
        const chosen = await pickNativeDirectory();
        if (!chosen) {
          return;
        }
        setLocalPath(chosen);
        try {
          localStorage.setItem('lunoite_default_workspace_parent', chosen);
        } catch {
          // ignore
        }
        parentToUse = chosen;
      } else if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
          if (!handle) return;
          setSelectedParentHandle(handle);
          setLocalPath(handle.name);
          parentToUse = handle;
        } catch (err: unknown) {
          if ((err as Error).name === 'AbortError') return;
          setErrorMessage('Please choose a parent folder.');
          return;
        }
      } else {
        setErrorMessage('Directory Picker API is not supported in this browser.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const noteTitle = createStarterNote ? ensureMarkdownExtension(starterNoteName) : '';
      const starterContent = createStarterNote
        ? `# ${trimmed}\n\nWelcome to your new Markdown workspace. All notes and edits sync directly to your local drive.\n`
        : undefined;

      const success = await onCreateWorkspace(trimmed, parentToUse, noteTitle, starterContent);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Could not create workspace. Please check folder permissions.');
      }
    } catch (err) {
      console.error('Failed to create new workspace:', err);
      setErrorMessage('Could not create workspace. Please check folder permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
      onClick={e => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-workspace-title"
    >
      <div className="bg-[#ffffff] dark:bg-[#17191e] border border-[#e5e3dc] dark:border-[#282b33] rounded-xl max-w-lg w-full shadow-xl text-[#191b1f] dark:text-[#eceef2] overflow-hidden transition-colors">
        {/* Header - flush at top of modal */}
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4 border-b border-[#e5e3dc] dark:border-[#282b33]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#2d6a4f]/10 dark:bg-[#52b788]/15 text-[#2d6a4f] dark:text-[#52b788] shrink-0 mt-0.5">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="new-workspace-title" className="font-serif text-lg font-semibold tracking-tight leading-snug">
                Create a New Workspace
              </h2>
              <p className="text-xs text-[#59606d] dark:text-[#9ba2b0] mt-0.5">
                Set up a new folder on your computer for your notes and documents.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#59606d] dark:text-[#9ba2b0] hover:text-[#191b1f] dark:hover:text-[#eceef2] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 transition-colors shrink-0 -mr-1 -mt-1 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 pt-4 space-y-4">
          {/* Workspace Name */}
          <div>
            <label
              htmlFor="workspace-name-input"
              className="block text-xs font-medium text-[#191b1f] dark:text-[#eceef2] mb-1.5"
            >
              Name
            </label>
            <input
              id="workspace-name-input"
              ref={inputRef}
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g. Research Notes, Journal, Project Vault"
              value={workspaceName}
              onChange={e => {
                setWorkspaceName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] text-[#191b1f] dark:text-[#eceef2] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
            />
          </div>

          {/* Local Path Input with Choose/Browse button (GitHub Desktop pattern) */}
          <div>
            <label
              htmlFor="workspace-local-path"
              className="block text-xs font-medium text-[#191b1f] dark:text-[#eceef2] mb-1.5"
            >
              Local path
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="workspace-local-path"
                type="text"
                readOnly={!isTauri()}
                value={localPath}
                onChange={e => {
                  setLocalPath(e.target.value);
                  if (isTauri()) {
                    try {
                      localStorage.setItem('lunoite_default_workspace_parent', e.target.value);
                    } catch {
                      // ignore
                    }
                  }
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                placeholder={isTauri() ? 'C:\\Users\\... or click Choose' : 'Select a parent folder...'}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] text-[#191b1f] dark:text-[#eceef2] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleChooseLocation}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[#e5e3dc] dark:border-[#282b33] hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
                title="Choose parent folder"
              >
                <Folder className="w-3.5 h-3.5 text-[#59606d] dark:text-[#9ba2b0]" />
                <span>Choose...</span>
              </button>
            </div>

            {/* Resolved Path Preview - expanded without truncation */}
            <div className="mt-2 text-xs text-[#59606d] dark:text-[#9ba2b0] leading-relaxed break-all">
              {localPath ? (
                <span>
                  Will be created at:{' '}
                  <span className="font-mono text-xs font-medium text-[#191b1f] dark:text-[#eceef2] select-all">
                    {getResolvedPathPreview()}
                  </span>
                </span>
              ) : (
                <span>Choose a parent directory where the new workspace folder will be created.</span>
              )}
            </div>
          </div>

          {/* Starter Welcome Note */}
          <div className="space-y-2 pt-1 border-t border-[#e5e3dc]/60 dark:border-[#282b33]/60">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#191b1f] dark:text-[#eceef2] pt-1">
              <input
                type="checkbox"
                checked={createStarterNote}
                onChange={e => setCreateStarterNote(e.target.checked)}
                disabled={isSubmitting}
                className="w-3.5 h-3.5 rounded border-[#e5e3dc] dark:border-[#282b33] text-[#2d6a4f] focus:ring-[#2d6a4f]"
              />
              <span>Initialize this workspace with a Welcome.md note</span>
            </label>

            {createStarterNote && (
              <div className="pl-5.5">
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="Welcome.md"
                  value={starterNoteName}
                  onChange={e => setStarterNoteName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-[#e5e3dc] dark:border-[#282b33] bg-[#f8f7f4] dark:bg-[#111215] text-[#191b1f] dark:text-[#eceef2] focus:border-[#2d6a4f] dark:focus:border-[#52b788] focus:outline-none"
                />
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-center gap-1.5 p-2.5 rounded bg-red-500/10 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e3dc]/60 dark:border-[#282b33]/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#e5e3dc] dark:border-[#282b33] hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !workspaceName.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[#2d6a4f] hover:bg-[#24553f] dark:bg-[#52b788] dark:hover:bg-[#429d73] text-white dark:text-[#111215] shadow-xs transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#2d6a4f] dark:focus-visible:outline-[#52b788]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
