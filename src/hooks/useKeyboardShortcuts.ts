import { useEffect } from 'react';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Keyboard key (e.g., 'a', 'f', 'Delete', 'Escape') */
  key: string;
  /** Requires Ctrl/Cmd key */
  ctrl?: boolean;
  /** Requires Shift key */
  shift?: boolean;
  /** Requires Alt/Option key */
  alt?: boolean;
  /** Handler function to execute */
  handler: () => void;
  /** Human-readable description for help UI */
  description: string;
  /** Optional category for grouping in help UI */
  category?: string;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param enabled - Whether shortcuts are currently active (default: true)
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'f',
 *     ctrl: true,
 *     handler: () => focusSearch(),
 *     description: '검색 포커스',
 *     category: '탐색'
 *   },
 *   {
 *     key: 'a',
 *     ctrl: true,
 *     handler: () => selectAll(),
 *     description: '모두 선택',
 *     category: '선택'
 *   }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true
): void {
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          // Allow Ctrl+F even in input fields (browser default)
          // But prevent other shortcuts from triggering
          if (isInputField && !(shortcut.ctrl && shortcut.key.toLowerCase() === 'f')) {
            continue;
          }

          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}

/**
 * Format shortcut for display (e.g., "Ctrl+Shift+F")
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  
  // Capitalize key for display
  const key = shortcut.key.length === 1 
    ? shortcut.key.toUpperCase() 
    : shortcut.key;
  parts.push(key);
  
  return parts.join('+');
}

/**
 * Group shortcuts by category
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Record<string, KeyboardShortcut[]> {
  const grouped: Record<string, KeyboardShortcut[]> = {};
  
  for (const shortcut of shortcuts) {
    const category = shortcut.category || '기타';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(shortcut);
  }
  
  return grouped;
}
