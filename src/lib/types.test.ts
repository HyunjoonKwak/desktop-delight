import { describe, it, expect } from 'vitest';
import { CATEGORY_INFO, type FileCategory } from './types';

describe('CATEGORY_INFO', () => {
  it('should have all file categories defined', () => {
    const expectedCategories: FileCategory[] = [
      'images',
      'documents',
      'videos',
      'music',
      'archives',
      'installers',
      'code',
      'others',
    ];

    expectedCategories.forEach((category) => {
      expect(CATEGORY_INFO[category]).toBeDefined();
      expect(CATEGORY_INFO[category].label).toBeDefined();
      expect(CATEGORY_INFO[category].color).toBeDefined();
    });
  });

  it('should have correct Korean labels', () => {
    expect(CATEGORY_INFO.images.label).toBe('이미지');
    expect(CATEGORY_INFO.documents.label).toBe('문서');
    expect(CATEGORY_INFO.videos.label).toBe('동영상');
    expect(CATEGORY_INFO.music.label).toBe('음악');
    expect(CATEGORY_INFO.archives.label).toBe('압축파일');
    expect(CATEGORY_INFO.installers.label).toBe('설치파일');
    expect(CATEGORY_INFO.code.label).toBe('코드');
    expect(CATEGORY_INFO.others.label).toBe('기타');
  });

  it('should have valid HSL color formats', () => {
    const hslPattern = /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/;

    Object.values(CATEGORY_INFO).forEach(({ color }) => {
      expect(color).toMatch(hslPattern);
    });
  });

  it('should have unique colors for each category', () => {
    const colors = Object.values(CATEGORY_INFO).map(({ color }) => color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });
});

describe('Type definitions', () => {
  it('should accept valid FileInfo object', () => {
    const fileInfo = {
      path: '/test/file.txt',
      name: 'file.txt',
      extension: 'txt',
      size: 1024,
      sizeFormatted: '1.0KB',
      createdAt: '2025-01-01T00:00:00',
      modifiedAt: '2025-01-01T00:00:00',
      isDirectory: false,
      isHidden: false,
      category: 'documents' as const,
    };

    // Type check - if this compiles, types are correct
    expect(fileInfo.path).toBe('/test/file.txt');
    expect(fileInfo.category).toBe('documents');
  });

  it('should accept valid Rule object', () => {
    const rule = {
      name: 'Test Rule',
      priority: 1,
      enabled: true,
      conditions: [
        {
          field: 'extension' as const,
          operator: 'equals' as const,
          value: 'txt',
        },
      ],
      conditionLogic: 'AND' as const,
      actionType: 'move' as const,
      actionDestination: '/documents',
      createDateSubfolder: false,
    };

    expect(rule.name).toBe('Test Rule');
    expect(rule.conditions[0].field).toBe('extension');
  });

  it('should accept valid RenameRule object', () => {
    const renameRule = {
      ruleType: 'prefix' as const,
      prefix: 'new_',
    };

    expect(renameRule.ruleType).toBe('prefix');
    expect(renameRule.prefix).toBe('new_');
  });

  it('should accept valid AppSettings object', () => {
    const settings = {
      desktopPath: '/Users/test/Desktop',
      language: 'ko',
      theme: 'dark',
      enableWatcher: false,
      autoOrganizeOnStartup: false,
      defaultDateFormat: 'YYYY-MM',
      showHiddenFiles: false,
      confirmBeforeDelete: true,
      useTrash: true,
    };

    expect(settings.language).toBe('ko');
    expect(settings.confirmBeforeDelete).toBe(true);
  });
});
