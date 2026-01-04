import { Skeleton } from '@/components/ui/skeleton';

/**
 * FileCardSkeleton Component
 * 
 * Skeleton loader that matches the FileCard layout.
 * Used during file loading to provide visual feedback.
 */
export function FileCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-card border border-transparent">
      {/* Icon skeleton */}
      <Skeleton className="w-12 h-12 rounded-xl mb-3" />
      
      {/* File name skeleton */}
      <Skeleton className="h-4 w-3/4 mb-2" />
      
      {/* File info skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
