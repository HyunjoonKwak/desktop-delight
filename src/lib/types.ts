// File types
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
  isDirectory: boolean;
  isHidden: boolean;
  category: FileCategory;
}

export type FileCategory =
  | 'images'
  | 'documents'
  | 'videos'
  | 'music'
  | 'archives'
  | 'installers'
  | 'code'
  | 'others';

// Settings types
export interface AppSettings {
  desktopPath: string;
  language: string;
  theme: string;
  enableWatcher: boolean;
  autoOrganizeOnStartup: boolean;
  defaultDateFormat: string;
  showHiddenFiles: boolean;
  confirmBeforeDelete: boolean;
  useTrash: boolean;
}

// History types
export interface HistoryItem {
  id: number;
  operationType: 'move' | 'copy' | 'delete' | 'rename' | 'organize';
  description: string;
  details?: string;
  filesAffected: number;
  isUndone: boolean;
  createdAt: string;
}

// File operation types
export type OverwriteStrategy = 'overwrite' | 'rename' | 'skip';

// Rule types
export interface Rule {
  id?: number;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  actionType: 'move' | 'copy' | 'rename' | 'delete';
  actionDestination?: string;
  actionRenamePattern?: string;
  createDateSubfolder: boolean;
}

export interface Condition {
  field: 'name' | 'extension' | 'size' | 'createdDate' | 'modifiedDate';
  operator:
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan'
    | 'matches';
  value: string;
}

export interface RuleMatch {
  file: FileInfo;
  rule: Rule;
  actionPreview: string;
}

export interface ExecuteRulesResult {
  success: boolean;
  executedCount: number;
  skippedCount: number;
  errors: string[];
}

// Rename types
export interface RenameRule {
  ruleType: // camelCase to match Rust serde
    | 'findReplace'
    | 'prefix'
    | 'suffix'
    | 'sequence'
    | 'date'
    | 'case'
    | 'regex';
  findText?: string;
  replaceText?: string;
  prefix?: string;
  suffix?: string;
  startNumber?: number;
  digitCount?: number;
  dateFormat?: string;
  dateSource?: 'created' | 'modified';
  caseType?: 'upper' | 'lower' | 'title';
  regexPattern?: string;
  regexReplace?: string;
}

export interface RenamePreview {
  originalPath: string;
  originalName: string;
  newName: string;
  hasConflict: boolean;
  conflictMessage?: string;
}

export interface RenameResult {
  success: boolean;
  renamedCount: number;
  failedCount: number;
  errors: string[];
}

// Organization types
export interface OrganizePreview {
  category: string;
  categoryLabel: string;
  files: FileInfo[];
  destinationFolder: string;
  fileCount: number;
}

export interface OrganizeOptions {
  createDateSubfolders: boolean;
  dateFormat: string;
  handleDuplicates: string; // "overwrite", "rename", "skip"
}

export interface OrganizeResult {
  success: boolean;
  filesMoved: number;
  filesSkipped: number;
  errors: string[];
  historyId: number;
}

// Analysis types
export interface FolderStats {
  path: string;
  totalSize: number;
  totalSizeFormatted: string;
  fileCount: number;
  folderCount: number;
  largestFile?: FileInfo;
  categoryBreakdown: Record<string, CategoryStats>;
}

export interface CategoryStats {
  count: number;
  totalSize: number;
  totalSizeFormatted: string;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  sizeFormatted: string;
  files: FileInfo[];
}

export interface FolderTreeNode {
  path: string;
  name: string;
  size: number;
  sizeFormatted: string;
  fileCount: number;
  children: FolderTreeNode[];
}

// Extension mapping types
export interface ExtensionMapping {
  extension: string;
  category: string;
  targetFolder: string;
}

// Folder compare types
export type FileStatus = 'only_in_source' | 'only_in_target' | 'identical' | 'different';

export interface CompareResult {
  relativePath: string;
  status: FileStatus;
  sourceFile?: FileInfo;
  targetFile?: FileInfo;
  sizeDiff: number;
}

export interface CompareSummary {
  sourcePath: string;
  targetPath: string;
  totalFiles: number;
  onlyInSource: number;
  onlyInTarget: number;
  identical: number;
  different: number;
  sourceTotalSize: number;
  targetTotalSize: number;
  results: CompareResult[];
}

export type MergeStrategy = 'skip_existing' | 'overwrite_all' | 'overwrite_newer' | 'overwrite_older' | 'rename';

export interface MergeOptions {
  strategy: MergeStrategy;
  deleteSourceAfter: boolean;
  includeOnlyInSource: boolean;
  includeDifferent: boolean;
}

export interface MergeResult {
  success: boolean;
  filesCopied: number;
  filesSkipped: number;
  filesOverwritten: number;
  bytesTransferred: number;
  errors: string[];
}

// Category display info
export const CATEGORY_INFO: Record<
  FileCategory,
  { label: string; color: string }
> = {
  images: { label: '이미지', color: 'hsl(340, 82%, 52%)' },
  documents: { label: '문서', color: 'hsl(207, 90%, 54%)' },
  videos: { label: '동영상', color: 'hsl(270, 70%, 55%)' },
  music: { label: '음악', color: 'hsl(160, 84%, 39%)' },
  archives: { label: '압축파일', color: 'hsl(35, 92%, 50%)' },
  installers: { label: '설치파일', color: 'hsl(0, 72%, 51%)' },
  code: { label: '코드', color: 'hsl(200, 70%, 50%)' },
  others: { label: '기타', color: 'hsl(220, 10%, 50%)' },
};
