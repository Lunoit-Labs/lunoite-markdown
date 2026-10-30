import { useState, useCallback, useEffect, useRef } from 'react';
import { FileTreeNode, WorkspaceState, RecentWorkspace, ensureMarkdownExtension } from '../types/workspace';
import {
  saveDirectoryHandle,
  getDirectoryHandle,
  clearDirectoryHandle,
  verifyHandlePermission,
  recordRecentWorkspace,
  recordNativeRecentWorkspace,
  getRecentWorkspaces,
  removeRecentWorkspace,
  clearAllRecentWorkspaces,
} from '../lib/indexedDb';
import {
  isTauri,
  pickNativeDirectory,
  scanNativeDirectory,
  readNativeFile,
  writeNativeFile,
  createNativeFile,
  createNativeDir,
  deleteNativeEntry,
  renameNativeEntry,
} from '../lib/tauri';

const WORKSPACE_STORAGE_KEY = 'lunoite_active_workspace';
const NATIVE_WORKSPACE_STORAGE_KEY = 'lunoite_active_native_workspace';

export interface RenameEntryResult {
  success: boolean;
  newNativePath?: string;
  newHandle?: FileSystemFileHandle | null;
  error?: string;
}

export interface CreateWorkspaceResult {
  success: boolean;
  rootHandle?: FileSystemDirectoryHandle | null;
  nativePath?: string;
  starterNotePath?: string;
  error?: string;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    rootHandle: null,
    nativePath: undefined,
    name: '',
    tree: [],
    isLoading: false,
    error: null,
  });

  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>(() =>
    getRecentWorkspaces()
  );

  const isNativeSupported =
    isTauri() || (typeof window !== 'undefined' && 'showDirectoryPicker' in window);

  // Recursively scans a directory handle for browser mode and returns a structured FileTreeNode array
  const scanDirectory = useCallback(
    async (
      dirHandle: FileSystemDirectoryHandle,
      basePath = ''
    ): Promise<FileTreeNode[]> => {
      const nodes: FileTreeNode[] = [];

      try {
        const entries: [string, FileSystemHandle][] = [];
        // Iterate entries using async iterator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const [name, handle] of (dirHandle as any).entries()) {
          // Skip hidden system files/folders (e.g. .git)
          if (name.startsWith('.') && name !== '.lunoite') continue;
          if (name === 'node_modules' || name === 'dist') continue;
          entries.push([name, handle]);
        }

        // Sort: folders first, then files alphabetically
        entries.sort((a, b) => {
          if (a[1].kind === b[1].kind) {
            return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
          }
          return a[1].kind === 'directory' ? -1 : 1;
        });

        for (const [name, handle] of entries) {
          const nodePath = basePath ? `${basePath}/${name}` : name;

          if (handle.kind === 'directory') {
            const children = await scanDirectory(
              handle as FileSystemDirectoryHandle,
              nodePath
            );
            nodes.push({
              id: nodePath,
              name,
              path: nodePath,
              kind: 'directory',
              handle: handle as FileSystemDirectoryHandle,
              parentHandle: dirHandle,
              children,
            });
          } else {
            const fileHandle = handle as FileSystemFileHandle;
            const ext = name.includes('.') ? name.split('.').pop() || '' : '';
            nodes.push({
              id: nodePath,
              name,
              path: nodePath,
              kind: 'file',
              handle: fileHandle,
              parentHandle: dirHandle,
              extension: ext.toLowerCase(),
            });
          }
        }
      } catch (err) {
        console.error('Error scanning directory:', err);
      }

      return nodes;
    },
    []
  );

  // Refresh tree using nativePath (Tauri) or rootHandle (browser)
  const refreshTree = useCallback(async (): Promise<FileTreeNode[]> => {
    const currentNativePath = workspaceRef.current.nativePath;
    const currentRootHandle = workspaceRef.current.rootHandle;

    if (isTauri() && currentNativePath) {
      try {
        const tree = await scanNativeDirectory(currentNativePath);
        setWorkspace(prev => ({ ...prev, tree }));
        return tree;
      } catch (err) {
        console.error('Failed to refresh native file tree:', err);
      }
      return [];
    }

    if (!currentRootHandle) return [];
    try {
      const tree = await scanDirectory(currentRootHandle);
      setWorkspace(prev => ({ ...prev, tree }));
      return tree;
    } catch (err) {
      console.error('Failed to refresh file tree:', err);
    }
    return [];
  }, [scanDirectory]);

  // Open a new workspace via native dialog (Tauri) or showDirectoryPicker (browser)
  const openWorkspace = useCallback(async (): Promise<boolean> => {
    if (isTauri()) {
      try {
        setWorkspace(prev => ({ ...prev, isLoading: true, error: null }));
        const dirPath = await pickNativeDirectory();
        if (!dirPath) {
          setWorkspace(prev => ({ ...prev, isLoading: false }));
          return false;
        }

        const name = dirPath.split(/[\\/]/).pop() || dirPath;
        const tree = await scanNativeDirectory(dirPath);

        try {
          localStorage.setItem(NATIVE_WORKSPACE_STORAGE_KEY, dirPath);
        } catch {
          // ignore
        }

        const updatedRecents = recordNativeRecentWorkspace(dirPath, name);
        setRecentWorkspaces(updatedRecents);

        setWorkspace({
          rootHandle: null,
          nativePath: dirPath,
          name,
          tree,
          isLoading: false,
          error: null,
        });

        return true;
      } catch (err) {
        console.error('Error opening native workspace:', err);
        setWorkspace(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to open directory.',
        }));
        return false;
      }
    }

    if (!isNativeSupported) {
      alert(
        'Directory Picker API is not supported in this browser. Please use Chrome, Edge, or a Chromium-based browser.'
      );
      return false;
    }

    try {
      setWorkspace(prev => ({ ...prev, isLoading: true, error: null }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rootHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      await saveDirectoryHandle(WORKSPACE_STORAGE_KEY, rootHandle);
      const updatedRecents = await recordRecentWorkspace(rootHandle);
      setRecentWorkspaces(updatedRecents);
      const tree = await scanDirectory(rootHandle);

      setWorkspace({
        rootHandle,
        nativePath: undefined,
        name: rootHandle.name,
        tree,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        setWorkspace(prev => ({ ...prev, isLoading: false }));
        return false;
      }
      console.error('Error opening directory:', err);
      setWorkspace(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to open directory.',
      }));
      return false;
    }
  }, [isNativeSupported, scanDirectory]);

  // Open a previously saved workspace from recent history
  const openRecentWorkspace = useCallback(
    async (recent: RecentWorkspace): Promise<boolean> => {
      try {
        setWorkspace(prev => ({ ...prev, isLoading: true, error: null }));

        if (recent.nativePath || isTauri()) {
          const dirPath = recent.nativePath || (isTauri() ? recent.handleKey : undefined);
          if (dirPath && typeof dirPath === 'string' && (dirPath.includes('/') || dirPath.includes('\\'))) {
            const name = recent.name || dirPath.split(/[\\/]/).pop() || dirPath;
            const tree = await scanNativeDirectory(dirPath);

            try {
              localStorage.setItem(NATIVE_WORKSPACE_STORAGE_KEY, dirPath);
            } catch {
              // ignore
            }

            const updatedRecents = recordNativeRecentWorkspace(dirPath, name);
            setRecentWorkspaces(updatedRecents);

            setWorkspace({
              rootHandle: null,
              nativePath: dirPath,
              name,
              tree,
              isLoading: false,
              error: null,
            });

            return true;
          }
        }

        let handle = await getDirectoryHandle(recent.handleKey);
        if (!handle) {
          handle = await getDirectoryHandle(WORKSPACE_STORAGE_KEY);
        }

        if (!handle) {
          setWorkspace(prev => ({
            ...prev,
            isLoading: false,
            error: 'Workspace folder handle is no longer stored.',
          }));
          return false;
        }

        const hasPermission = await verifyHandlePermission(handle, true);
        if (!hasPermission) {
          setWorkspace(prev => ({
            ...prev,
            isLoading: false,
            error: 'Permission to access workspace folder was denied.',
          }));
          return false;
        }

        await saveDirectoryHandle(WORKSPACE_STORAGE_KEY, handle);
        const updatedRecents = await recordRecentWorkspace(handle);
        setRecentWorkspaces(updatedRecents);

        const tree = await scanDirectory(handle);
        setWorkspace({
          rootHandle: handle,
          nativePath: undefined,
          name: handle.name,
          tree,
          isLoading: false,
          error: null,
        });

        return true;
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          setWorkspace(prev => ({ ...prev, isLoading: false }));
          return false;
        }
        console.error('Error opening recent workspace:', err);
        setWorkspace(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to open recent workspace.',
        }));
        return false;
      }
    },
    [scanDirectory]
  );

  // Create a brand new workspace folder on disk
  const createNewWorkspace = useCallback(
    async (
      name: string,
      parentPathOrHandle?: string | FileSystemDirectoryHandle | null,
      initialNoteTitle = 'Welcome.md',
      initialNoteContent?: string
    ): Promise<CreateWorkspaceResult | null> => {
      if (isTauri()) {
        try {
          setWorkspace(prev => ({ ...prev, isLoading: true, error: null }));
          let parentDir: string | null = null;
          if (typeof parentPathOrHandle === 'string' && parentPathOrHandle.trim()) {
            parentDir = parentPathOrHandle.trim();
          } else {
            parentDir = await pickNativeDirectory();
          }

          if (!parentDir) {
            setWorkspace(prev => ({ ...prev, isLoading: false }));
            return null;
          }

          const cleanName = name.trim();
          const workspacePath = await createNativeDir(parentDir, cleanName);

          let notePath: string | undefined;

          if (initialNoteTitle && initialNoteTitle.trim()) {
            const noteName = ensureMarkdownExtension(initialNoteTitle);
            const starterContent =
              initialNoteContent ??
              `# ${cleanName}\n\nWelcome to your new Lunoite workspace. Start writing your notes or STAR stories here.\n`;
            notePath = await createNativeFile(workspacePath, noteName);
            await writeNativeFile(notePath, starterContent);
          }

          try {
            localStorage.setItem(NATIVE_WORKSPACE_STORAGE_KEY, workspacePath);
          } catch {
            // ignore
          }

          const updatedRecents = recordNativeRecentWorkspace(workspacePath, cleanName);
          setRecentWorkspaces(updatedRecents);

          const tree = await scanNativeDirectory(workspacePath);
          setWorkspace({
            rootHandle: null,
            nativePath: workspacePath,
            name: cleanName,
            tree,
            isLoading: false,
            error: null,
          });

          return {
            success: true,
            nativePath: workspacePath,
            starterNotePath: notePath,
          };
        } catch (err) {
          console.error('Error creating native workspace:', err);
          setWorkspace(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to create workspace.',
          }));
          return { success: false, error: (err as Error).message };
        }
      }

      if (!isNativeSupported) {
        alert(
          'Directory Picker API is not supported in this browser. Please use Chrome, Edge, or a Chromium-based browser.'
        );
        return null;
      }

      try {
        setWorkspace(prev => ({ ...prev, isLoading: true, error: null }));

        let parentHandle: FileSystemDirectoryHandle | null = null;
        if (
          parentPathOrHandle &&
          typeof parentPathOrHandle === 'object' &&
          'getDirectoryHandle' in parentPathOrHandle
        ) {
          parentHandle = parentPathOrHandle as FileSystemDirectoryHandle;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parentHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
          });
        }

        if (!parentHandle) {
          setWorkspace(prev => ({ ...prev, isLoading: false }));
          return null;
        }

        const cleanName = name.trim();
        const workspaceHandle = await parentHandle.getDirectoryHandle(cleanName, {
          create: true,
        });

        if (initialNoteTitle && initialNoteTitle.trim()) {
          const noteName = ensureMarkdownExtension(initialNoteTitle);
          const noteHandle = await workspaceHandle.getFileHandle(noteName, {
            create: true,
          });
          const writable = await noteHandle.createWritable();
          const starterContent =
            initialNoteContent ??
            `# ${cleanName}\n\nWelcome to your new Lunoite workspace. Start writing your notes or STAR stories here.\n`;
          await writable.write(starterContent);
          await writable.close();
        }

        await saveDirectoryHandle(WORKSPACE_STORAGE_KEY, workspaceHandle);
        const updatedRecents = await recordRecentWorkspace(workspaceHandle);
        setRecentWorkspaces(updatedRecents);

        const tree = await scanDirectory(workspaceHandle);
        setWorkspace({
          rootHandle: workspaceHandle,
          nativePath: undefined,
          name: workspaceHandle.name,
          tree,
          isLoading: false,
          error: null,
        });

        return {
          success: true,
          rootHandle: workspaceHandle,
        };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          setWorkspace(prev => ({ ...prev, isLoading: false }));
          return null;
        }
        console.error('Error creating workspace:', err);
        setWorkspace(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to create workspace.',
        }));
        return { success: false, error: (err as Error).message };
      }
    },
    [isNativeSupported, scanDirectory]
  );

  // Remove a recent workspace from history
  const removeRecent = useCallback(async (id: string) => {
    const updated = await removeRecentWorkspace(id);
    setRecentWorkspaces(updated);
  }, []);

  // Clear all recent workspace history
  const clearRecent = useCallback(async () => {
    const updated = await clearAllRecentWorkspaces();
    setRecentWorkspaces(updated);
  }, []);

  // Close active workspace
  const closeWorkspace = useCallback(async () => {
    try {
      localStorage.removeItem(NATIVE_WORKSPACE_STORAGE_KEY);
    } catch {
      // ignore
    }
    await clearDirectoryHandle(WORKSPACE_STORAGE_KEY);
    setWorkspace({
      rootHandle: null,
      nativePath: undefined,
      name: '',
      tree: [],
      isLoading: false,
      error: null,
    });
  }, []);

  // Restore previous workspace on startup: instant zero-prompt restoration in Tauri desktop
  useEffect(() => {
    async function restore() {
      try {
        setRecentWorkspaces(getRecentWorkspaces());

        if (isTauri()) {
          const savedNativePath = localStorage.getItem(NATIVE_WORKSPACE_STORAGE_KEY);
          if (savedNativePath) {
            try {
              const name = savedNativePath.split(/[\\/]/).pop() || savedNativePath;
              const tree = await scanNativeDirectory(savedNativePath);
              if (tree.length > 0 || savedNativePath) {
                setWorkspace({
                  rootHandle: null,
                  nativePath: savedNativePath,
                  name,
                  tree,
                  isLoading: false,
                  error: null,
                });
                const updated = recordNativeRecentWorkspace(savedNativePath, name);
                setRecentWorkspaces(updated);
                return;
              }
            } catch (err) {
              console.warn('Could not automatically restore native workspace:', err);
            }
          }
          return;
        }

        // Web browser restore via IndexedDB directory handle
        const savedHandle = await getDirectoryHandle(WORKSPACE_STORAGE_KEY);
        if (!savedHandle) return;

        const hasPermission = await verifyHandlePermission(savedHandle, true);
        if (hasPermission) {
          const tree = await scanDirectory(savedHandle);
          setWorkspace({
            rootHandle: savedHandle,
            nativePath: undefined,
            name: savedHandle.name,
            tree,
            isLoading: false,
            error: null,
          });
          const updated = await recordRecentWorkspace(savedHandle);
          setRecentWorkspaces(updated);
        }
      } catch (err) {
        console.warn('Could not automatically restore workspace:', err);
      }
    }

    restore();
  }, [scanDirectory]);

  // File Operations on Disk
  const readFile = useCallback(
    async (fileHandle?: FileSystemFileHandle | null, nativePath?: string): Promise<string> => {
      if (nativePath) {
        return await readNativeFile(nativePath);
      }
      if (fileHandle && typeof fileHandle.getFile === 'function') {
        const file = await fileHandle.getFile();
        return await file.text();
      }
      return '';
    },
    []
  );

  const writeFile = useCallback(
    async (
      fileHandle?: FileSystemFileHandle | null,
      content = '',
      nativePath?: string
    ): Promise<boolean> => {
      if (nativePath) {
        try {
          await writeNativeFile(nativePath, content);
          return true;
        } catch (err) {
          console.error('Error writing native file directly to disk:', err);
          return false;
        }
      }
      if (fileHandle && typeof fileHandle.createWritable === 'function') {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
          return true;
        } catch (err) {
          console.error('Error writing file directly to disk:', err);
          return false;
        }
      }
      return false;
    },
    []
  );

  const createFile = useCallback(
    async (
      parentHandle?: FileSystemDirectoryHandle | null,
      fileName = '',
      initialContent = '# Untitled\n\nStart writing...\n',
      parentNativePath?: string
    ): Promise<{ handle?: FileSystemFileHandle; nativePath?: string } | null> => {
      try {
        const cleanName = ensureMarkdownExtension(fileName);

        if (parentNativePath || (isTauri() && workspace.nativePath)) {
          const dir = parentNativePath || workspace.nativePath!;
          const filePath = await createNativeFile(dir, cleanName);
          if (initialContent) {
            await writeNativeFile(filePath, initialContent);
          }
          await refreshTree();
          return { nativePath: filePath };
        }

        if (parentHandle) {
          const newFileHandle = await parentHandle.getFileHandle(cleanName, {
            create: true,
          });
          const writable = await newFileHandle.createWritable();
          await writable.write(initialContent);
          await writable.close();

          await refreshTree();
          return { handle: newFileHandle };
        }

        return null;
      } catch (err) {
        console.error('Failed to create file:', err);
        return null;
      }
    },
    [refreshTree, workspace.nativePath]
  );

  const createFolder = useCallback(
    async (
      parentHandle?: FileSystemDirectoryHandle | null,
      folderName = '',
      parentNativePath?: string
    ): Promise<boolean> => {
      try {
        if (parentNativePath || (isTauri() && workspace.nativePath)) {
          const dir = parentNativePath || workspace.nativePath!;
          await createNativeDir(dir, folderName);
          await refreshTree();
          return true;
        }

        if (parentHandle) {
          await parentHandle.getDirectoryHandle(folderName, { create: true });
          await refreshTree();
          return true;
        }

        return false;
      } catch (err) {
        console.error('Failed to create folder:', err);
        return false;
      }
    },
    [refreshTree, workspace.nativePath]
  );

  const deleteEntry = useCallback(
    async (
      parentHandle?: FileSystemDirectoryHandle | null,
      name = '',
      node?: FileTreeNode
    ): Promise<boolean> => {
      try {
        if (node?.nativePath) {
          await deleteNativeEntry(node.nativePath);
          await refreshTree();
          return true;
        }

        if (parentHandle) {
          await parentHandle.removeEntry(name, { recursive: true });
          await refreshTree();
          return true;
        }

        return false;
      } catch (err) {
        console.error('Failed to delete entry:', err);
        return false;
      }
    },
    [refreshTree]
  );

  const renameEntry = useCallback(
    async (
      parentHandle?: FileSystemDirectoryHandle | null,
      oldName = '',
      newName = '',
      kind: 'file' | 'directory' = 'file',
      node?: FileTreeNode
    ): Promise<RenameEntryResult> => {
      try {
        if (!oldName || !newName) return { success: false, error: 'Empty name' };
        if (oldName === newName) return { success: true };

        const currentWorkspaceNativePath = workspaceRef.current.nativePath;
        const targetNativePath = node?.nativePath;

        if (targetNativePath || (isTauri() && currentWorkspaceNativePath)) {
          let oldPath = targetNativePath;
          if (!oldPath && currentWorkspaceNativePath) {
            const separator = currentWorkspaceNativePath.includes('\\') ? '\\' : '/';
            oldPath = `${currentWorkspaceNativePath}${separator}${oldName}`;
          }

          if (oldPath) {
            const lastSlash = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'));
            const parentDir = node?.parentNativePath || (lastSlash >= 0 ? oldPath.substring(0, lastSlash) : '');
            const separator = oldPath.includes('\\') ? '\\' : '/';
            const newPath = parentDir ? `${parentDir}${separator}${newName}` : newName;

            await renameNativeEntry(oldPath, newPath);
            await refreshTree();
            return {
              success: true,
              newNativePath: newPath,
            };
          }
        }

        if (parentHandle) {
          if (kind === 'file') {
            const oldHandle = await parentHandle.getFileHandle(oldName);
            let targetHandle: FileSystemFileHandle;
            // Check if native .move() is supported
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof (oldHandle as any).move === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (oldHandle as any).move(newName);
              targetHandle = await parentHandle.getFileHandle(newName);
            } else {
              // Fallback: read content, create new, remove old
              const content = await readFile(oldHandle);
              targetHandle = await parentHandle.getFileHandle(newName, {
                create: true,
              });
              await writeFile(targetHandle, content);
              await parentHandle.removeEntry(oldName);
            }

            await refreshTree();
            return {
              success: true,
              newHandle: targetHandle,
            };
          } else {
            // Directories: check if move is supported
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof (parentHandle as any).move === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (parentHandle as any).move(newName);
              await refreshTree();
              return { success: true };
            }
            alert('Folder renaming is not natively supported in this browser version.');
            return { success: false, error: 'Folder renaming not supported in this browser' };
          }
        }

        return { success: false, error: 'Target file or folder not found' };
      } catch (err) {
        console.error('Failed to rename entry:', err);
        return { success: false, error: (err as Error).message };
      }
    },
    [readFile, writeFile, refreshTree]
  );

  return {
    workspace,
    recentWorkspaces,
    isNativeSupported,
    openWorkspace,
    openRecentWorkspace,
    createNewWorkspace,
    removeRecent,
    clearRecent,
    closeWorkspace,
    refreshTree,
    readFile,
    writeFile,
    createFile,
    createFolder,
    deleteEntry,
    renameEntry,
  };
}
