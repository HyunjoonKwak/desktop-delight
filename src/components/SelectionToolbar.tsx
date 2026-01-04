import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Copy, FolderInput, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionToolbarProps {
  /** Number of files currently selected */
  selectedCount: number;
  /** Total number of files available for selection */
  totalCount: number;
  /** Whether all files are currently selected */
  isAllSelected: boolean;
  /** Callback to select all files */
  onSelectAll: () => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to move selected files */
  onMove: () => void;
  /** Callback to copy selected files */
  onCopy: () => void;
  /** Callback to delete selected files */
  onDelete: () => void;
}

/**
 * Fixed toolbar that appears when files are selected
 * Provides quick actions for selected files
 */
export function SelectionToolbar({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  onMove,
  onCopy,
  onDelete,
}: SelectionToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-2 pr-4 border-r border-border">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">
                {selectedCount}개 선택됨
              </span>
              {selectedCount === totalCount && (
                <span className="text-xs text-muted-foreground">
                  (전체)
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isAllSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAll}
                  className="h-9 text-xs"
                >
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  모두 선택
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onMove}
                className="h-9 text-xs"
              >
                <FolderInput className="w-4 h-4 mr-1.5" />
                이동
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                className="h-9 text-xs"
              >
                <Copy className="w-4 h-4 mr-1.5" />
                복사
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                삭제
              </Button>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-9 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
