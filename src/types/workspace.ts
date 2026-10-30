export type NodeKind = 'file' | 'directory';

export interface FileTreeNode {
  id: string; // unique path, e.g. "docs/architecture.md"
  name: string;
  path: string;
  kind: NodeKind;
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
  parentHandle?: FileSystemDirectoryHandle;
  nativePath?: string;
  parentNativePath?: string;
  children?: FileTreeNode[];
  extension?: string;
  sizeBytes?: number;
  lastModified?: number;
}

export interface OpenTab {
  id: string; // matches node.id or file path
  name: string;
  path: string;
  handle?: FileSystemFileHandle | null;
  parentDirHandle?: FileSystemDirectoryHandle;
  content: string;
  isDirty: boolean;
  lastSavedAt: number;
  nativePath?: string;
  isSingleFile?: boolean;
  isNonMarkdown?: boolean;
  isForceShown?: boolean;
  viewMode?: 'rendered' | 'raw';
}


export interface WorkspaceState {
  rootHandle: FileSystemDirectoryHandle | null;
  nativePath?: string;
  name: string;
  tree: FileTreeNode[];
  isLoading: boolean;
  error: string | null;
}

export interface RecentWorkspace {
  id: string;
  name: string;
  lastOpened: number;
  handleKey: string;
  nativePath?: string;
}

/**
 * Checks whether a file node has a Markdown (.md or .markdown) extension.
 */
export function isMarkdownFile(node: { name: string; extension?: string }): boolean {
  const ext = (node.extension || node.name.split('.').pop() || '').toLowerCase();
  return ext === 'md' || ext === 'markdown';
}

/**
 * Ensures a file name has a Markdown (.md) extension by default unless an explicit
 * known extension is provided.
 */
export function ensureMarkdownExtension(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return 'untitled.md';
  const lower = trimmed.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return trimmed;
  }
  const lastDotIndex = trimmed.lastIndexOf('.');
  if (lastDotIndex > 0 && lastDotIndex < trimmed.length - 1) {
    const candidateExt = trimmed.slice(lastDotIndex + 1).toLowerCase();
    const commonExtensions = [
      'txt',
      'json',
      'csv',
      'yaml',
      'yml',
      'js',
      'ts',
      'jsx',
      'tsx',
      'html',
      'css',
      'xml',
    ];
    if (commonExtensions.includes(candidateExt)) {
      return trimmed;
    }
  }
  return `${trimmed}.md`;
}

