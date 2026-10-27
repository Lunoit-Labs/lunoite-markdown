import { useState, useCallback } from 'react';
import { OpenTab, FileTreeNode } from '../types/workspace';

export function useTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || null;

  const openTab = useCallback(
    (
      node: FileTreeNode,
      content: string,
      options?: {
        nativePath?: string;
        isSingleFile?: boolean;
        isNonMarkdown?: boolean;
        isForceShown?: boolean;
      }
    ) => {
      setTabs(prev => {
        const existing = prev.find(t => t.id === node.id);
        if (existing) {
          return prev;
        }
        const newTab: OpenTab = {
          id: node.id,
          name: node.name,
          path: node.path,
          handle: (node.handle as FileSystemFileHandle) || null,
          parentDirHandle: node.parentHandle,
          content,
          isDirty: false,
          lastSavedAt: Date.now(),
          nativePath: options?.nativePath,
          isSingleFile: options?.isSingleFile,
          isNonMarkdown: options?.isNonMarkdown,
          isForceShown: options?.isForceShown,
        };
        return [...prev, newTab];
      });
      setActiveTabId(node.id);
    },
    []
  );

  const forceShowTab = useCallback((tabId: string, content: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId
          ? {
              ...t,
              content,
              isForceShown: true,
            }
          : t
      )
    );
  }, []);


  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const index = prev.findIndex(t => t.id === tabId);
      if (index === -1) return prev;

      const newTabs = prev.filter(t => t.id !== tabId);

      // If active tab was closed, switch to adjacent tab
      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          const nextIndex = Math.min(index, newTabs.length - 1);
          setActiveTabId(newTabs[nextIndex].id);
        } else {
          setActiveTabId(null);
        }
      }

      return newTabs;
    });
  }, [activeTabId]);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      )
    );
  }, []);

  const markTabClean = useCallback((tabId: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, isDirty: false, lastSavedAt: Date.now() } : t
      )
    );
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const toggleTabViewMode = useCallback((tabId: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId
          ? {
              ...t,
              viewMode: t.viewMode === 'raw' ? 'rendered' : 'raw',
            }
          : t
      )
    );
  }, []);

  const setTabViewMode = useCallback(
    (tabId: string, viewMode: 'rendered' | 'raw') => {
      setTabs(prev =>
        prev.map(t => (t.id === tabId ? { ...t, viewMode } : t))
      );
    },
    []
  );

  const renameTab = useCallback(
    (
      oldId: string,
      updates: {
        newId: string;
        newName: string;
        newPath: string;
        newNativePath?: string;
        newHandle?: FileSystemFileHandle | null;
      }
    ) => {
      setTabs(prev =>
        prev.map(t => {
          if (t.id === oldId) {
            return {
              ...t,
              id: updates.newId,
              name: updates.newName,
              path: updates.newPath,
              nativePath: updates.newNativePath !== undefined ? updates.newNativePath : t.nativePath,
              handle: updates.newHandle !== undefined ? updates.newHandle : t.handle,
            };
          }
          return t;
        })
      );
      setActiveTabId(currentActive => (currentActive === oldId ? updates.newId : currentActive));
    },
    []
  );

  return {
    tabs,
    setTabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openTab,
    closeTab,
    renameTab,
    updateTabContent,
    markTabClean,
    closeAllTabs,
    forceShowTab,
    toggleTabViewMode,
    setTabViewMode,
  };
}

