import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Extension, wrappingInputRule } from '@tiptap/core';

import { EditorToolbar } from './EditorToolbar';
import { BubbleMenu } from './BubbleMenu';
import { SearchHighlightExtension } from '../../lib/searchHighlightExtension';
import { EditorFindBar } from './EditorFindBar';
import { RawMarkdownEditor } from './RawMarkdownEditor';

interface EditorCanvasProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  onSave: () => void;
  onClipSelection: (text: string) => void;
  isZenMode: boolean;
  isActive?: boolean;
  tabId?: string;
  onEditorReady?: (editorInstance: unknown) => void;
  searchHighlightQuery?: string;
  isFindBarOpen?: boolean;
  onToggleFindBar?: (open: boolean) => void;
  viewMode?: 'rendered' | 'raw';
  onToggleViewMode?: () => void;
  pageWidth?: number;
  onUpdatePageWidth?: (width: number) => void;
  isWidthSynced?: boolean;
  onToggleWidthSync?: () => void;
}

// Custom input rule for typing "[] " or "[ ] " to create a task list
const TaskListInputRule = Extension.create({
  name: 'taskListInputRule',
  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*(\[ \]|\[\])\s$/,
        type: this.editor.schema.nodes.taskList,
      }),
    ];
  },
});

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  initialContent,
  onChange,
  onSave,
  onClipSelection,
  isZenMode,
  isActive = true,
  tabId,
  onEditorReady,
  searchHighlightQuery,
  isFindBarOpen,
  onToggleFindBar,
  viewMode = 'rendered',
  onToggleViewMode,
  pageWidth: propPageWidth,
  onUpdatePageWidth,
  isWidthSynced = true,
  onToggleWidthSync,
}) => {
  const [internalFindBarOpen, setInternalFindBarOpen] = useState(false);
  const isFindOpen = isFindBarOpen !== undefined ? isFindBarOpen : internalFindBarOpen;

  const setFindOpen = useCallback(
    (open: boolean) => {
      if (onToggleFindBar) {
        onToggleFindBar(open);
      } else {
        setInternalFindBarOpen(open);
      }
    },
    [onToggleFindBar]
  );

  const [findBarInitialQuery, setFindBarInitialQuery] = useState('');
  const lastEmittedContentRef = useRef(initialContent);
  const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const isFirstMountRef = useRef(true);

  // Raw mode undo/redo state
  const [rawUndoRedo, setRawUndoRedo] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
  }>({
    canUndo: false,
    canRedo: false,
    undo: () => {},
    redo: () => {},
  });

  // Horizontally adjustable page view state and dragging logic
  const DEFAULT_PAGE_WIDTH = 768;
  const MIN_PAGE_WIDTH = 540;

  const [localWidth, setLocalWidth] = useState<number>(() => {
    const saved = localStorage.getItem('lunoite-page-width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_PAGE_WIDTH) return parsed;
    }
    return DEFAULT_PAGE_WIDTH;
  });

  const activePageWidth = propPageWidth ?? localWidth;

  const [isDraggingWidth, setIsDraggingWidth] = useState(false);
  const dragDirectionRef = useRef<'left' | 'right' | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(DEFAULT_PAGE_WIDTH);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  const updatePageWidth = useCallback(
    (newWidth: number) => {
      if (onUpdatePageWidth) {
        onUpdatePageWidth(newWidth);
      } else {
        setLocalWidth(newWidth);
        localStorage.setItem('lunoite-page-width', newWidth.toString());
      }
    },
    [onUpdatePageWidth]
  );

  const handleStartResize = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    dragDirectionRef.current = direction;
    setIsDraggingWidth(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = activePageWidth;
  };

  const handleResetWidth = () => {
    updatePageWidth(DEFAULT_PAGE_WIDTH);
  };

  const handleCycleWidth = useCallback(() => {
    const presets = [640, 768, 1024, 1360];
    const next = presets.find(p => p > activePageWidth) || presets[0];
    updatePageWidth(next);
  }, [activePageWidth, updatePageWidth]);

  useEffect(() => {
    if (!isDraggingWidth) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragDirectionRef.current) return;
      const deltaX = e.clientX - dragStartXRef.current;
      const direction = dragDirectionRef.current === 'right' ? 1 : -1;
      const proposed = dragStartWidthRef.current + deltaX * direction * 2;

      const maxAllowed = canvasWrapperRef.current
        ? canvasWrapperRef.current.clientWidth - 48
        : window.innerWidth - 64;

      const clamped = Math.round(Math.min(maxAllowed, Math.max(MIN_PAGE_WIDTH, proposed)));
      updatePageWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingWidth(false);
      dragDirectionRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWidth, updatePageWidth]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TaskListInputRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Write your story, technical notes, or draft...',
      }),
      SearchHighlightExtension,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none max-w-none text-[#191b1f] dark:text-[#eceef2]',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      lastSelectionRef.current = { from, to };
    },
    onUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      lastSelectionRef.current = { from, to };
      const storage = ed.storage as unknown as { markdown?: { getMarkdown: () => string } };
      const md = storage.markdown ? storage.markdown.getMarkdown() : ed.getText();
      lastEmittedContentRef.current = md;
      onChange(md);
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Restore cursor position and text selection when tab becomes active
  useEffect(() => {
    if (!editor) return;

    if (isActive) {
      const scrollContainer = document.getElementById(
        tabId ? `editor-scroll-container-${tabId}` : 'editor-scroll-container'
      );
      const savedScrollTop = scrollContainer?.scrollTop;

      if (lastSelectionRef.current) {
        const { from, to } = lastSelectionRef.current;
        const { doc } = editor.state;
        const safeFrom = Math.min(Math.max(0, from), doc.content.size);
        const safeTo = Math.min(Math.max(safeFrom, to), doc.content.size);
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      }

      if (!isFirstMountRef.current) {
        if (editor.view?.dom) {
          editor.view.dom.focus({ preventScroll: true });
        } else {
          editor.commands.focus();
        }

        if (scrollContainer && savedScrollTop !== undefined && scrollContainer.scrollTop !== savedScrollTop) {
          scrollContainer.scrollTop = savedScrollTop;
        }
      }
    }
    isFirstMountRef.current = false;
  }, [isActive, editor, tabId]);

  // Sync editor content if changed externally (e.g. disk reload, force show)
  useEffect(() => {
    if (editor) {
      if (initialContent !== lastEmittedContentRef.current) {
        lastEmittedContentRef.current = initialContent;
        const storage = editor.storage as unknown as { markdown?: { getMarkdown: () => string } };
        const current = storage.markdown ? storage.markdown.getMarkdown() : editor.getText();
        if (initialContent !== current) {
          editor.commands.setContent(initialContent, { emitUpdate: false });
        }
      }
    }
  }, [editor, initialContent]);

  // Sync external search highlight (e.g. from Workspace Search)
  useEffect(() => {
    if (editor) {
      if (searchHighlightQuery) {
        setFindBarInitialQuery(searchHighlightQuery);
        // Highlight matching text without opening the in-document find bar
        editor.commands.setSearchTerm(searchHighlightQuery);
      } else {
        editor.commands.clearSearchTerm();
      }
    }
  }, [editor, searchHighlightQuery]);

  // Track scroll position to preserve it across view mode changes and tab switches
  const scrollPositionRef = useRef<{ scrollTop: number; ratio: number }>({ scrollTop: 0, ratio: 0 });
  const paperSheetRef = useRef<HTMLDivElement | null>(null);

  const handleContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    scrollPositionRef.current = {
      scrollTop: el.scrollTop,
      ratio: max > 0 ? el.scrollTop / max : 0,
    };
  }, []);

  // Sync content and preserve scroll position when switching between view modes
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (prevViewModeRef.current !== viewMode) {
      const scrollContainer = document.getElementById(
        tabId ? `editor-scroll-container-${tabId}` : 'editor-scroll-container'
      );

      const { scrollTop: savedScrollTop, ratio: savedRatio } = scrollPositionRef.current;

      // Lock height temporarily to prevent scrollHeight collapse and zero clamping
      if (paperSheetRef.current) {
        const currentHeight = paperSheetRef.current.offsetHeight;
        if (currentHeight > 0) {
          paperSheetRef.current.style.minHeight = `${currentHeight}px`;
        }
      }

      if (prevViewModeRef.current === 'raw' && viewMode === 'rendered') {
        if (editor) {
          editor.commands.setContent(initialContent, { emitUpdate: false });
          lastEmittedContentRef.current = initialContent;
        }
      }

      const restoreScroll = () => {
        if (scrollContainer) {
          const max = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          const target = savedRatio > 0 && max > 0 ? Math.round(savedRatio * max) : savedScrollTop;
          scrollContainer.scrollTop = target;
        }
      };

      // Restore scroll on successive animation frames, then remove temporary minHeight lock
      requestAnimationFrame(() => {
        restoreScroll();
        requestAnimationFrame(() => {
          restoreScroll();
          if (paperSheetRef.current) {
            paperSheetRef.current.style.minHeight = '';
          }
        });
      });
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, editor, initialContent, tabId]);


  // Global Ctrl+S and Ctrl+F listeners (active tab only)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;

      // Ctrl+S: Save file
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }
      // Ctrl+F: Open Find Bar in active document
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        if (editor) {
          const { from, to } = editor.state.selection;
          const sel = from !== to ? editor.state.doc.textBetween(from, to) : '';
          if (sel.trim()) {
            setFindBarInitialQuery(sel.trim());
          }
        }
        setFindOpen(true);
      }
      // Alt+M: Toggle Rendered / Raw Markdown
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        onToggleViewMode?.();
      }
    },
    [isActive, onSave, editor, setFindOpen, onToggleViewMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f7f4] dark:bg-[#111215] transition-colors relative overflow-hidden">
      {/* Top Toolbar is pinned at top, hidden in Zen Mode */}
      {!isZenMode && (
        <EditorToolbar
          editor={editor}
          viewMode={viewMode}
          onToggleViewMode={onToggleViewMode}
          pageWidth={activePageWidth}
          onCyclePageWidth={handleCycleWidth}
          isWidthSynced={isWidthSynced}
          onToggleWidthSync={onToggleWidthSync}
          onRawUndo={rawUndoRedo.undo}
          onRawRedo={rawUndoRedo.redo}
          canRawUndo={rawUndoRedo.canUndo}
          canRawRedo={rawUndoRedo.canRedo}
        />
      )}

      {/* Floating In-Document Find Bar - Fixed and Sticky at top right (active tab only) */}
      {isActive && (
        <EditorFindBar
          editor={editor}
          isOpen={isFindOpen}
          onClose={() => setFindOpen(false)}
          initialQuery={findBarInitialQuery}
          isZenMode={isZenMode}
        />
      )}

      {/* Scrollable Document Container */}
      <div
        id={tabId ? `editor-scroll-container-${tabId}` : 'editor-scroll-container'}
        onScroll={handleContainerScroll}
        className="editor-scroll-container flex-1 flex flex-col min-h-0 overflow-y-auto transition-colors relative"
      >
        {/* Floating Bubble Menu on text selection (rendered mode only) */}
        {viewMode !== 'raw' && (
          <BubbleMenu editor={editor} onClipSelection={onClipSelection} isActive={isActive} />
        )}

        {/* Centered Document Canvas (Paper Sheet) */}
        <div
          ref={canvasWrapperRef}
          className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-center"
        >
          <div
            ref={paperSheetRef}
            style={{ width: `${activePageWidth}px`, maxWidth: '100%' }}
            className={`relative group rounded-lg my-2 transition-[background-color,border-color,box-shadow,padding] duration-200 outline-none ${
              isZenMode
                ? 'bg-transparent border border-transparent shadow-none'
                : 'bg-[#ffffff] dark:bg-[#17191e] border border-[#e5e3dc] dark:border-[#282b33] shadow-xs'
            }`}
          >
            {/* Left Horizontal Resize Handle */}
            <div
              onMouseDown={e => handleStartResize(e, 'left')}
              onDoubleClick={handleResetWidth}
              className="absolute -left-2.5 top-0 bottom-0 w-5 cursor-ew-resize z-20 flex items-center justify-center select-none group/left-handle"
              title="Drag horizontally to adjust page width. Double-click to reset (768px)"
              aria-label="Adjust page width left"
            >
              <div
                className={`w-1 h-12 rounded-full transition-all duration-150 ${
                  isDraggingWidth
                    ? 'bg-[#2d6a4f] dark:bg-[#52b788] opacity-100'
                    : 'bg-black/10 dark:bg-white/10 opacity-0 group-hover/left-handle:opacity-100 group-hover:opacity-40 hover:bg-[#2d6a4f] dark:hover:bg-[#52b788]'
                }`}
              />
            </div>

            {/* Right Horizontal Resize Handle */}
            <div
              onMouseDown={e => handleStartResize(e, 'right')}
              onDoubleClick={handleResetWidth}
              className="absolute -right-2.5 top-0 bottom-0 w-5 cursor-ew-resize z-20 flex items-center justify-center select-none group/right-handle"
              title="Drag horizontally to adjust page width. Double-click to reset (768px)"
              aria-label="Adjust page width right"
            >
              <div
                className={`w-1 h-12 rounded-full transition-all duration-150 ${
                  isDraggingWidth
                    ? 'bg-[#2d6a4f] dark:bg-[#52b788] opacity-100'
                    : 'bg-black/10 dark:bg-white/10 opacity-0 group-hover/right-handle:opacity-100 group-hover:opacity-40 hover:bg-[#2d6a4f] dark:hover:bg-[#52b788]'
                }`}
              />
            </div>

            {/* Live Width Badge while Dragging */}
            {isDraggingWidth && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] font-mono bg-[#191b1f] dark:bg-[#eceef2] text-white dark:text-[#111215] shadow-md z-30 pointer-events-none select-none">
                {activePageWidth} px
              </div>
            )}

            {/* Rendered Mode View */}
            <div
              className={`${viewMode === 'rendered' ? 'block' : 'hidden'} px-6 sm:px-12 ${
                isZenMode ? 'py-6 sm:py-10' : 'py-8 sm:py-14'
              }`}
            >
              <EditorContent editor={editor} />
            </div>

            {/* Raw Markdown Source View */}
            <div className={viewMode === 'raw' ? 'block' : 'hidden'}>
              <RawMarkdownEditor
                value={initialContent}
                onChange={onChange}
                onSave={onSave}
                isZenMode={isZenMode}
                isActive={isActive && viewMode === 'raw'}
                onHistoryChange={setRawUndoRedo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
