import { useState, useCallback } from 'react';
import { fileApi, isTauri } from '@/lib/tauri-api';
import type { FileInfo } from '@/lib/types';

export interface UseFileNavigationOptions {
  onError?: (error: unknown) => void;
  onNavigate?: (path: string) => void;
}

export interface UseFileNavigationReturn {
  currentPath: string;
  navigationHistory: string[];
  isLoading: boolean;
  folderContents: FileInfo[];
  navigateTo: (path: string, addToHistory?: boolean) => Promise<void>;
  goBack: () => void;
  goToParent: () => void;
  canGoBack: boolean;
  setFolderContents: React.Dispatch<React.SetStateAction<FileInfo[]>>;
  setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Custom hook for file navigation with history
 * 
 * Provides navigation functionality with history management,
 * consolidating duplicate logic from BatchRename, FolderManager, and DuplicateManager
 * 
 * @param options - Navigation options
 * @returns Navigation state and functions
 */
export function useFileNavigation(
  options: UseFileNavigationOptions = {}
): UseFileNavigationReturn {
  const { onError, onNavigate } = options;
  
  const [currentPath, setCurrentPath] = useState<string>('');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [folderContents, setFolderContents] = useState<FileInfo[]>([]);

  /**
   * Navigate to a folder
   */
  const navigateTo = useCallback(
    async (path: string, addToHistory: boolean = true) => {
      setIsLoading(true);
      
      try {
        if (!isTauri()) {
          // In non-Tauri environment, just update the path
          setCurrentPath(path);
          setFolderContents([]);
          return;
        }

        // Add current path to history if requested
        if (addToHistory && currentPath && currentPath !== path) {
          setNavigationHistory((prev) => [...prev, currentPath]);
        }

        // Fetch folder contents
        const files = await fileApi.fastListDirectory(path);
        setFolderContents(files);
        setCurrentPath(path);

        // Notify callback
        onNavigate?.(path);
      } catch (error) {
        console.error('[useFileNavigation] Failed to navigate:', error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPath, onError, onNavigate]
  );

  /**
   * Go back to previous folder in history
   */
  const goBack = useCallback(() => {
    if (navigationHistory.length === 0) return;

    const previousPath = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory((prev) => prev.slice(0, -1));

    // Navigate without adding to history
    navigateTo(previousPath, false);
  }, [navigationHistory, navigateTo]);

  /**
   * Go to parent folder
   */
  const goToParent = useCallback(async () => {
    if (!currentPath) return;

    try {
      // Get parent path from current path
      const pathParts = currentPath.split(/[/\\]/);
      
      // Remove empty parts and last part
      const filteredParts = pathParts.filter((p) => p.length > 0);
      
      if (filteredParts.length <= 1) {
        // Already at root, can't go up
        return;
      }

      // Reconstruct parent path
      filteredParts.pop(); // Remove last part
      
      let parentPath: string;
      if (currentPath.startsWith('/')) {
        // Unix-style path
        parentPath = '/' + filteredParts.join('/');
      } else {
        // Windows-style path
        parentPath = filteredParts.join('\\');
      }

      await navigateTo(parentPath, true);
    } catch (error) {
      console.error('[useFileNavigation] Failed to go to parent:', error);
      onError?.(error);
    }
  }, [currentPath, navigateTo, onError]);

  return {
    currentPath,
    navigationHistory,
    isLoading,
    folderContents,
    navigateTo,
    goBack,
    goToParent,
    canGoBack: navigationHistory.length > 0,
    setFolderContents,
    setCurrentPath,
  };
}
