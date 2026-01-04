import { create } from 'zustand';
import type { FileInfo } from '@/lib/types';

/**
 * File store state interface
 */
export interface FileStore {
  // State
  files: FileInfo[];
  selectedFiles: Set<string>;
  isLoading: boolean;
  currentPath: string;
  searchQuery: string;

  // Actions
  setFiles: (files: FileInfo[]) => void;
  addFile: (file: FileInfo) => void;
  removeFile: (path: string) => void;
  updateFile: (path: string, updates: Partial<FileInfo>) => void;
  
  toggleSelect: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedFiles: (paths: Set<string>) => void;
  
  setLoading: (loading: boolean) => void;
  setCurrentPath: (path: string) => void;
  setSearchQuery: (query: string) => void;
  
  reset: () => void;
}

const initialState = {
  files: [],
  selectedFiles: new Set<string>(),
  isLoading: false,
  currentPath: '',
  searchQuery: '',
};

/**
 * File store
 * 
 * Global state for file management including:
 * - File list
 * - File selection
 * - Loading state
 * - Current path
 * - Search query
 */
export const useFileStore = create<FileStore>((set, get) => ({
  ...initialState,

  // File actions
  setFiles: (files) => set({ files }),
  
  addFile: (file) => set((state) => ({
    files: [...state.files, file],
  })),
  
  removeFile: (path) => set((state) => ({
    files: state.files.filter((f) => f.path !== path),
    selectedFiles: new Set(
      Array.from(state.selectedFiles).filter((p) => p !== path)
    ),
  })),
  
  updateFile: (path, updates) => set((state) => ({
    files: state.files.map((f) =>
      f.path === path ? { ...f, ...updates } : f
    ),
  })),

  // Selection actions
  toggleSelect: (path) => set((state) => {
    const newSet = new Set(state.selectedFiles);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    return { selectedFiles: newSet };
  }),
  
  selectAll: () => set((state) => ({
    selectedFiles: new Set(state.files.map((f) => f.path)),
  })),
  
  clearSelection: () => set({
    selectedFiles: new Set(),
  }),
  
  setSelectedFiles: (paths) => set({
    selectedFiles: paths,
  }),

  // Other actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setCurrentPath: (path) => set({ currentPath: path }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  reset: () => set(initialState),
}));
