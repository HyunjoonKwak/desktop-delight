import { useState, useCallback } from 'react';
import type { FileInfo } from '@/lib/types';

export interface DragDropState {
  /** Currently dragging files */
  draggingFiles: FileInfo[];
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** Current drop target (category or folder path) */
  dropTarget: string | null;
}

export interface UseDragDropReturn {
  /** Current drag/drop state */
  state: DragDropState;
  /** Start dragging files */
  startDrag: (files: FileInfo[]) => void;
  /** End dragging */
  endDrag: () => void;
  /** Set current drop target */
  setDropTarget: (target: string | null) => void;
  /** Check if a file is being dragged */
  isDraggingFile: (filePath: string) => boolean;
  /** Execute drop operation */
  executeDrop: (onDrop: (files: FileInfo[], target: string) => void) => void;
}

/**
 * Hook for managing file drag and drop operations
 * 
 * @example
 * ```tsx
 * const dragDrop = useFileDragDrop();
 * 
 * // Start drag
 * <div onDragStart={() => dragDrop.startDrag([file])}>
 * 
 * // Handle drop
 * <div onDrop={() => dragDrop.executeDrop(handleFileDrop)}>
 * ```
 */
export function useFileDragDrop(): UseDragDropReturn {
  const [state, setState] = useState<DragDropState>({
    draggingFiles: [],
    isDragging: false,
    dropTarget: null,
  });

  const startDrag = useCallback((files: FileInfo[]) => {
    setState({
      draggingFiles: files,
      isDragging: true,
      dropTarget: null,
    });
  }, []);

  const endDrag = useCallback(() => {
    setState({
      draggingFiles: [],
      isDragging: false,
      dropTarget: null,
    });
  }, []);

  const setDropTarget = useCallback((target: string | null) => {
    setState((prev) => ({
      ...prev,
      dropTarget: target,
    }));
  }, []);

  const isDraggingFile = useCallback(
    (filePath: string) => {
      return state.draggingFiles.some((f) => f.path === filePath);
    },
    [state.draggingFiles]
  );

  const executeDrop = useCallback(
    (onDrop: (files: FileInfo[], target: string) => void) => {
      if (state.dropTarget && state.draggingFiles.length > 0) {
        onDrop(state.draggingFiles, state.dropTarget);
      }
      endDrag();
    },
    [state.draggingFiles, state.dropTarget, endDrag]
  );

  return {
    state,
    startDrag,
    endDrag,
    setDropTarget,
    isDraggingFile,
    executeDrop,
  };
}
