# Changelog

All notable changes to Desktop Organizer Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2026-01-04

### Added - Code Quality Foundation (Phase 1)
- Installed Zustand for state management
- Created shared constants (`categories.ts`, `icons.ts`, `errorMessages.ts`)
- Created custom hooks (`useFileNavigation`, `useFileSelection`)
- Created Zustand stores (`fileStore`, `uiStore`)
- Created error handling utility (`errorHandler.ts`)
- Removed duplicate code and interfaces

### Added - UI Improvements (Phase 2)
- **EmptyState Component**: 4 types (no-files, no-search-results, no-category-files, empty-folder)
- **Skeleton Loaders**: Smooth loading experience with FileCardSkeleton and SkeletonLoader
- **Error Handling**: User-friendly error messages with retry actions
- **Tooltips**: Helpful hints with keyboard shortcuts on action buttons

### Added - Usability Enhancements (Phase 3)
- **FileContextMenu**: Right-click context menu with quick actions
  - Actions: Preview, Rename, Move, Copy, Delete, Open in folder
  - Displays keyboard shortcuts and file info
- **Keyboard Shortcuts System**:
  - `useKeyboardShortcuts` hook with platform-aware modifiers
  - 10+ shortcuts (Ctrl+A, Ctrl+F, Ctrl+O, Ctrl+Z, Delete, Space, Ctrl+/, ?, Escape, Ctrl+R)
  - KeyboardShortcutsHelp dialog (triggered by Ctrl+/ or ?)
- **SelectionToolbar**: Multi-select toolbar with bulk actions
  - Shows selection count
  - Actions: Select all, Move, Copy, Delete, Clear
  - Shift+Click range selection
- **AdvancedSearch**: Comprehensive filtering system
  - Filter by categories, file size, modification date, extensions
  - Preset size filters (< 1MB, 1-10MB, etc.)
  - Active filter count badge
  - Expandable panel with animation

### Added - Advanced Features (Phase 4)
- **Drag and Drop**:
  - `useFileDragDrop` hook for state management
  - Drag files to category cards for organization
  - Visual feedback with drop target highlighting
  - Support for dragging multiple selected files
  - Native HTML5 drag and drop API
- **QuickLook Preview Modal**:
  - Press Space to preview selected file
  - Image preview support (file:// protocol)
  - File info display for non-previewable files
  - Beautiful modal with backdrop blur and spring animations
  - "Open in folder" quick action

### Improved
- **Code Organization**: Structured into constants, hooks, stores, utils
- **Type Safety**: Improved TypeScript types throughout
- **Performance**: Optimized re-renders with proper memoization
- **Accessibility**: Keyboard navigation, ARIA labels, focus management
- **Animations**: Smooth transitions with Framer Motion
- **Error Messages**: Centralized, user-friendly error handling

### Changed
- Migrated to Zustand for global state management
- Consolidated category configurations and icon mappings
- Improved file selection logic with custom hooks
- Enhanced navigation with history support

### Developer Experience
- Added VSCode tasks configuration
- Added VSCode workspace settings
- Added development scripts (lint:fix, type-check, format, clean)
- Updated CLAUDE.md with comprehensive documentation
- Updated README.md with feature list and shortcuts table

### Statistics
- **TypeScript Files**: 91 files
- **Components**: 50+ components
- **Custom Hooks**: 5 hooks
- **Bundle Size**: 661 KB (197 KB gzipped)
- **Commits**: 20 commits

## [1.9.2] - Previous Release

### Added
- Editable default rules with extension management

---

## Future Enhancements (Planned)

### Performance
- [ ] Code splitting for dynamic imports
- [ ] Lazy loading for heavy components
- [ ] Virtual scrolling for large file lists
- [ ] Web Worker for file processing

### Features
- [ ] Cloud backup integration
- [ ] File tagging system
- [ ] Custom themes
- [ ] Scheduled auto-organization
- [ ] File comparison tool
- [ ] Bulk file operations (merge, split)
- [ ] AI-powered file categorization

### UX
- [ ] Onboarding tour for first-time users
- [ ] Undo/Redo with better visualization
- [ ] File operation progress indicators
- [ ] Customizable keyboard shortcuts
- [ ] Multi-language support

### Developer
- [ ] Component documentation (Storybook)
- [ ] End-to-end tests (Playwright)
- [ ] Performance monitoring
- [ ] Bundle analysis tools
