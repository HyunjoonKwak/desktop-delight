import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Image as ImageIcon, Video, Music, Archive, Code, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileInfo } from '@/lib/types';

interface QuickLookModalProps {
  /** File to preview */
  file: FileInfo | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

const categoryIcons = {
  images: ImageIcon,
  documents: FileText,
  videos: Video,
  music: Music,
  archives: Archive,
  code: Code,
  installers: Archive,
  others: FileIcon,
};

/**
 * QuickLook-style modal for file preview
 * Supports images, text files, and basic file info for other types
 */
export function QuickLookModal({ file, isOpen, onClose }: QuickLookModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!file) return null;

  const Icon = categoryIcons[file.category] || FileIcon;
  const isImage = file.category === 'images';
  const isText = file.extension === '.txt' || file.extension === '.md' || file.extension === '.json';
  const isCode = file.category === 'code';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-4xl max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: file.category === 'images' ? 'hsl(340,82%,52%,0.15)' :
                                    file.category === 'documents' ? 'hsl(207,90%,54%,0.15)' :
                                    file.category === 'videos' ? 'hsl(270,70%,55%,0.15)' :
                                    file.category === 'music' ? 'hsl(160,84%,39%,0.15)' :
                                    file.category === 'code' ? 'hsl(180,70%,45%,0.15)' :
                                    'hsl(0,0%,50%,0.15)'
                  }}
                >
                  <Icon className="w-5 h-5" style={{
                    color: file.category === 'images' ? 'hsl(340,82%,52%)' :
                          file.category === 'documents' ? 'hsl(207,90%,54%)' :
                          file.category === 'videos' ? 'hsl(270,70%,55%)' :
                          file.category === 'music' ? 'hsl(160,84%,39%)' :
                          file.category === 'code' ? 'hsl(180,70%,45%)' :
                          'hsl(0,0%,50%)'
                  }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground truncate">
                    {file.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {file.sizeFormatted} • {file.extension}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // TODO: Implement open in folder
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  폴더에서 열기
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {isImage ? (
                <div className="flex items-center justify-center bg-muted/30 rounded-xl p-8">
                  <img
                    src={`file://${file.path}`}
                    alt={file.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden text-center text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>이미지를 미리볼 수 없습니다</p>
                  </div>
                </div>
              ) : isText || isCode ? (
                <div className="bg-muted/30 rounded-xl p-6">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">텍스트 파일 미리보기</p>
                    <p className="text-sm">파일을 열려면 '폴더에서 열기'를 클릭하세요</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Icon className="w-20 h-20 mx-auto mb-4 opacity-50" style={{
                      color: file.category === 'videos' ? 'hsl(270,70%,55%)' :
                            file.category === 'music' ? 'hsl(160,84%,39%)' :
                            file.category === 'archives' ? 'hsl(35,92%,50%)' :
                            'hsl(0,0%,50%)'
                    }} />
                    <p className="text-muted-foreground mb-2">
                      이 파일 형식은 미리보기를 지원하지 않습니다
                    </p>
                    <p className="text-sm text-muted-foreground">
                      파일을 열려면 '폴더에서 열기'를 클릭하세요
                    </p>
                  </div>

                  {/* File Details */}
                  <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">파일 정보</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">이름</p>
                        <p className="text-foreground font-medium truncate">{file.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">크기</p>
                        <p className="text-foreground font-medium">{file.sizeFormatted}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">종류</p>
                        <p className="text-foreground font-medium">{file.extension}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">수정일</p>
                        <p className="text-foreground font-medium">
                          {new Date(file.modifiedAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-6 py-3 border-t border-border bg-secondary/20">
              <p className="text-xs text-muted-foreground text-center">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Space</kbd> 또는{' '}
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Esc</kbd> 키를 눌러 닫기
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
