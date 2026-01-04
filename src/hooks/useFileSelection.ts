import { useState, useCallback } from 'react';
import type { FileInfo } from '@/lib/types';

export interface UseFileSelectionReturn {
  selectedFiles: Set<string>;
  toggleSelect: (path: string) => void;
  selectAll: (files: FileInfo[]) => void;
  clearSelection: () => void;
  selectRange: (startPath: string, endPath: string, files: FileInfo[]) => void;
  isSelected: (path: string) => boolean;
  selectedCount: number;
}

/**
 * Custom hook for file selection management
 * 
 * Provides file selection functionality with support for:
 * - Single selection (toggle)
 * - Multi-selection (Ctrl/Cmd)
 * - Range selection (Shift)
 * - Select all / Clear all
 * 
 * @returns Selection state and functions
 */
export function useFileSelection(): UseFileSelectionReturn {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  /**
   * Toggle selection of a single file
   */
  const toggleSelect = useCallback((path: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all files
   */
  const selectAll = useCallback((files: FileInfo[]) => {
    const allPaths = files.map((f) => f.path);
    setSelectedFiles(new Set(allPaths));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  /**
   * Select a range of files (for Shift+Click)
   */
  const selectRange = useCallback(
    (startPath: string, endPath: string, files: FileInfo[]) => {
      const startIndex = files.findIndex((f) => f.path === startPath);
      const endIndex = files.findIndex((f) => f.path === endPath);

      if (startIndex === -1 || endIndex === -1) {
        return;
      }

      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);

      const rangePaths = files.slice(start, end + 1).map((f) => f.path);

      setSelectedFiles((prev) => {
        const newSet = new Set(prev);
        rangePaths.forEach((path) => newSet.add(path));
        return newSet;
      });
    },
    []
  );

  /**
   * Check if a file is selected
   */
  const isSelected = useCallback(
    (path: string) => {
      return selectedFiles.has(path);
    },
    [selectedFiles]
  );

  return {
    selectedFiles,
    toggleSelect,
    selectAll,
    clearSelection,
    selectRange,
    isSelected,
    selectedCount: selectedFiles.size,
  };
}
