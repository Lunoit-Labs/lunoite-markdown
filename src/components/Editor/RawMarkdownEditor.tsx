import React, { useRef, useEffect, useCallback, useMemo, useState, useLayoutEffect } from 'react';

interface HistoryItem {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface RawMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isZenMode: boolean;
  isActive?: boolean;
  onHistoryChange?: (state: {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
  }) => void;
}

export const RawMarkdownEditor: React.FC<RawMarkdownEditorProps> = ({
  value,
  onChange,
  onSave,
  isZenMode,
  isActive = true,
  onHistoryChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const [lineHeights, setLineHeights] = useState<number[]>([]);

  // Custom undo / redo history stack
  const historyRef = useRef<HistoryItem[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const lastInputTimeRef = useRef<number>(0);
  const lastInputTypeRef = useRef<'insert' | 'delete' | 'other' | null>(null);
  const isPerformingUndoRedoRef = useRef<boolean>(false);
  const [, setCanUndoState] = useState(false);
  const [, setCanRedoState] = useState(false);

  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  const notifyHistory = useCallback(() => {
    const canU = historyIndexRef.current > 0;
    const canR = historyIndexRef.current < historyRef.current.length - 1;
    setCanUndoState(canU);
    setCanRedoState(canR);
    onHistoryChange?.({
      canUndo: canU,
      canRedo: canR,
      undo: () => undoRef.current(),
      redo: () => redoRef.current(),
    });
  }, [onHistoryChange]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isPerformingUndoRedoRef.current = true;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    const target = historyRef.current[nextIndex];
    if (target) {
      onChange(target.value);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(target.selectionStart, target.selectionEnd);
        }
        isPerformingUndoRedoRef.current = false;
        notifyHistory();
      }, 0);
    } else {
      isPerformingUndoRedoRef.current = false;
      notifyHistory();
    }
  }, [onChange, notifyHistory]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isPerformingUndoRedoRef.current = true;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    const target = historyRef.current[nextIndex];
    if (target) {
      onChange(target.value);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(target.selectionStart, target.selectionEnd);
        }
        isPerformingUndoRedoRef.current = false;
        notifyHistory();
      }, 0);
    } else {
      isPerformingUndoRedoRef.current = false;
      notifyHistory();
    }
  }, [onChange, notifyHistory]);

  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  }, [undo, redo]);

  // Record a change into history
  const recordChange = useCallback(
    (newValue: string, selectionStart: number, selectionEnd: number, forceNew = false) => {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

      const now = Date.now();
      const currentItem = historyRef.current[historyIndexRef.current];
      const prevValue = currentItem ? currentItem.value : '';
      const timeDelta = now - lastInputTimeRef.current;
      const isDelete = newValue.length < prevValue.length;
      const isLengthDiffOne = Math.abs(newValue.length - prevValue.length) === 1;
      const isSpaceOrEnter =
        newValue.length > prevValue.length &&
        (newValue.slice(selectionStart - 1, selectionStart) === ' ' ||
          newValue.slice(selectionStart - 1, selectionStart) === '\n');

      const shouldGroup =
        !forceNew &&
        historyIndexRef.current > 0 &&
        timeDelta < 800 &&
        isLengthDiffOne &&
        lastInputTypeRef.current === (isDelete ? 'delete' : 'insert') &&
        !isSpaceOrEnter;

      if (shouldGroup) {
        historyRef.current[historyIndexRef.current] = {
          value: newValue,
          selectionStart,
          selectionEnd,
        };
      } else {
        historyRef.current.push({
          value: newValue,
          selectionStart,
          selectionEnd,
        });
        if (historyRef.current.length > 200) {
          historyRef.current.shift();
        }
        historyIndexRef.current = historyRef.current.length - 1;
      }

      lastInputTimeRef.current = now;
      lastInputTypeRef.current = isDelete ? 'delete' : 'insert';
      notifyHistory();
    },
    [notifyHistory]
  );

  // Sync external changes (initial load or switching from rendered view)
  useEffect(() => {
    if (isPerformingUndoRedoRef.current) return;
    if (historyRef.current.length === 0) {
      historyRef.current = [{ value, selectionStart: 0, selectionEnd: 0 }];
      historyIndexRef.current = 0;
      notifyHistory();
    } else if (historyRef.current[historyIndexRef.current]?.value !== value) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push({ value, selectionStart: 0, selectionEnd: 0 });
      if (historyRef.current.length > 200) {
        historyRef.current.shift();
      }
      historyIndexRef.current = historyRef.current.length - 1;
      notifyHistory();
    }
  }, [value, notifyHistory]);

  // Split lines
  const lines = useMemo(() => value.split('\n'), [value]);
  const linesCount = lines.length;

  // Auto-resize textarea to fit content so the outer document container handles scrolling
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Do not measure while hidden
    if (textarea.offsetParent === null && textarea.offsetHeight === 0) return;

    const scrollContainer = (textarea.closest('.editor-scroll-container') ||
      document.getElementById('editor-scroll-container')) as HTMLElement | null;
    const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;

    textarea.style.height = 'auto';
    // Add 40px bottom buffer so descenders and the last line of content are never cropped
    const newHeight = Math.max(480, textarea.scrollHeight + 40);
    textarea.style.height = `${newHeight}px`;

    // Measure line heights from the mirror for line numbers gutter alignment
    if (mirrorRef.current) {
      const children = Array.from(mirrorRef.current.children) as HTMLElement[];
      if (children.length > 0) {
        setLineHeights(children.map(c => c.clientHeight));
      }
    }

    // Preserve scroll container position to prevent browser clamping jump
    if (scrollContainer && scrollContainer.scrollTop !== prevScrollTop && prevScrollTop > 0) {
      scrollContainer.scrollTop = prevScrollTop;
    }
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, isActive, adjustHeight]);

  // Adjust on window resize and container width resize
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);
    const textarea = textareaRef.current;
    let observer: ResizeObserver | null = null;
    if (textarea && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        adjustHeight();
      });
      observer.observe(textarea);
    }
    return () => {
      window.removeEventListener('resize', adjustHeight);
      observer?.disconnect();
    };
  }, [adjustHeight]);

  // Handle Tab, Shift+Tab, Ctrl+S, Ctrl+Z, and Ctrl+Y shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S or Cmd+S: Save file
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave();
      return;
    }

    // Ctrl+Z or Cmd+Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z: Redo
    if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)
    ) {
      e.preventDefault();
      redo();
      return;
    }

    // Tab key indentation support
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const isShift = e.shiftKey;

      if (selectionStart === selectionEnd && !isShift) {
        // Single cursor: insert 2 spaces
        const nextValue =
          value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
        recordChange(nextValue, selectionStart + 2, selectionStart + 2, true);
        onChange(nextValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
              selectionStart + 2;
          }
        }, 0);
      } else {
        // Multi-line selection: indent or outdent lines
        const rawLines = value.split('\n');
        let currentPos = 0;
        let startLine = 0;
        let endLine = rawLines.length - 1;

        for (let i = 0; i < rawLines.length; i++) {
          const nextPos = currentPos + rawLines[i].length + 1;
          if (selectionStart >= currentPos && selectionStart < nextPos) {
            startLine = i;
          }
          if (selectionEnd >= currentPos && selectionEnd <= nextPos) {
            endLine = i;
            break;
          }
          currentPos = nextPos;
        }

        const updatedLines = [...rawLines];
        let offsetChange = 0;

        for (let i = startLine; i <= endLine; i++) {
          if (isShift) {
            // Outdent: remove up to 2 leading spaces
            if (updatedLines[i].startsWith('  ')) {
              updatedLines[i] = updatedLines[i].substring(2);
              offsetChange -= 2;
            } else if (updatedLines[i].startsWith(' ')) {
              updatedLines[i] = updatedLines[i].substring(1);
              offsetChange -= 1;
            }
          } else {
            // Indent: add 2 leading spaces
            updatedLines[i] = '  ' + updatedLines[i];
            offsetChange += 2;
          }
        }

        const nextValue = updatedLines.join('\n');
        const nextSelEnd = Math.max(selectionStart, selectionEnd + offsetChange);
        recordChange(nextValue, selectionStart, nextSelEnd, true);
        onChange(nextValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = selectionStart;
            textareaRef.current.selectionEnd = nextSelEnd;
          }
        }, 0);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    const { selectionStart, selectionEnd } = e.target;
    recordChange(nextVal, selectionStart, selectionEnd, false);
    onChange(nextVal);
  };

  // Auto-focus when tab is active
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [isActive]);

  return (
    <div className={`w-full flex ${isZenMode ? 'py-6 sm:py-10' : 'py-8 sm:py-14 pb-12'}`}>
      {/* Line Numbers Gutter */}
      <div
        aria-hidden="true"
        className="w-12 sm:w-14 shrink-0 pr-3 text-right font-mono text-xs sm:text-[13px] text-[#59606d] dark:text-[#9ba2b0] select-none border-r border-[#e5e3dc]/70 dark:border-[#282b33]/70 bg-[#f8f7f4]/40 dark:bg-[#111215]/30"
      >
        {Array.from({ length: linesCount }, (_, i) => (
          <div
            key={i + 1}
            style={{ height: lineHeights[i] ? `${lineHeights[i]}px` : '24px' }}
            className="flex items-start justify-end leading-6"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Raw Markdown Textarea & Measurement Mirror */}
      <div className="flex-1 min-w-0 pl-4 sm:pl-6 pr-4 sm:pr-8">
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Raw Markdown source editor"
            placeholder="# Start typing raw Markdown..."
            className="w-full resize-none overflow-y-hidden overflow-x-auto bg-transparent font-mono text-xs sm:text-[13px] leading-6 text-[#191b1f] dark:text-[#eceef2] placeholder:text-[#59606d]/50 dark:placeholder:text-[#9ba2b0]/50 outline-none border-none whitespace-pre-wrap [overflow-wrap:anywhere] break-words caret-[#2d6a4f] dark:caret-[#52b788] min-h-[480px] p-0 pb-8 m-0 block"
          />

          {/* Hidden Mirror for exact line-height measurement when lines soft-wrap */}
          <div
            ref={mirrorRef}
            aria-hidden="true"
            className="invisible absolute top-0 left-0 right-0 -z-50 pointer-events-none font-mono text-xs sm:text-[13px] leading-6 whitespace-pre-wrap [overflow-wrap:anywhere] break-words p-0 pb-8 m-0"
          >
            {lines.map((line, idx) => (
              <div key={idx}>{line || '\u00A0'}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
