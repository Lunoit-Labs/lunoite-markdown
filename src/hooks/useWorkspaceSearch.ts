import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FileTreeNode, OpenTab } from '../types/workspace';
import { FileSearchResult, WorkspaceSearchOptions } from '../types/search';
import { flattenSearchableFiles, searchDocument } from '../lib/workspaceSearch';

interface UseWorkspaceSearchProps {
  tree: FileTreeNode[];
  readFile: (fileHandle?: FileSystemFileHandle, nativePath?: string) => Promise<string>;
  openTabs: OpenTab[];
}

export function useWorkspaceSearch({
  tree,
  readFile,
  openTabs,
}: UseWorkspaceSearchProps) {
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FileSearchResult[]>([]);

  // In-memory cache for file contents to accelerate multi-keystroke searching
  const contentCacheRef = useRef<Map<string, string>>(new Map());

  // Flatten all searchable file nodes from tree and open tabs
  const allSearchableFiles = useMemo(() => {
    const list = [...flattenSearchableFiles(tree)];
    for (const tab of openTabs) {
      if (!list.some(f => f.id === tab.id)) {
        list.push({
          id: tab.id,
          name: tab.name,
          path: tab.path,
          kind: 'file',
          handle: (tab.handle || {}) as FileSystemFileHandle,
          extension: tab.name.split('.').pop() || 'md',
        });
      }
    }
    return list;
  }, [tree, openTabs]);

  // Update cache whenever open tabs change (to reflect live unsaved edits)
  useEffect(() => {
    for (const tab of openTabs) {
      contentCacheRef.current.set(tab.id, tab.content);
    }
  }, [openTabs]);

  // Execute search across all files
  const performSearch = useCallback(
    async (searchQuery: string, options: WorkspaceSearchOptions) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const searchResults: FileSearchResult[] = [];

      try {
        for (const node of allSearchableFiles) {
          let text: string | undefined;

          // Check if file is currently open in tabs with unsaved content
          const openTab = openTabs.find(t => t.id === node.id);
          if (openTab) {
            text = openTab.content;
          } else if (contentCacheRef.current.has(node.id)) {
            text = contentCacheRef.current.get(node.id);
          } else {
            try {
              text = await readFile(node.handle as FileSystemFileHandle, node.nativePath);
              if (text !== undefined) {
                contentCacheRef.current.set(node.id, text);
              }
            } catch {
              // File could not be read or handle expired
              text = undefined;
            }
          }

          if (typeof text === 'string') {
            const matches = searchDocument(text, trimmed, options);
            if (matches.length > 0) {
              searchResults.push({
                fileId: node.id,
                fileName: node.name,
                filePath: node.path,
                node,
                matches,
              });
            }
          }
        }

        setResults(searchResults);
      } finally {
        setIsSearching(false);
      }
    },
    [allSearchableFiles, openTabs, readFile]
  );

  // Debounced search trigger when query or matchCase changes
  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query, { matchCase });
    }, 150);

    return () => clearTimeout(handler);
  }, [query, matchCase, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  const totalMatches = useMemo(() => {
    return results.reduce((acc, curr) => acc + curr.matches.length, 0);
  }, [results]);

  const totalFiles = results.length;

  return {
    query,
    setQuery,
    matchCase,
    setMatchCase,
    isSearching,
    results,
    totalMatches,
    totalFiles,
    clearSearch,
  };
}
