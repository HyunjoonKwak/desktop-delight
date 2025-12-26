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
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── DesktopView.tsx   # Main desktop organizer
│   │   ├── BatchRename.tsx   # Bulk rename feature
│   │   ├── ExtensionSort.tsx # Extension-based sorting
│   │   └── FolderManager.tsx # Folder tree & analysis
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   ├── tauri-api.ts      # Tauri IPC command wrappers
│   │   └── types.ts          # Shared TypeScript types
│   └── stores/               # Zustand state management
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

### Frontend Views

| View | File | Description |
|------|------|-------------|
| Desktop | `DesktopView.tsx` | Scan/classify/organize desktop files |
| Rename | `BatchRename.tsx` | Bulk file renaming with preview |
| Extension | `ExtensionSort.tsx` | Organize by extension/category |
| Folder | `FolderManager.tsx` | Tree view, duplicates, analysis |

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
