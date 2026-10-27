import { FileTreeNode } from '../types/workspace';

export interface NativeFileNode {
  id: string;
  name: string;
  path: string;
  native_path: string;
  kind: 'file' | 'directory';
  extension?: string;
  children?: NativeFileNode[];
}

/**
 * Tauri desktop environment detection and native command bridge.
 * Safe to use in both browser and Tauri desktop environments.
 */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

export async function getTauriCliFile(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await invoke<string | null>('get_cli_file');
    return path || null;
  } catch (err) {
    console.warn('Failed to get CLI file from Tauri:', err);
    return null;
  }
}

export async function getTauriCliFiles(): Promise<string[]> {
  if (!isTauri()) return [];
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const files = await invoke<string[]>('get_cli_files');
    return files || [];
  } catch (err) {
    console.warn('Failed to get CLI files from Tauri:', err);
    return [];
  }
}

export async function onOpenNativeFile(callback: (filePath: string) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<string>('open-native-file', (event) => {
      if (event.payload) {
        callback(event.payload);
      }
    });
    return unlisten;
  } catch (err) {
    console.warn('Failed to listen for open-native-file event:', err);
    return () => {};
  }
}

export async function pickNativeDirectory(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string | null>('pick_native_directory');
  } catch (err) {
    console.error('Failed to pick native directory:', err);
    return null;
  }
}

export async function pickNativeFile(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string | null>('pick_native_file');
  } catch (err) {
    console.error('Failed to pick native file:', err);
    return null;
  }
}

export async function readNativeFile(path: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('Native file read is only available in desktop app');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<string>('read_native_file', { path });
}

export async function writeNativeFile(path: string, content: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('Native file write is only available in desktop app');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke<void>('write_native_file', { path, content });
}

export async function scanNativeDirectory(rootPath: string): Promise<FileTreeNode[]> {
  if (!isTauri()) return [];
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const rawNodes = await invoke<NativeFileNode[]>('scan_native_directory', { rootPath });

    function convertNode(node: NativeFileNode, parentNativePath?: string): FileTreeNode {
      return {
        id: node.id,
        name: node.name,
        path: node.path,
        nativePath: node.native_path,
        parentNativePath,
        kind: node.kind,
        extension: node.extension,
        children: node.children?.map(child => convertNode(child, node.native_path)),
      };
    }

    return rawNodes.map(node => convertNode(node, rootPath));
  } catch (err) {
    console.error('Failed to scan native directory:', err);
    return [];
  }
}

export async function createNativeFile(dirPath: string, name: string): Promise<string> {
  if (!isTauri()) throw new Error('Native file create only in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<string>('create_native_file', { dirPath, name });
}

export async function createNativeDir(dirPath: string, name: string): Promise<string> {
  if (!isTauri()) throw new Error('Native dir create only in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<string>('create_native_dir', { dirPath, name });
}

export async function deleteNativeEntry(path: string): Promise<void> {
  if (!isTauri()) throw new Error('Native delete only in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke<void>('delete_native_entry', { path });
}

export async function renameNativeEntry(oldPath: string, newPath: string): Promise<void> {
  if (!isTauri()) throw new Error('Native rename only in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke<void>('rename_native_entry', { oldPath, newPath });
}
