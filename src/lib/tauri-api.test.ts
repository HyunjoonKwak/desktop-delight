import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTauri,
  formatFileSize,
  formatRelativeDate,
  fileApi,
  settingsApi,
  historyApi,
  organizerApi,
  analyzerApi,
  rulesApi,
  watcherApi,
} from './tauri-api';
import { invoke } from '@tauri-apps/api/core';

// Mock invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Helper to set/unset __TAURI__
const setTauriEnv = (enabled: boolean) => {
  if (enabled) {
    Object.defineProperty(window, '__TAURI__', {
      value: {},
      writable: true,
      configurable: true,
    });
  } else {
    // Remove the property completely so 'in' check returns false
    if ('__TAURI__' in window) {
      delete (window as Record<string, unknown>).__TAURI__;
    }
  }
};

describe('isTauri', () => {
  afterEach(() => {
    setTauriEnv(false);
  });

  it('should return false when not in Tauri environment', () => {
    setTauriEnv(false);
    expect(isTauri()).toBe(false);
  });

  it('should return true when in Tauri environment', () => {
    setTauriEnv(true);
    expect(isTauri()).toBe(true);
  });
});

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500B');
    expect(formatFileSize(0)).toBe('0B');
  });

  it('should format KB correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0KB');
    expect(formatFileSize(1536)).toBe('1.5KB');
    expect(formatFileSize(10240)).toBe('10.0KB');
  });

  it('should format MB correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.0MB');
    expect(formatFileSize(1572864)).toBe('1.5MB');
    expect(formatFileSize(10485760)).toBe('10.0MB');
  });

  it('should format GB correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1.0GB');
    expect(formatFileSize(1610612736)).toBe('1.5GB');
    expect(formatFileSize(10737418240)).toBe('10.0GB');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-26T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "오늘" for today', () => {
    expect(formatRelativeDate('2025-12-26T10:00:00')).toBe('오늘');
  });

  it('should return "어제" for yesterday', () => {
    expect(formatRelativeDate('2025-12-25T10:00:00')).toBe('어제');
  });

  it('should return "N일 전" for days within a week', () => {
    expect(formatRelativeDate('2025-12-23T10:00:00')).toBe('3일 전');
    expect(formatRelativeDate('2025-12-21T10:00:00')).toBe('5일 전');
  });

  it('should return "N주 전" for days within a month', () => {
    expect(formatRelativeDate('2025-12-12T10:00:00')).toBe('2주 전');
    expect(formatRelativeDate('2025-12-05T10:00:00')).toBe('3주 전');
  });

  it('should return "N개월 전" for days within a year', () => {
    expect(formatRelativeDate('2025-10-26T10:00:00')).toBe('2개월 전');
    expect(formatRelativeDate('2025-06-26T10:00:00')).toBe('6개월 전');
  });

  it('should return "N년 전" for more than a year', () => {
    expect(formatRelativeDate('2024-12-26T10:00:00')).toBe('1년 전');
    expect(formatRelativeDate('2022-12-26T10:00:00')).toBe('3년 전');
  });
});

describe('fileApi (non-Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('scanDesktop should return empty array', async () => {
    const result = await fileApi.scanDesktop();
    expect(result).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('scanDirectory should return empty array', async () => {
    const result = await fileApi.scanDirectory('/test/path');
    expect(result).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('getDesktopPath should return empty string', async () => {
    const result = await fileApi.getDesktopPath();
    expect(result).toBe('');
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('fileApi (Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setTauriEnv(false);
  });

  it('scanDesktop should call invoke', async () => {
    const mockFiles = [{ name: 'test.txt', path: '/test.txt' }];
    vi.mocked(invoke).mockResolvedValue(mockFiles);

    const result = await fileApi.scanDesktop();
    expect(invoke).toHaveBeenCalledWith('scan_desktop');
    expect(result).toEqual(mockFiles);
  });

  it('scanDirectory should call invoke with correct params', async () => {
    const mockFiles = [{ name: 'test.txt', path: '/test/test.txt' }];
    vi.mocked(invoke).mockResolvedValue(mockFiles);

    const result = await fileApi.scanDirectory('/test', true, true);
    expect(invoke).toHaveBeenCalledWith('scan_directory', {
      path: '/test',
      recursive: true,
      includeHidden: true,
    });
    expect(result).toEqual(mockFiles);
  });

  it('getDesktopPath should call invoke', async () => {
    vi.mocked(invoke).mockResolvedValue('/Users/test/Desktop');

    const result = await fileApi.getDesktopPath();
    expect(invoke).toHaveBeenCalledWith('get_desktop_path');
    expect(result).toBe('/Users/test/Desktop');
  });

  it('moveFile should call invoke with correct params', async () => {
    vi.mocked(invoke).mockResolvedValue('/dest/file.txt');

    const result = await fileApi.moveFile('/source/file.txt', '/dest/file.txt', 'overwrite');
    expect(invoke).toHaveBeenCalledWith('move_file', {
      source: '/source/file.txt',
      dest: '/dest/file.txt',
      overwrite: 'overwrite',
    });
    expect(result).toBe('/dest/file.txt');
  });

  it('deleteFile should call invoke with toTrash default true', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await fileApi.deleteFile('/test/file.txt');
    expect(invoke).toHaveBeenCalledWith('delete_file', {
      path: '/test/file.txt',
      toTrash: true,
    });
  });
});

describe('settingsApi', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('should return default settings in non-Tauri environment', async () => {
    const settings = await settingsApi.getSettings();
    expect(settings).toEqual({
      desktopPath: '',
      language: 'ko',
      theme: 'dark',
      enableWatcher: false,
      autoOrganizeOnStartup: false,
      defaultDateFormat: 'YYYY-MM',
      showHiddenFiles: false,
      confirmBeforeDelete: true,
      useTrash: true,
    });
  });

  it('should call invoke in Tauri environment', async () => {
    setTauriEnv(true);
    const mockSettings = { desktopPath: '/Desktop', language: 'ko', theme: 'dark' };
    vi.mocked(invoke).mockResolvedValue(mockSettings);

    const settings = await settingsApi.getSettings();
    expect(invoke).toHaveBeenCalledWith('get_settings');
    expect(settings).toEqual(mockSettings);
  });
});

describe('historyApi (non-Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('getHistory should return empty array', async () => {
    const result = await historyApi.getHistory();
    expect(result).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('historyApi (Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setTauriEnv(false);
  });

  it('getHistory should call invoke with default params', async () => {
    const mockHistory = [{ id: 1, operationType: 'move' }];
    vi.mocked(invoke).mockResolvedValue(mockHistory);

    const result = await historyApi.getHistory();
    expect(invoke).toHaveBeenCalledWith('get_history', { limit: 50, offset: 0 });
    expect(result).toEqual(mockHistory);
  });

  it('getHistory should call invoke with custom params', async () => {
    vi.mocked(invoke).mockResolvedValue([]);

    await historyApi.getHistory(100, 50);
    expect(invoke).toHaveBeenCalledWith('get_history', { limit: 100, offset: 50 });
  });

  it('undoOperation should call invoke with id', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await historyApi.undoOperation(5);
    expect(invoke).toHaveBeenCalledWith('undo_operation', { id: 5 });
  });

  it('clearHistory should call invoke', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await historyApi.clearHistory();
    expect(invoke).toHaveBeenCalledWith('clear_history');
  });
});

describe('organizerApi (non-Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('previewOrganization should return empty array', async () => {
    const result = await organizerApi.previewOrganization('/test');
    expect(result).toEqual([]);
  });
});

describe('analyzerApi (non-Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('findDuplicates should return empty array', async () => {
    const result = await analyzerApi.findDuplicates('/test');
    expect(result).toEqual([]);
  });

  it('findEmptyFolders should return empty array', async () => {
    const result = await analyzerApi.findEmptyFolders('/test');
    expect(result).toEqual([]);
  });

  it('findLargeFiles should return empty array', async () => {
    const result = await analyzerApi.findLargeFiles('/test', 100);
    expect(result).toEqual([]);
  });
});

describe('rulesApi (non-Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('getRules should return empty array', async () => {
    const result = await rulesApi.getRules();
    expect(result).toEqual([]);
  });

  it('previewRules should return empty array', async () => {
    const result = await rulesApi.previewRules('/test');
    expect(result).toEqual([]);
  });
});

describe('watcherApi (non-Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(false);
    vi.clearAllMocks();
  });

  it('isWatching should return false', async () => {
    const result = await watcherApi.isWatching();
    expect(result).toBe(false);
  });

  it('getWatchingPath should return null', async () => {
    const result = await watcherApi.getWatchingPath();
    expect(result).toBe(null);
  });

  it('startWatching should not call invoke', async () => {
    await watcherApi.startWatching('/test');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('stopWatching should not call invoke', async () => {
    await watcherApi.stopWatching();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('watcherApi (Tauri environment)', () => {
  beforeEach(() => {
    setTauriEnv(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    setTauriEnv(false);
  });

  it('startWatching should call invoke', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await watcherApi.startWatching('/test/path');
    expect(invoke).toHaveBeenCalledWith('start_watching', { path: '/test/path' });
  });

  it('stopWatching should call invoke', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await watcherApi.stopWatching();
    expect(invoke).toHaveBeenCalledWith('stop_watching');
  });

  it('isWatching should call invoke', async () => {
    vi.mocked(invoke).mockResolvedValue(true);

    const result = await watcherApi.isWatching();
    expect(invoke).toHaveBeenCalledWith('is_watching');
    expect(result).toBe(true);
  });

  it('getWatchingPath should call invoke', async () => {
    vi.mocked(invoke).mockResolvedValue('/watching/path');

    const result = await watcherApi.getWatchingPath();
    expect(invoke).toHaveBeenCalledWith('get_watching_path');
    expect(result).toBe('/watching/path');
  });
});
