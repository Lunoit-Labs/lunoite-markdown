import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';

export const SearchHighlightPluginKey = new PluginKey('searchHighlight');

export interface SearchMatchRange {
  from: number;
  to: number;
}

export interface SearchHighlightStorage {
  searchTerm: string;
  matchCase: boolean;
  activeIndex: number;
  matches: SearchMatchRange[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchTerm: (term: string, matchCase?: boolean) => ReturnType;
      clearSearchTerm: () => ReturnType;
      setActiveMatchIndex: (index: number) => ReturnType;
      nextMatch: () => ReturnType;
      previousMatch: () => ReturnType;
      jumpToMatch: (
        query: string,
        matchCase?: boolean,
        targetMatchIndex?: number,
        targetLineSnippet?: string
      ) => ReturnType;
    };
  }
}

/**
 * Searches the ProseMirror document tree for occurrences of searchTerm.
 */
export function findMatches(
  doc: ProsemirrorNode,
  searchTerm: string,
  matchCase: boolean
): SearchMatchRange[] {
  if (!searchTerm || !searchTerm.trim()) return [];

  const matches: SearchMatchRange[] = [];
  const target = matchCase ? searchTerm : searchTerm.toLowerCase();

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = matchCase ? node.text : node.text.toLowerCase();
      let startIndex = 0;
      while (startIndex < text.length) {
        const idx = text.indexOf(target, startIndex);
        if (idx === -1) break;

        matches.push({
          from: pos + idx,
          to: pos + idx + target.length,
        });

        startIndex = idx + target.length;
      }
    }
  });

  return matches;
}

/**
 * Creates inline decorations for all search matches.
 */
export function createDecorations(
  doc: ProsemirrorNode,
  matches: SearchMatchRange[],
  activeIndex: number
): DecorationSet {
  if (!matches || matches.length === 0) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const isActive = i === activeIndex;
    decorations.push(
      Decoration.inline(match.from, match.to, {
        class: isActive
          ? 'search-match search-match-active'
          : 'search-match',
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

/**
 * Scrolls the active search match element (.search-match-active) into the center of the viewport.
 * Automatically retries up to maxRetries times to account for async DOM mounting.
 */
export function scrollToActiveMatch(maxRetries = 10, intervalMs = 40): void {
  if (typeof window === 'undefined') return;

  let attempts = maxRetries;

  const performScroll = () => {
    const el = document.querySelector('.search-match-active') as HTMLElement | null;
    const container =
      (el?.closest('.editor-scroll-container') as HTMLElement | null) ||
      document.getElementById('editor-scroll-container') ||
      (document.querySelector('.ProseMirror')?.parentElement as HTMLElement | null);

    if (el) {
      // 1. Native scrollIntoView with vertical center alignment
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // 2. Direct container scroll adjustment as guaranteed centering
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const currentScrollTop = container.scrollTop;
        const relativeTop = elRect.top - containerRect.top;
        const targetScrollTop =
          currentScrollTop + relativeTop - container.clientHeight / 2 + elRect.height / 2;

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      }

      // Re-verify after a few frames in case layout shifts after rendering
      if (attempts > 5) {
        attempts = 3;
        setTimeout(performScroll, intervalMs);
      }
      return;
    }

    if (attempts > 0) {
      attempts--;
      setTimeout(performScroll, intervalMs);
    }
  };

  requestAnimationFrame(() => performScroll());
}

export const SearchHighlightExtension = Extension.create<object, SearchHighlightStorage>({
  name: 'searchHighlight',

  addStorage() {
    return {
      searchTerm: '',
      matchCase: false,
      activeIndex: 0,
      matches: [],
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string, matchCase = false) =>
        ({ editor, tr, dispatch }) => {
          if (this.storage.searchTerm === searchTerm && this.storage.matchCase === matchCase) {
            return true;
          }

          this.storage.searchTerm = searchTerm;
          this.storage.matchCase = matchCase;
          this.storage.activeIndex = 0;
          this.storage.matches = findMatches(editor.state.doc, searchTerm, matchCase);

          if (dispatch) {
            tr.setMeta(SearchHighlightPluginKey, { searchTerm, matchCase });
          }
          return true;
        },

      clearSearchTerm:
        () =>
        ({ tr, dispatch }) => {
          this.storage.searchTerm = '';
          this.storage.activeIndex = 0;
          this.storage.matches = [];

          if (dispatch) {
            tr.setMeta(SearchHighlightPluginKey, { clear: true });
          }
          return true;
        },

      setActiveMatchIndex:
        (index: number) =>
        ({ tr, dispatch }) => {
          const matches = this.storage.matches;
          if (matches.length === 0) return false;

          const safeIndex = ((index % matches.length) + matches.length) % matches.length;
          this.storage.activeIndex = safeIndex;
          const target = matches[safeIndex];

          if (dispatch) {
            tr.setMeta(SearchHighlightPluginKey, { activeIndex: safeIndex });
            tr.setSelection(TextSelection.create(tr.doc, target.from, target.to));
            tr.scrollIntoView();
          }
          return true;
        },

      nextMatch:
        () =>
        ({ commands }) => {
          const current = this.storage.activeIndex;
          const res = commands.setActiveMatchIndex(current + 1);
          scrollToActiveMatch();
          return res;
        },

      previousMatch:
        () =>
        ({ commands }) => {
          const current = this.storage.activeIndex;
          const res = commands.setActiveMatchIndex(current - 1);
          scrollToActiveMatch();
          return res;
        },

      jumpToMatch:
        (
          query: string,
          matchCase = false,
          targetMatchIndex?: number,
          targetLineSnippet?: string
        ) =>
        ({ editor, tr, dispatch }) => {
          this.storage.searchTerm = query;
          this.storage.matchCase = matchCase;
          const matches = findMatches(editor.state.doc, query, matchCase);
          this.storage.matches = matches;
          if (matches.length === 0) return false;

          let targetIndex = 0;

          // Priority 1: Exact ordinal match index in document from search results
          if (
            targetMatchIndex !== undefined &&
            targetMatchIndex >= 0 &&
            targetMatchIndex < matches.length
          ) {
            targetIndex = targetMatchIndex;
          } else if (targetLineSnippet && matches.length > 1) {
            // Priority 2: Fuzzy snippet matching fallback
            const snippetWords = targetLineSnippet
              .replace(/[#*_~`>[\]()|\\+=\-]/g, ' ')
              .split(/\s+/)
              .map(w => w.trim().toLowerCase())
              .filter(w => w.length > 2);

            let bestScore = 0;
            let bestIndex = -1;

            for (let i = 0; i < matches.length; i++) {
              const m = matches[i];
              const surrounding = editor.state.doc
                .textBetween(
                  Math.max(0, m.from - 120),
                  Math.min(editor.state.doc.content.size, m.to + 120),
                  ' '
                )
                .toLowerCase();

              let score = 0;
              for (const word of snippetWords) {
                if (surrounding.includes(word)) {
                  score++;
                }
              }

              if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
              }
            }

            if (bestIndex !== -1 && bestScore > 0) {
              targetIndex = bestIndex;
            }
          }

          this.storage.activeIndex = targetIndex;
          const target = matches[targetIndex];

          if (dispatch) {
            tr.setMeta(SearchHighlightPluginKey, {
              searchTerm: query,
              matchCase,
              activeIndex: targetIndex,
            });
            tr.setSelection(TextSelection.create(tr.doc, target.from, target.to));
          }

          scrollToActiveMatch();
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: SearchHighlightPluginKey,
        state: {
          init(_, state) {
            const term = extension.storage.searchTerm;
            const matchCase = extension.storage.matchCase;
            const matches = findMatches(state.doc, term, matchCase);
            extension.storage.matches = matches;
            return createDecorations(state.doc, matches, extension.storage.activeIndex);
          },
          apply(tr, oldSet, _oldState, newState) {
            const meta = tr.getMeta(SearchHighlightPluginKey);
            if (tr.docChanged || meta) {
              const term =
                meta?.searchTerm !== undefined ? meta.searchTerm : extension.storage.searchTerm;
              const matchCase =
                meta?.matchCase !== undefined ? meta.matchCase : extension.storage.matchCase;
              const activeIndex =
                meta?.activeIndex !== undefined ? meta.activeIndex : extension.storage.activeIndex;
              const matches = findMatches(newState.doc, term, matchCase);
              extension.storage.matches = matches;
              extension.storage.activeIndex = activeIndex;
              return createDecorations(newState.doc, matches, activeIndex);
            }
            return oldSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
