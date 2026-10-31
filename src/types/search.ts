import { FileTreeNode } from './workspace';

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStartIndex: number;
  matchEndIndex: number;
  matchIndex?: number;
}

export interface FileSearchResult {
  fileId: string;
  fileName: string;
  filePath: string;
  node: FileTreeNode;
  matches: SearchMatch[];
}

export interface WorkspaceSearchOptions {
  matchCase: boolean;
}
