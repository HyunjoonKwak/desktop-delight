import { invoke } from '@tauri-apps/api/core';
import type {
  FileInfo,
  AppSettings,
  HistoryItem,
  OverwriteStrategy,
  OrganizePreview,
  OrganizeOptions,
  OrganizeResult,
  RenameRule,
  RenamePreview,
  RenameResult,
  FolderStats,
  DuplicateGroup,
  FolderTreeNode,
  Rule,
  RuleMatch,
  ExecuteRulesResult,
} from './types';

// Check if running in Tauri environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// File operations API
export const fileApi = {
  scanDesktop: async (): Promise<FileInfo[]> => {
    if (!isTauri()) return [];
    return invoke<FileInfo[]>('scan_desktop');
  },

  scanDirectory: async (
    path: string,
    recursive: boolean = false,
    includeHidden: boolean = false
  ): Promise<FileInfo[]> => {
    if (!isTauri()) return [];
    return invoke<FileInfo[]>('scan_directory', {
      path,
      recursive,
      includeHidden,
    });
  },

  getFileInfo: async (path: string): Promise<FileInfo> => {
    return invoke<FileInfo>('get_file_info', { path });
  },

  getDesktopPath: async (): Promise<string> => {
    if (!isTauri()) return '';
    return invoke<string>('get_desktop_path');
  },

  moveFile: async (
    source: string,
    dest: string,
    overwrite: OverwriteStrategy = 'rename'
  ): Promise<string> => {
    return invoke<string>('move_file', { source, dest, overwrite });
  },

  copyFile: async (
    source: string,
    dest: string,
    overwrite: OverwriteStrategy = 'rename'
  ): Promise<string> => {
    return invoke<string>('copy_file', { source, dest, overwrite });
  },

  deleteFile: async (path: string, toTrash: boolean = true): Promise<void> => {
    return invoke<void>('delete_file', { path, toTrash });
  },

  renameFile: async (path: string, newName: string): Promise<string> => {
    return invoke<string>('rename_file', { path, newName });
  },

  createFolder: async (path: string): Promise<void> => {
    return invoke<void>('create_folder', { path });
  },
};

// Settings API
export const settingsApi = {
  getSettings: async (): Promise<AppSettings> => {
    if (!isTauri()) {
      // Return default settings for web development
      return {
        desktopPath: '',
        language: 'ko',
        theme: 'dark',
        enableWatcher: false,
        autoOrganizeOnStartup: false,
        defaultDateFormat: 'YYYY-MM',
        showHiddenFiles: false,
        confirmBeforeDelete: true,
        useTrash: true,
      };
    }
    return invoke<AppSettings>('get_settings');
  },

  updateSettings: async (
    settings: Partial<Record<string, string>>
  ): Promise<AppSettings> => {
    return invoke<AppSettings>('update_settings', { settings });
  },
};

// Organizer API
export const organizerApi = {
  previewOrganization: async (sourcePath: string): Promise<OrganizePreview[]> => {
    if (!isTauri()) return [];
    return invoke<OrganizePreview[]>('preview_organization', { sourcePath });
  },

  executeOrganization: async (
    sourcePath: string,
    options: OrganizeOptions
  ): Promise<OrganizeResult> => {
    return invoke<OrganizeResult>('execute_organization', { sourcePath, options });
  },
};

// Renamer API
export const renamerApi = {
  previewRename: async (
    filePaths: string[],
    rules: RenameRule[]
  ): Promise<RenamePreview[]> => {
    if (!isTauri()) return [];
    return invoke<RenamePreview[]>('preview_rename', { filePaths, rules });
  },

  executeRename: async (
    filePaths: string[],
    rules: RenameRule[]
  ): Promise<RenameResult> => {
    return invoke<RenameResult>('execute_rename', { filePaths, rules });
  },
};

// History API
export const historyApi = {
  getHistory: async (
    limit: number = 50,
    offset: number = 0
  ): Promise<HistoryItem[]> => {
    if (!isTauri()) return [];
    return invoke<HistoryItem[]>('get_history', { limit, offset });
  },

  undoOperation: async (id: number): Promise<void> => {
    return invoke<void>('undo_operation', { id });
  },

  clearHistory: async (): Promise<void> => {
    return invoke<void>('clear_history');
  },
};

// Analyzer API
export const analyzerApi = {
  analyzeFolder: async (path: string): Promise<FolderStats> => {
    return invoke<FolderStats>('analyze_folder', { path });
  },

  findDuplicates: async (path: string): Promise<DuplicateGroup[]> => {
    if (!isTauri()) return [];
    return invoke<DuplicateGroup[]>('find_duplicates', { path });
  },

  findEmptyFolders: async (path: string): Promise<string[]> => {
    if (!isTauri()) return [];
    return invoke<string[]>('find_empty_folders', { path });
  },

  findLargeFiles: async (path: string, thresholdMb: number): Promise<FileInfo[]> => {
    if (!isTauri()) return [];
    return invoke<FileInfo[]>('find_large_files', { path, thresholdMb });
  },

  getFolderTree: async (path: string, maxDepth: number = 3): Promise<FolderTreeNode> => {
    return invoke<FolderTreeNode>('get_folder_tree', { path, maxDepth });
  },
};

// Rules API
export const rulesApi = {
  getRules: async (): Promise<Rule[]> => {
    if (!isTauri()) return [];
    return invoke<Rule[]>('get_rules');
  },

  saveRule: async (rule: Rule): Promise<Rule> => {
    return invoke<Rule>('save_rule', { rule });
  },

  deleteRule: async (id: number): Promise<void> => {
    return invoke<void>('delete_rule', { id });
  },

  previewRules: async (sourcePath: string): Promise<RuleMatch[]> => {
    if (!isTauri()) return [];
    return invoke<RuleMatch[]>('preview_rules', { sourcePath });
  },

  executeRules: async (sourcePath: string): Promise<ExecuteRulesResult> => {
    return invoke<ExecuteRulesResult>('execute_rules', { sourcePath });
  },
};

// Utility function to format file size
export const formatFileSize = (bytes: number): string => {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)}GB`;
  } else if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)}MB`;
  } else if (bytes >= KB) {
    return `${(bytes / KB).toFixed(1)}KB`;
  } else {
    return `${bytes}B`;
  }
};

// Updater API
export const updaterApi = {
  checkForUpdates: async (): Promise<{ available: boolean; version?: string }> => {
    if (!isTauri()) return { available: false };
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        return { available: true, version: update.version };
      }
      return { available: false };
    } catch (err) {
      console.error('Failed to check for updates:', err);
      return { available: false };
    }
  },

  downloadAndInstall: async (): Promise<void> => {
    if (!isTauri()) return;
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      }
    } catch (err) {
      console.error('Failed to download and install update:', err);
      throw err;
    }
  },
};

// Watcher API
export const watcherApi = {
  startWatching: async (path: string): Promise<void> => {
    if (!isTauri()) return;
    return invoke<void>('start_watching', { path });
  },

  stopWatching: async (): Promise<void> => {
    if (!isTauri()) return;
    return invoke<void>('stop_watching');
  },

  isWatching: async (): Promise<boolean> => {
    if (!isTauri()) return false;
    return invoke<boolean>('is_watching');
  },

  getWatchingPath: async (): Promise<string | null> => {
    if (!isTauri()) return null;
    return invoke<string | null>('get_watching_path');
  },
};

// Backup types
export interface BackupResult {
  backup_path: string;
  files_count: number;
  total_size: number;
}

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  file_count: number;
  created_at: string;
}

// Backup API
export const backupApi = {
  backupDesktop: async (backupLocation?: string): Promise<BackupResult> => {
    if (!isTauri()) {
      throw new Error('Backup is only available in desktop app');
    }
    return invoke<BackupResult>('backup_desktop', { backupLocation });
  },

  listBackups: async (): Promise<BackupInfo[]> => {
    if (!isTauri()) return [];
    return invoke<BackupInfo[]>('list_backups');
  },

  restoreBackup: async (backupPath: string): Promise<number> => {
    if (!isTauri()) {
      throw new Error('Restore is only available in desktop app');
    }
    return invoke<number>('restore_backup', { backupPath });
  },

  deleteBackup: async (backupPath: string): Promise<void> => {
    if (!isTauri()) return;
    return invoke<void>('delete_backup', { backupPath });
  },
};

// Utility function to format relative date
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '오늘';
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}주 전`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}개월 전`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}년 전`;
  }
};
