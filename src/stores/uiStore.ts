import { create } from 'zustand';

/**
 * UI store state interface
 */
export interface UIStore {
  // State
  activeTab: string;
  isHistoryOpen: boolean;
  isRulesModalOpen: boolean;
  isPreviewModalOpen: boolean;
  isBackupOpen: boolean;
  viewMode: 'grid' | 'list';
  sidebarCollapsed: boolean;

  // Actions
  setActiveTab: (tab: string) => void;
  toggleHistory: () => void;
  openHistory: () => void;
  closeHistory: () => void;
  toggleRulesModal: () => void;
  openRulesModal: () => void;
  closeRulesModal: () => void;
  togglePreviewModal: () => void;
  openPreviewModal: () => void;
  closePreviewModal: () => void;
  toggleBackup: () => void;
  openBackup: () => void;
  closeBackup: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleViewMode: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  reset: () => void;
}

const initialState = {
  activeTab: 'desktop',
  isHistoryOpen: false,
  isRulesModalOpen: false,
  isPreviewModalOpen: false,
  isBackupOpen: false,
  viewMode: 'grid' as const,
  sidebarCollapsed: false,
};

/**
 * UI store
 * 
 * Global state for UI-related state including:
 * - Active tab
 * - Modal states (history, rules, preview, backup)
 * - View mode (grid/list)
 * - Sidebar state
 */
export const useUIStore = create<UIStore>((set) => ({
  ...initialState,

  // Tab actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  // History modal actions
  toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),
  openHistory: () => set({ isHistoryOpen: true }),
  closeHistory: () => set({ isHistoryOpen: false }),

  // Rules modal actions
  toggleRulesModal: () => set((state) => ({ isRulesModalOpen: !state.isRulesModalOpen })),
  openRulesModal: () => set({ isRulesModalOpen: true }),
  closeRulesModal: () => set({ isRulesModalOpen: false }),

  // Preview modal actions
  togglePreviewModal: () => set((state) => ({ isPreviewModalOpen: !state.isPreviewModalOpen })),
  openPreviewModal: () => set({ isPreviewModalOpen: true }),
  closePreviewModal: () => set({ isPreviewModalOpen: false }),

  // Backup modal actions
  toggleBackup: () => set((state) => ({ isBackupOpen: !state.isBackupOpen })),
  openBackup: () => set({ isBackupOpen: true }),
  closeBackup: () => set({ isBackupOpen: false }),

  // View mode actions
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () => set((state) => ({
    viewMode: state.viewMode === 'grid' ? 'list' : 'grid',
  })),

  // Sidebar actions
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Reset
  reset: () => set(initialState),
}));
