import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatShortcut, groupShortcutsByCategory, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Array of keyboard shortcuts to display */
  shortcuts: KeyboardShortcut[];
}

/**
 * Dialog showing all available keyboard shortcuts
 * Grouped by category for easy scanning
 */
export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  const grouped = groupShortcutsByCategory(shortcuts);
  const categories = Object.keys(grouped).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            키보드 단축키
          </DialogTitle>
          <DialogDescription>
            작업을 빠르게 수행하기 위한 키보드 단축키입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {grouped[category].map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2.5 py-1.5 text-xs font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong>팁:</strong> 입력 필드에 포커스가 있을 때는 대부분의 단축키가 비활성화됩니다.
            단축키를 사용하려면 Esc를 눌러 포커스를 해제하세요.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
