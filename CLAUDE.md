# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (port 1420)
npm run tauri dev        # Start Tauri development mode
npm run tauri build      # Production build (.msi/.dmg)
npm run build            # Vite production build only
npm run lint             # Run ESLint
```

## Architecture

Desktop Organizer Pro is a cross-platform (Windows/macOS) desktop file organizer built with:
- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Framer Motion
- **Backend**: Tauri v2 (Rust)
- **Database**: SQLite (via rusqlite)

### Project Structure

```
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── ui/               # shadcn/ui primitives (40+ components)
│   │   ├── RuleManagement/   # Rule management components
│   │   ├── DesktopView.tsx   # Main desktop organizer (w/ drag & drop)
│   │   ├── BatchRename.tsx   # Bulk rename feature
│   │   ├── FolderManager.tsx # Folder tree & analysis
│   │   ├── FileContextMenu.tsx    # Right-click context menu
│   │   ├── KeyboardShortcutsHelp.tsx  # Shortcuts help dialog
│   │   ├── SelectionToolbar.tsx   # Multi-select toolbar
│   │   ├── AdvancedSearch.tsx     # Advanced filtering
│   │   ├── QuickLookModal.tsx     # File preview modal
│   │   ├── EmptyState.tsx         # Empty state placeholders
│   │   ├── SkeletonLoader.tsx     # Loading skeletons
│   │   └── FileCardSkeleton.tsx   # File card skeleton
│   ├── hooks/                # Custom React hooks
│   │   ├── useKeyboardShortcuts.ts  # Keyboard shortcut system
│   │   ├── useFileDragDrop.ts       # Drag & drop state
│   │   ├── useFileSelection.ts      # File selection logic
│   │   ├── useFileNavigation.ts     # Navigation with history
│   │   └── use-toast.ts             # Toast notifications
│   ├── constants/            # Shared constants
│   │   ├── categories.ts     # Category configs & extensions
│   │   ├── icons.ts          # Icon mappings
│   │   └── errorMessages.ts  # Error message definitions
│   ├── utils/                # Utility functions
│   │   └── errorHandler.ts   # Centralized error handling
│   ├── lib/
│   │   ├── tauri-api.ts      # Tauri IPC command wrappers
│   │   ├── types.ts          # Shared TypeScript types
│   │   └── utils.ts          # Helper functions
│   └── stores/               # Zustand state management
│       ├── fileStore.ts      # File & selection state
│       └── uiStore.ts        # UI state (tabs, modals, view mode)
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri IPC commands
│   │   ├── database/         # SQLite operations
│   │   └── services/         # Business logic
│   └── Cargo.toml
└── package.json
```

### Key Patterns

- **State Management**: Zustand for global state, local useState for component state
- **IPC**: Tauri commands invoked via `@tauri-apps/api/core`
- **File Operations**: All file ops go through Rust backend (move, copy, delete, rename)
- **History/Undo**: Operations recorded in SQLite with undo data
- **Styling**: Tailwind CSS + CSS variables (HSL), dark mode default
- **Path Alias**: `@/` maps to `src/`
- **Code Organization**: Shared constants in `src/constants/`, custom hooks in `src/hooks/`, utilities in `src/utils/`
- **Error Handling**: Centralized via `errorHandler.ts` with user-friendly messages
- **Animations**: Framer Motion for smooth transitions and interactions
- **Accessibility**: Keyboard shortcuts, ARIA labels, focus management

### Frontend Views

| View | File | Description |
|------|------|-------------|
| Desktop | `DesktopView.tsx` | Scan/classify/organize desktop files |
| Rename | `BatchRename.tsx` | Bulk file renaming with preview |
| Extension | `ExtensionSort.tsx` | Organize by extension/category |
| Folder | `FolderManager.tsx` | Tree view, duplicates, analysis |

### Key Features

#### Usability
- **Right-click Context Menu**: Quick actions on files (Preview, Rename, Move, Copy, Delete, Open in folder)
- **Keyboard Shortcuts**: 10+ shortcuts for common actions (Ctrl+A, Ctrl+F, Space, etc.)
  - View all shortcuts with `Ctrl+/` or `?`
  - Platform-aware (⌘ on Mac, Ctrl on Windows)
- **Multi-Select**: Shift+Click for range selection, checkbox selection
  - SelectionToolbar appears with bulk actions
- **Advanced Search**: Filter by category, size, date, extension
  - Expandable panel with preset filters
  - Active filter count badge
- **Drag & Drop**: Drag files to category cards to organize
  - Visual feedback with drop target highlighting
  - Drag multiple selected files at once
- **QuickLook Preview**: Press Space to preview selected file
  - Image preview support
  - File info for other types

#### UI/UX Improvements
- **Empty States**: Contextual messages for no files, no results, etc.
- **Skeleton Loaders**: Smooth loading experience
- **Error Handling**: User-friendly error messages with retry actions
- **Tooltips**: Helpful hints with keyboard shortcuts
- **Animations**: Framer Motion for polished interactions

### Rust Backend Modules

| Module | Purpose |
|--------|---------|
| `commands/scanner.rs` | Directory scanning |
| `commands/file_ops.rs` | Move/copy/delete/rename |
| `commands/organizer.rs` | Classification & organization |
| `commands/renamer.rs` | Batch rename operations |
| `commands/analyzer.rs` | Folder analysis, duplicates |
| `database/` | SQLite: rules, history, settings |
| `services/classifier.rs` | Extension-based file classification |
| `services/rule_engine.rs` | Rule condition/action evaluation |

### Database Tables

- `settings` - App configuration
- `rules` - Organization rules (conditions + actions)
- `history` - Operation log with undo data
- `extension_mappings` - Extension → category mapping
- `exclusions` - Patterns to skip during organization

### UI Language

All UI text is in Korean.
