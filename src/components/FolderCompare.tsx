import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare,
  FolderOpen,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  Equal,
  RefreshCw,
  Merge,
  ChevronDown,
  ChevronRight,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Code,
} from "lucide-react";
import { folderCompareApi, isTauri } from "@/lib/tauri-api";
import type { CompareSummary, CompareResult, FileStatus, MergeStrategy, MergeOptions } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { open } from "@tauri-apps/plugin-dialog";

// Category icons
const categoryIcons: Record<string, typeof Image> = {
  images: Image,
  documents: FileText,
  videos: Video,
  music: Music,
  archives: Archive,
  installers: Archive,
  code: Code,
  others: File,
};

const statusConfig: Record<FileStatus, { label: string; color: string; icon: typeof Plus; bgColor: string }> = {
  only_in_source: {
    label: "소스에만 있음",
    color: "text-blue-500",
    icon: Plus,
    bgColor: "bg-blue-500/10",
  },
  only_in_target: {
    label: "대상에만 있음",
    color: "text-amber-500",
    icon: Minus,
    bgColor: "bg-amber-500/10",
  },
  identical: {
    label: "동일",
    color: "text-accent",
    icon: Equal,
    bgColor: "bg-accent/10",
  },
  different: {
    label: "다름",
    color: "text-destructive",
    icon: AlertTriangle,
    bgColor: "bg-destructive/10",
  },
};

const mergeStrategies: { value: MergeStrategy; label: string; description: string }[] = [
  { value: "skip_existing", label: "기존 파일 건너뛰기", description: "대상 폴더에 이미 있는 파일은 건너뜁니다" },
  { value: "overwrite_all", label: "모두 덮어쓰기", description: "대상 폴더의 파일을 소스 파일로 덮어씁니다" },
  { value: "overwrite_newer", label: "최신 파일로 덮어쓰기", description: "소스가 더 최신인 경우만 덮어씁니다" },
  { value: "overwrite_older", label: "이전 파일로 덮어쓰기", description: "소스가 더 오래된 경우만 덮어씁니다" },
  { value: "rename", label: "이름 변경 후 복사", description: "충돌 시 소스 파일 이름을 변경하여 복사합니다" },
];

export default function FolderCompare() {
  const [sourcePath, setSourcePath] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [comparison, setComparison] = useState<CompareSummary | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [expandedStatus, setExpandedStatus] = useState<Set<FileStatus>>(new Set(["only_in_source", "different"]));
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("skip_existing");
  const [includeOnlyInSource, setIncludeOnlyInSource] = useState(true);
  const [includeDifferent, setIncludeDifferent] = useState(false);
  const [deleteSourceAfter, setDeleteSourceAfter] = useState(false);
  const { toast } = useToast();

  const selectFolder = async (type: "source" | "target") => {
    try {
      if (isTauri()) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: type === "source" ? "소스 폴더 선택" : "대상 폴더 선택",
        });
        if (selected) {
          if (type === "source") {
            setSourcePath(selected as string);
          } else {
            setTargetPath(selected as string);
          }
          setComparison(null);
        }
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  };

  const handleCompare = useCallback(async () => {
    if (!sourcePath || !targetPath) {
      toast({
        title: "폴더를 선택하세요",
        description: "소스 폴더와 대상 폴더를 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (sourcePath === targetPath) {
      toast({
        title: "같은 폴더입니다",
        description: "소스와 대상이 다른 폴더여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsComparing(true);
    try {
      if (isTauri()) {
        const result = await folderCompareApi.compareFolders(sourcePath, targetPath);
        setComparison(result);
        toast({
          title: "비교 완료",
          description: `${result.totalFiles}개 파일 비교됨`,
        });
      } else {
        // Mock for development
        await new Promise(resolve => setTimeout(resolve, 1500));
        setComparison({
          sourcePath,
          targetPath,
          totalFiles: 15,
          onlyInSource: 5,
          onlyInTarget: 3,
          identical: 5,
          different: 2,
          sourceTotalSize: 1024000000,
          targetTotalSize: 512000000,
          results: [
            { relativePath: "photo1.jpg", status: "only_in_source", sourceFile: { path: "", name: "photo1.jpg", extension: ".jpg", size: 1024000, sizeFormatted: "1.0MB", createdAt: "", modifiedAt: "", isDirectory: false, isHidden: false, category: "images" }, sizeDiff: 1024000 },
            { relativePath: "document.pdf", status: "different", sourceFile: { path: "", name: "document.pdf", extension: ".pdf", size: 2048000, sizeFormatted: "2.0MB", createdAt: "", modifiedAt: "", isDirectory: false, isHidden: false, category: "documents" }, targetFile: { path: "", name: "document.pdf", extension: ".pdf", size: 1024000, sizeFormatted: "1.0MB", createdAt: "", modifiedAt: "", isDirectory: false, isHidden: false, category: "documents" }, sizeDiff: 1024000 },
            { relativePath: "readme.txt", status: "identical", sourceFile: { path: "", name: "readme.txt", extension: ".txt", size: 1024, sizeFormatted: "1KB", createdAt: "", modifiedAt: "", isDirectory: false, isHidden: false, category: "documents" }, targetFile: { path: "", name: "readme.txt", extension: ".txt", size: 1024, sizeFormatted: "1KB", createdAt: "", modifiedAt: "", isDirectory: false, isHidden: false, category: "documents" }, sizeDiff: 0 },
            { relativePath: "old_file.txt", status: "only_in_target", targetFile: { path: "", name: "old_file.txt", extension: ".txt", size: 512, sizeFormatted: "512B", createdAt: "", modifiedAt: "", isDirectory: false, isHidden: false, category: "documents" }, sizeDiff: -512 },
          ],
        });
        toast({
          title: "비교 완료 (시뮬레이션)",
          description: "15개 파일 비교됨",
        });
      }
    } catch (error) {
      toast({
        title: "비교 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsComparing(false);
    }
  }, [sourcePath, targetPath, toast]);

  const handleMerge = async () => {
    if (!comparison) return;

    setIsMerging(true);
    try {
      const options: MergeOptions = {
        strategy: mergeStrategy,
        deleteSourceAfter,
        includeOnlyInSource,
        includeDifferent,
      };

      if (isTauri()) {
        const result = await folderCompareApi.mergeFolders(sourcePath, targetPath, options);

        if (result.success) {
          toast({
            title: "머지 완료",
            description: `${result.filesCopied}개 복사, ${result.filesOverwritten}개 덮어씀, ${result.filesSkipped}개 건너뜀`,
          });
          // Refresh comparison
          await handleCompare();
        } else {
          toast({
            title: "머지 부분 완료",
            description: `${result.errors.length}개 오류 발생`,
            variant: "destructive",
          });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast({
          title: "머지 완료 (시뮬레이션)",
          description: "파일이 머지되었습니다",
        });
      }
    } catch (error) {
      toast({
        title: "머지 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
    }
  };

  const toggleStatus = (status: FileStatus) => {
    setExpandedStatus(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const groupedResults = comparison?.results.reduce((acc, result) => {
    if (!acc[result.status]) {
      acc[result.status] = [];
    }
    acc[result.status].push(result);
    return acc;
  }, {} as Record<FileStatus, CompareResult[]>) || {};

  const filesToMerge = (includeOnlyInSource ? (comparison?.onlyInSource || 0) : 0) +
    (includeDifferent ? (comparison?.different || 0) : 0);

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <GitCompare className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">폴더 비교 & 머지</h1>
            <p className="text-sm text-muted-foreground">
              두 폴더를 비교하고 차이점을 머지합니다
            </p>
          </div>
        </div>
      </div>

      {/* Folder Selection */}
      <div className="glass rounded-2xl p-6 border border-border mb-6">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
          {/* Source Folder */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">소스 폴더</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="소스 폴더 경로"
                className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={() => selectFolder("source")}
                className="px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-end pb-2">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Target Folder */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">대상 폴더</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="대상 폴더 경로"
                className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={() => selectFolder("target")}
                className="px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <div className="mt-6 flex justify-center">
          <motion.button
            onClick={handleCompare}
            disabled={isComparing || !sourcePath || !targetPath}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isComparing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>비교 중...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-5 h-5" />
                <span>폴더 비교</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className={`p-4 rounded-xl ${statusConfig.only_in_source.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Plus className={`w-5 h-5 ${statusConfig.only_in_source.color}`} />
                  <span className="text-sm font-medium text-foreground">소스에만 있음</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{comparison.onlyInSource}</p>
              </div>

              <div className={`p-4 rounded-xl ${statusConfig.only_in_target.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Minus className={`w-5 h-5 ${statusConfig.only_in_target.color}`} />
                  <span className="text-sm font-medium text-foreground">대상에만 있음</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{comparison.onlyInTarget}</p>
              </div>

              <div className={`p-4 rounded-xl ${statusConfig.identical.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={`w-5 h-5 ${statusConfig.identical.color}`} />
                  <span className="text-sm font-medium text-foreground">동일한 파일</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{comparison.identical}</p>
              </div>

              <div className={`p-4 rounded-xl ${statusConfig.different.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className={`w-5 h-5 ${statusConfig.different.color}`} />
                  <span className="text-sm font-medium text-foreground">다른 파일</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{comparison.different}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* File List */}
              <div className="glass rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">비교 결과</h3>

                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {(["only_in_source", "different", "only_in_target", "identical"] as FileStatus[]).map(status => {
                    const results = groupedResults[status] || [];
                    if (results.length === 0) return null;

                    const config = statusConfig[status];
                    const isExpanded = expandedStatus.has(status);

                    return (
                      <div key={status} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleStatus(status)}
                          className={`w-full flex items-center gap-3 p-3 ${config.bgColor} hover:opacity-80 transition-opacity`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                          <span className="text-sm font-medium text-foreground">{config.label}</span>
                          <span className="text-xs text-muted-foreground">({results.length})</span>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                            >
                              {results.map((result, index) => {
                                const file = result.sourceFile || result.targetFile;
                                const IconComponent = file ? (categoryIcons[file.category] || File) : File;

                                return (
                                  <div
                                    key={result.relativePath}
                                    className={`flex items-center gap-3 px-4 py-2 ${index > 0 ? "border-t border-border/50" : ""}`}
                                  >
                                    <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-foreground truncate">{result.relativePath}</p>
                                      {result.sourceFile && result.targetFile && (
                                        <p className="text-xs text-muted-foreground">
                                          {result.sourceFile.sizeFormatted} → {result.targetFile.sizeFormatted}
                                        </p>
                                      )}
                                    </div>
                                    {file && (
                                      <span className="text-xs text-muted-foreground">{file.sizeFormatted}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Merge Options */}
              <div className="glass rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">머지 설정</h3>

                {/* Strategy */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">충돌 해결 방식</label>
                  <div className="space-y-2">
                    {mergeStrategies.map(strategy => (
                      <label
                        key={strategy.value}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          mergeStrategy === strategy.value
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-secondary/50 hover:bg-secondary"
                        }`}
                      >
                        <input
                          type="radio"
                          name="strategy"
                          value={strategy.value}
                          checked={mergeStrategy === strategy.value}
                          onChange={(e) => setMergeStrategy(e.target.value as MergeStrategy)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{strategy.label}</p>
                          <p className="text-xs text-muted-foreground">{strategy.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOnlyInSource}
                      onChange={(e) => setIncludeOnlyInSource(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">소스에만 있는 파일 복사 ({comparison.onlyInSource}개)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDifferent}
                      onChange={(e) => setIncludeDifferent(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">다른 파일 처리 ({comparison.different}개)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-destructive">
                    <input
                      type="checkbox"
                      checked={deleteSourceAfter}
                      onChange={(e) => setDeleteSourceAfter(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">머지 후 소스 폴더 삭제</span>
                  </label>
                </div>

                {/* Merge Button */}
                <motion.button
                  onClick={handleMerge}
                  disabled={isMerging || filesToMerge === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>머지 중...</span>
                    </>
                  ) : (
                    <>
                      <Merge className="w-5 h-5" />
                      <span>{filesToMerge}개 파일 머지</span>
                    </>
                  )}
                </motion.button>

                {deleteSourceAfter && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span>주의: 머지 완료 후 소스 폴더가 삭제됩니다</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!comparison && !isComparing && (
        <motion.div
          className="flex flex-col items-center justify-center py-20 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <GitCompare className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">폴더를 선택하고 비교를 시작하세요</p>
          <p className="text-sm mt-2">두 폴더의 파일을 비교하고 차이점을 확인할 수 있습니다</p>
        </motion.div>
      )}
    </div>
  );
}
