const DB_NAME = 'lunoite_workspace_db';
const STORE_NAME = 'workspace_handles';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDirectoryHandle(
  key: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDirectoryHandle(
  key: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore errors when clearing
  }
}

export async function verifyHandlePermission(
  handle: FileSystemHandle,
  readWrite = true
): Promise<boolean> {
  const options = {
    mode: (readWrite ? 'readwrite' : 'read') as 'readwrite' | 'read',
  };

  const extHandle = handle as unknown as {
    queryPermission?: (opts: { mode: string }) => Promise<string>;
    requestPermission?: (opts: { mode: string }) => Promise<string>;
  };

  if (extHandle.queryPermission) {
    const status = await extHandle.queryPermission(options);
    if (status === 'granted') return true;
  }

  if (extHandle.requestPermission) {
    const status = await extHandle.requestPermission(options);
    if (status === 'granted') return true;
  }

  return false;
}

import { RecentWorkspace } from '../types/workspace';

const RECENT_WORKSPACES_STORAGE_KEY = 'lunoite_recent_workspaces';

export function getRecentWorkspaces(): RecentWorkspace[] {
  try {
    const raw = localStorage.getItem(RECENT_WORKSPACES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentWorkspaces(workspaces: RecentWorkspace[]): void {
  try {
    localStorage.setItem(RECENT_WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
  } catch (err) {
    console.error('Failed to save recent workspaces metadata:', err);
  }
}

export async function recordRecentWorkspace(
  handle: FileSystemDirectoryHandle
): Promise<RecentWorkspace[]> {
  const existing = getRecentWorkspaces();
  const handleKey = `lunoite_recent_workspace_${handle.name}`;

  try {
    await saveDirectoryHandle(handleKey, handle);
  } catch (err) {
    console.warn('Could not store handle in indexedDB:', err);
  }

  const existingIndex = existing.findIndex(
    w => w.name === handle.name || w.handleKey === handleKey
  );

  let updatedItem: RecentWorkspace;
  if (existingIndex >= 0) {
    updatedItem = {
      ...existing[existingIndex],
      lastOpened: Date.now(),
      handleKey,
    };
    existing.splice(existingIndex, 1);
  } else {
    updatedItem = {
      id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: handle.name,
      lastOpened: Date.now(),
      handleKey,
    };
  }

  const updatedList = [updatedItem, ...existing].slice(0, 10);
  saveRecentWorkspaces(updatedList);
  return updatedList;
}

export function recordNativeRecentWorkspace(
  pathOrName: string,
  nameOrPath?: string
): RecentWorkspace[] {
  let finalPath = pathOrName;
  let finalName = nameOrPath;

  if (nameOrPath && (nameOrPath.includes('/') || nameOrPath.includes('\\'))) {
    finalPath = nameOrPath;
    finalName = pathOrName;
  } else if (!finalName) {
    finalName = finalPath.split(/[\\/]/).pop() || finalPath;
  }

  const existing = getRecentWorkspaces();
  const handleKey = `native:${finalPath}`;

  const existingIndex = existing.findIndex(
    w => w.nativePath === finalPath || w.handleKey === handleKey
  );

  let updatedItem: RecentWorkspace;
  if (existingIndex >= 0) {
    updatedItem = {
      ...existing[existingIndex],
      name: finalName,
      nativePath: finalPath,
      lastOpened: Date.now(),
      handleKey,
    };
    existing.splice(existingIndex, 1);
  } else {
    updatedItem = {
      id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: finalName,
      nativePath: finalPath,
      lastOpened: Date.now(),
      handleKey,
    };
  }

  const updatedList = [updatedItem, ...existing].slice(0, 10);
  saveRecentWorkspaces(updatedList);
  return updatedList;
}

export async function removeRecentWorkspace(id: string): Promise<RecentWorkspace[]> {
  const existing = getRecentWorkspaces();
  const target = existing.find(w => w.id === id);
  if (target) {
    await clearDirectoryHandle(target.handleKey);
  }
  const updatedList = existing.filter(w => w.id !== id);
  saveRecentWorkspaces(updatedList);
  return updatedList;
}

export async function clearAllRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const existing = getRecentWorkspaces();
  for (const item of existing) {
    await clearDirectoryHandle(item.handleKey);
  }
  saveRecentWorkspaces([]);
  return [];
}
