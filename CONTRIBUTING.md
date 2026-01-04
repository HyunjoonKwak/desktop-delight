# Contributing to Desktop Organizer Pro

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Rust (via [rustup](https://rustup.rs))
- Platform-specific build tools:
  - **Windows**: Microsoft C++ Build Tools
  - **macOS**: Xcode Command Line Tools

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd desktop_organizer

# Install dependencies
npm install

# Run development server
npm run tauri:dev
```

## 📝 Code Style

### TypeScript/React

- Use TypeScript for all new files
- Follow functional component patterns with hooks
- Use descriptive variable and function names in English
- UI text should be in Korean
- Add JSDoc comments for complex functions

### File Organization

```
src/
├── components/       # React components
│   ├── ui/          # shadcn/ui primitives
│   └── *.tsx        # Feature components
├── hooks/           # Custom React hooks
├── constants/       # Shared constants
├── utils/           # Utility functions
└── stores/          # Zustand state stores
```

### Naming Conventions

- **Components**: PascalCase (e.g., `FileContextMenu.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useFileDragDrop.ts`)
- **Constants**: UPPER_SNAKE_CASE for values, camelCase for objects
- **Functions**: camelCase (e.g., `handleFileClick`)
- **Interfaces/Types**: PascalCase (e.g., `FileInfo`, `DragDropState`)

## 🎨 UI/UX Guidelines

- Use shadcn/ui components for consistency
- Add Framer Motion animations for smooth transitions
- Ensure keyboard accessibility
- Add tooltips with keyboard shortcut hints
- Include empty states for better UX
- Show loading states with skeleton loaders
- Provide user-friendly error messages

## 🧪 Testing

```bash
# Run TypeScript type check
npm run type-check

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Check code formatting
npm run format:check
```

## 📦 Making Changes

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `chore/task-description` - Maintenance tasks
- `docs/what-changed` - Documentation updates

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `perf`: Performance improvements

**Examples:**
```
feat(search): add advanced filtering by file size
fix(drag-drop): correct file selection when dragging
docs(readme): update keyboard shortcuts table
chore(deps): update dependencies to latest versions
```

### Pull Request Process

1. Create a new branch from `main`
2. Make your changes following the code style guidelines
3. Add tests if applicable
4. Run `npm run type-check` and `npm run lint`
5. Update documentation if needed
6. Commit your changes with descriptive messages
7. Push to your fork and create a pull request

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] TypeScript type check passed
- [ ] Linting passed
- [ ] Tested in development mode
- [ ] Tested built application

## Screenshots (if applicable)
Add screenshots for UI changes
```

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - OS: [e.g., Windows 11, macOS 14]
   - App Version: [e.g., 1.10.0]
6. **Screenshots**: If applicable

## 💡 Feature Requests

When suggesting features, please include:

1. **Problem**: What problem does this solve?
2. **Solution**: Proposed solution
3. **Alternatives**: Alternative solutions considered
4. **Additional Context**: Any other relevant information

## 🎯 Development Tips

### Hot Reload

The development server supports hot reload:
```bash
npm run tauri:dev
```

### Debugging

- Use browser DevTools in development mode
- Check Tauri console for Rust backend logs
- Use React DevTools for component inspection

### Performance

- Use React DevTools Profiler to identify bottlenecks
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`
- Use `React.memo` for components that rarely change

### Common Patterns

**Custom Hook Example:**
```typescript
export function useCustomHook() {
  const [state, setState] = useState();
  
  // Hook logic here
  
  return { state, setState };
}
```

**Component with Keyboard Shortcuts:**
```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function MyComponent() {
  useKeyboardShortcuts([
    {
      key: 'f',
      ctrl: true,
      handler: handleSearch,
      description: '검색',
      category: '탐색',
    },
  ]);
  
  return <div>...</div>;
}
```

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Framer Motion Docs](https://www.framer.com/motion/)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Thank you for contributing to Desktop Organizer Pro! Your efforts help make this project better for everyone.
