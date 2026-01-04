import { motion } from 'framer-motion';
import { FolderOpen, Search, FileX, Inbox, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Empty state types
 */
export type EmptyStateType = 
  | 'no-files'
  | 'no-search-results'
  | 'no-category-files'
  | 'empty-folder';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Default configurations for each empty state type
 */
const DEFAULT_CONFIGS: Record<EmptyStateType, {
  icon: LucideIcon;
  title: string;
  message: string;
}> = {
  'no-files': {
    icon: Inbox,
    title: '파일이 없습니다',
    message: '이 폴더에는 아직 파일이 없습니다.',
  },
  'no-search-results': {
    icon: Search,
    title: '검색 결과가 없습니다',
    message: '다른 키워드로 검색해보세요.',
  },
  'no-category-files': {
    icon: FileX,
    title: '해당 카테고리에 파일이 없습니다',
    message: '다른 카테고리를 선택해보세요.',
  },
  'empty-folder': {
    icon: FolderOpen,
    title: '폴더가 비어있습니다',
    message: '파일을 추가하거나 다른 폴더를 선택해보세요.',
  },
};

/**
 * EmptyState Component
 * 
 * Displays a friendly empty state message with an icon and optional action button.
 * Used across the application when there's no content to display.
 * 
 * @param type - Type of empty state to display
 * @param title - Custom title (overrides default)
 * @param message - Custom message (overrides default)
 * @param icon - Custom icon (overrides default)
 * @param action - Optional action button
 */
export function EmptyState({
  type,
  title,
  message,
  icon,
  action,
}: EmptyStateProps) {
  const config = DEFAULT_CONFIGS[type];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full min-h-[400px] py-16 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon */}
      <motion.div
        className="mb-6"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
          <Icon className="w-12 h-12 text-muted-foreground/50" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        className="text-xl font-semibold text-foreground mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {displayTitle}
      </motion.h3>

      {/* Message */}
      <motion.p
        className="text-muted-foreground text-center max-w-md mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {displayMessage}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
