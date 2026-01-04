import { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Eye, Edit3, FolderOpen, Copy, Trash2, ExternalLink } from 'lucide-react';
import type { FileInfo } from '@/lib/types';

interface FileContextMenuProps {
  file: FileInfo;
  children: ReactNode;
  onPreview?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onOpenInFolder?: () => void;
}

/**
 * FileContextMenu Component
 * 
 * Provides right-click context menu for file operations.
 * Wraps file card or list item with context menu functionality.
 * 
 * @param file - File information
 * @param children - Child element to wrap (FileCard)
 * @param onPreview - Preview/Quick Look handler
 * @param onRename - Rename file handler
 * @param onMove - Move file handler
 * @param onCopy - Copy file handler
 * @param onDelete - Delete file handler
 * @param onOpenInFolder - Open containing folder handler
 */
export function FileContextMenu({
  file,
  children,
  onPreview,
  onRename,
  onMove,
  onCopy,
  onDelete,
  onOpenInFolder,
}: FileContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onPreview && (
          <>
            <ContextMenuItem onClick={onPreview}>
              <Eye className="w-4 h-4 mr-2" />
              미리보기
              <span className="ml-auto text-xs text-muted-foreground">Space</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        
        {onRename && (
          <ContextMenuItem onClick={onRename}>
            <Edit3 className="w-4 h-4 mr-2" />
            이름 바꾸기
            <span className="ml-auto text-xs text-muted-foreground">F2</span>
          </ContextMenuItem>
        )}
        
        {onMove && (
          <ContextMenuItem onClick={onMove}>
            <FolderOpen className="w-4 h-4 mr-2" />
            이동...
          </ContextMenuItem>
        )}
        
        {onCopy && (
          <ContextMenuItem onClick={onCopy}>
            <Copy className="w-4 h-4 mr-2" />
            복사
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
          </ContextMenuItem>
        )}
        
        {(onRename || onMove || onCopy) && onDelete && (
          <ContextMenuSeparator />
        )}
        
        {onDelete && (
          <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </ContextMenuItem>
        )}
        
        {onOpenInFolder && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onOpenInFolder}>
              <ExternalLink className="w-4 h-4 mr-2" />
              폴더에서 열기
            </ContextMenuItem>
          </>
        )}
        
        <ContextMenuSeparator />
        <ContextMenuItem disabled className="text-xs">
          {file.name}
        </ContextMenuItem>
        <ContextMenuItem disabled className="text-xs text-muted-foreground">
          {file.sizeFormatted} · {file.category}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
