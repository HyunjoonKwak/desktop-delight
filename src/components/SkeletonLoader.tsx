import { FileCardSkeleton } from './FileCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonLoaderProps {
  type: 'grid' | 'list';
  count?: number;
}

/**
 * SkeletonLoader Component
 * 
 * Displays skeleton loaders for grid or list view.
 * Provides visual feedback during data loading.
 * 
 * @param type - Layout type ('grid' or 'list')
 * @param count - Number of skeleton items to display (default: 12)
 */
export function SkeletonLoader({ type, count = 12 }: SkeletonLoaderProps) {
  if (type === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <FileCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // List view skeleton
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border"
        >
          {/* Icon */}
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          
          {/* File info */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          
          {/* File size */}
          <Skeleton className="h-3 w-16" />
          
          {/* Date */}
          <Skeleton className="h-3 w-24" />
          
          {/* Actions */}
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}
