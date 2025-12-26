import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FolderOpen,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Package,
  Code,
  File,
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { rulesApi } from "@/lib/tauri-api";
import { UnifiedPreview, FileCategory, CATEGORY_INFO } from "@/lib/types";

interface RulePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePath: string;
  onExecute: () => Promise<void>;
}

interface GroupedPreview {
  destination: string;
  matchType: "custom" | "default";
  ruleName?: string;
  categoryLabel?: string;
  files: UnifiedPreview[];
}

const getCategoryIcon = (category: FileCategory) => {
  const icons: Record<FileCategory, typeof Image> = {
    images: Image,
    documents: FileText,
    videos: Video,
    music: Music,
    archives: Archive,
    installers: Package,
    code: Code,
    others: File,
  };
  return icons[category] || File;
};

export default function RulePreviewModal({
  open,
  onOpenChange,
  sourcePath,
  onExecute,
}: RulePreviewModalProps) {
  const [previews, setPreviews] = useState<UnifiedPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Load preview data when modal opens
  useEffect(() => {
    if (open && sourcePath) {
      loadPreview();
    }
  }, [open, sourcePath]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rulesApi.previewUnified(sourcePath);
      setPreviews(result);
      // Expand all groups by default
      const allDestinations = new Set(result.map((p) => p.destination));
      setExpandedGroups(allDestinations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "미리보기 로드 실패");
    } finally {
      setIsLoading(false);
    }
  };

  // Group previews by destination
  const groupedPreviews = useMemo(() => {
    const groups: Map<string, GroupedPreview> = new Map();

    for (const preview of previews) {
      const key = preview.destination;
      if (!groups.has(key)) {
        groups.set(key, {
          destination: preview.destination,
          matchType: preview.matchType,
          ruleName: preview.rule?.name,
          categoryLabel: preview.defaultRule
            ? CATEGORY_INFO[preview.defaultRule.category as FileCategory]?.label
            : undefined,
          files: [],
        });
      }
      groups.get(key)!.files.push(preview);
    }

    // Sort by file count descending
    return Array.from(groups.values()).sort(
      (a, b) => b.files.length - a.files.length
    );
  }, [previews]);

  const totalFiles = previews.length;

  const toggleGroup = (destination: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(destination)) {
        next.delete(destination);
      } else {
        next.add(destination);
      }
      return next;
    });
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "정리 실행 실패");
    } finally {
      setIsExecuting(false);
    }
  };

  const getDestinationShortName = (fullPath: string) => {
    const parts = fullPath.split(/[/\\]/);
    return parts.slice(-2).join("/");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isExecuting && onOpenChange(false)}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-[5vh] mx-auto max-w-[700px] max-h-[90vh] glass rounded-2xl border border-border z-50 overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    정리 미리보기
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isLoading
                      ? "분석 중..."
                      : `${totalFiles}개 파일이 정리됩니다`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isExecuting && onOpenChange(false)}
                disabled={isExecuting}
                className="p-2 rounded-xl hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">
                    파일을 분석하고 있습니다...
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="text-destructive font-medium mb-2">오류 발생</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {error}
                  </p>
                  <motion.button
                    onClick={loadPreview}
                    className="mt-4 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    다시 시도
                  </motion.button>
                </div>
              ) : totalFiles === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-2">
                    정리할 파일 없음
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    바탕화면에 정리할 파일이 없거나
                    <br />
                    모든 파일이 이미 정리되어 있습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedPreviews.map((group) => {
                    const isExpanded = expandedGroups.has(group.destination);
                    const CategoryIcon = group.files[0]?.file?.category
                      ? getCategoryIcon(
                          group.files[0].file.category as FileCategory
                        )
                      : File;

                    return (
                      <div
                        key={group.destination}
                        className="rounded-xl border border-border overflow-hidden"
                      >
                        {/* Group Header */}
                        <button
                          onClick={() => toggleGroup(group.destination)}
                          className="w-full flex items-center gap-3 p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                        >
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </motion.div>
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: group.files[0]?.file?.category
                                ? `${
                                    CATEGORY_INFO[
                                      group.files[0].file
                                        .category as FileCategory
                                    ]?.color || "hsl(220, 10%, 50%)"
                                  }20`
                                : "hsl(220, 10%, 50%, 0.2)",
                            }}
                          >
                            <CategoryIcon
                              className="w-4 h-4"
                              style={{
                                color: group.files[0]?.file?.category
                                  ? CATEGORY_INFO[
                                      group.files[0].file
                                        .category as FileCategory
                                    ]?.color || "hsl(220, 10%, 50%)"
                                  : "hsl(220, 10%, 50%)",
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">
                                {group.matchType === "custom"
                                  ? group.ruleName
                                  : group.categoryLabel || "기타"}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  group.matchType === "custom"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {group.matchType === "custom"
                                  ? "사용자 규칙"
                                  : "기본 규칙"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <ArrowRight className="w-3 h-3" />
                              <span className="truncate">
                                {getDestinationShortName(group.destination)}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {group.files.length}개
                          </span>
                        </button>

                        {/* File List */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="divide-y divide-border/50">
                                {group.files.map((preview, idx) => (
                                  <div
                                    key={preview.file.path}
                                    className="flex items-center gap-3 px-4 py-2 pl-12 hover:bg-secondary/20"
                                  >
                                    <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm text-foreground truncate flex-1">
                                      {preview.file.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {preview.file.sizeFormatted}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 bg-secondary/30 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {!isLoading && !error && totalFiles > 0 && (
                  <>
                    <span className="font-medium text-foreground">
                      {groupedPreviews.length}
                    </span>
                    개 폴더로 분류
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => onOpenChange(false)}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  whileHover={{ scale: isExecuting ? 1 : 1.02 }}
                  whileTap={{ scale: isExecuting ? 1 : 0.98 }}
                >
                  취소
                </motion.button>
                <motion.button
                  onClick={handleExecute}
                  disabled={isLoading || isExecuting || totalFiles === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50"
                  whileHover={{
                    scale: isLoading || isExecuting || totalFiles === 0 ? 1 : 1.02,
                  }}
                  whileTap={{
                    scale: isLoading || isExecuting || totalFiles === 0 ? 1 : 0.98,
                  }}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>정리 중...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>정리 실행</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
