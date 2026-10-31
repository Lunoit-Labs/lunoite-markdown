import { FileTreeNode } from '../types/workspace';
import { SearchMatch, WorkspaceSearchOptions } from '../types/search';

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'bmp',
  'tiff',
  'pdf',
  'zip',
  'tar',
  'gz',
  '7z',
  'rar',
  'mp3',
  'wav',
  'ogg',
  'mp4',
  'mov',
  'webm',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'wasm',
]);

/**
 * Checks whether a given file name corresponds to a searchable plain-text document.
 */
export function isSearchableFile(fileName: string): boolean {
  const parts = fileName.split('.');
  if (parts.length <= 1) return true;
  const ext = parts.pop()?.toLowerCase() || '';
  return !BINARY_EXTENSIONS.has(ext);
}

/**
 * Recursively extracts all searchable file nodes from a file tree.
 */
export function flattenSearchableFiles(nodes: FileTreeNode[]): FileTreeNode[] {
  const files: FileTreeNode[] = [];

  function traverse(list: FileTreeNode[]) {
    for (const node of list) {
      if (node.kind === 'file') {
        if (isSearchableFile(node.name)) {
          files.push(node);
        }
      } else if (node.kind === 'directory' && node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return files;
}

/**
 * Searches a document string line by line and collects all occurrences.
 */
export function searchDocument(
  content: string,
  query: string,
  options: WorkspaceSearchOptions
): SearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matches: SearchMatch[] = [];
  const lines = content.split('\n');
  const target = options.matchCase ? trimmed : trimmed.toLowerCase();
  let matchIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const testLine = options.matchCase ? rawLine : rawLine.toLowerCase();

    let startIndex = 0;
    while (startIndex < testLine.length) {
      const matchIdx = testLine.indexOf(target, startIndex);
      if (matchIdx === -1) break;

      // Extract a reasonable context snippet around the match (up to 120 chars)
      const contextStart = Math.max(0, matchIdx - 40);
      const contextEnd = Math.min(rawLine.length, matchIdx + target.length + 60);
      const snippet = rawLine.substring(contextStart, contextEnd);

      const snippetMatchStart = matchIdx - contextStart;
      const snippetMatchEnd = snippetMatchStart + target.length;

      matches.push({
        lineNumber: i + 1,
        lineContent: snippet,
        matchStartIndex: snippetMatchStart,
        matchEndIndex: snippetMatchEnd,
        matchIndex: matchIndex++,
      });

      startIndex = matchIdx + target.length;
    }
  }

  return matches;
}
