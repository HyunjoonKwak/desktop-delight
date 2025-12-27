import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Trash2,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Loader2,
  Search,
  File,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Code,
  Home,
  Folder,
  ArrowLeft,
} from "lucide-react";
import { analyzerApi, fileApi, isTauri } from "@/lib/tauri-api";
import type { DuplicateGroup, FileInfo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { invoke } from "@tauri-apps/api/core";

// Category icons map
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

const categoryColors: Record<string, string> = {
  images: "hsl(340, 82%, 52%)",
  documents: "hsl(207, 90%, 54%)",
  videos: "hsl(270, 70%, 55%)",
  music: "hsl(160, 84%, 39%)",
  archives: "hsl(35, 92%, 50%)",
  installers: "hsl(35, 92%, 50%)",
  code: "hsl(200, 70%, 50%)",
  others: "hsl(0, 0%, 50%)",
};

export default function DuplicateManager() {
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState<FileInfo[]>([]);
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ phase: "", current: 0, total: 0 });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const { toast } = useToast();

  // Load desktop path on mount
  useEffect(() => {
    const loadDesktop = async () => {
      if (isTauri()) {
        try {
          const desktopPath = await fileApi.getDesktopPath();
          setCurrentPath(desktopPath);
        } catch (error) {
          console.error("Failed to get desktop path:", error);
        }
      }
    };
    loadDesktop();
  }, []);

  // Scan function ref for useEffect
  const scanCurrentPath = useCallback(async (path: string) => {
    if (!path) return;

    setIsScanning(true);
    setDuplicates([]);
    setSelectedFiles(new Set());
    setScanProgress({ phase: "파일 수집 중...", current: 0, total: 0 });

    try {
      if (isTauri()) {
        setScanProgress({ phase: "크기별 그룹화 중...", current: 0, total: 0 });
        const result = await analyzerApi.findDuplicates(path);
        setDuplicates(result);

        if (result.length === 0) {
          toast({
            title: "스캔 완료",
            description: "중복 파일이 없습니다.",
          });
        } else {
          const totalWaste = result.reduce(
            (acc, g) => acc + g.size * (g.files.length - 1),
            0
          );
          toast({
            title: "스캔 완료",
            description: `${result.length}개 중복 그룹 발견 (${formatSize(totalWaste)} 절약 가능)`,
          });
        }
      }
    } catch (error) {
      console.error("Scan failed:", error);
      toast({
        title: "스캔 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      setScanProgress({ phase: "", current: 0, total: 0 });
    }
  }, [toast]);

  // Load folders when path changes
  useEffect(() => {
    const loadFolders = async () => {
      if (!currentPath) return;

      try {
        if (isTauri()) {
          const files = await fileApi.scanDirectory(currentPath);
          const folderList = files.filter((f: FileInfo) => f.isDirectory);
          folderList.sort((a: FileInfo, b: FileInfo) => a.name.localeCompare(b.name));
          setFolders(folderList);

          // Auto-scan when folder changes
          if (autoScan) {
            scanCurrentPath(currentPath);
          }
        }
      } catch (error) {
        console.error("Failed to load folders:", error);
      }
    };
    loadFolders();
  }, [currentPath, autoScan, scanCurrentPath]);

  const navigateTo = useCallback((path: string, addToHistory = true) => {
    if (addToHistory && currentPath && currentPath !== path) {
      setPathHistory(prev => [...prev, currentPath]);
    }
    setCurrentPath(path);
    setDuplicates([]);
    setSelectedFiles(new Set());
    setExpandedGroups(new Set());
  }, [currentPath]);

  const goBack = useCallback(() => {
    if (pathHistory.length > 0) {
      const prevPath = pathHistory[pathHistory.length - 1];
      setPathHistory(prev => prev.slice(0, -1));
      setCurrentPath(prevPath);
      setDuplicates([]);
      setSelectedFiles(new Set());
    }
  }, [pathHistory]);

  const goToHome = useCallback(async () => {
    if (isTauri()) {
      try {
        const desktopPath = await fileApi.getDesktopPath();
        navigateTo(desktopPath);
      } catch (error) {
        console.error("Failed to navigate home:", error);
      }
    }
  }, [navigateTo]);

  const handleScan = useCallback(() => {
    if (currentPath) {
      scanCurrentPath(currentPath);
    }
  }, [currentPath, scanCurrentPath]);

  const handleSelectFolder = async () => {
    try {
      if (isTauri()) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          directory: true,
          multiple: false,
          title: "스캔할 폴더 선택",
        });
        if (selected) {
          navigateTo(selected as string);
        }
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  };

  const toggleGroup = (hash: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  };

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectAllDuplicates = () => {
    const allDuplicates = new Set<string>();
    duplicates.forEach(group => {
      // Skip the first file (keep it), select the rest
      group.files.slice(1).forEach(file => {
        allDuplicates.add(file.path);
      });
    });
    setSelectedFiles(allDuplicates);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    setIsDeleting(true);
    try {
      if (isTauri()) {
        let deleted = 0;
        let failed = 0;

        for (const path of selectedFiles) {
          try {
            await invoke("delete_file", { path, toTrash: true });
            deleted++;
          } catch {
            failed++;
          }
        }

        // Refresh duplicates list
        await handleScan();

        toast({
          title: "삭제 완료",
          description: `${deleted}개 파일 삭제됨${failed > 0 ? `, ${failed}개 실패` : ""}`,
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
          title: "삭제 완료 (시뮬레이션)",
          description: `${selectedFiles.size}개 파일 삭제됨`,
        });
      }

      setSelectedFiles(new Set());
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalWastedSpace = duplicates.reduce(
    (acc, g) => acc + g.size * (g.files.length - 1),
    0
  );

  const selectedWastedSpace = Array.from(selectedFiles).reduce((acc, path) => {
    for (const group of duplicates) {
      const file = group.files.find(f => f.path === path);
      if (file) {
        return acc + file.size;
      }
    }
    return acc;
  }, 0);

  // Breadcrumb path parts
  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Folder Navigation */}
      <div className="w-80 min-w-[320px] border-r border-border flex flex-col bg-secondary/20">
        {/* Navigation Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={goBack}
              disabled={pathHistory.length === 0}
              className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="뒤로"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToHome}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="홈"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={handleSelectFolder}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="폴더 선택"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setAutoScan(!autoScan)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                autoScan ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
              title="자동 스캔"
            >
              자동
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto scrollbar-thin">
            {pathParts.map((part, index) => {
              const fullPath = "/" + pathParts.slice(0, index + 1).join("/");
              const isLast = index === pathParts.length - 1;
              return (
                <span key={fullPath} className="flex items-center gap-1 whitespace-nowrap">
                  {index > 0 && <ChevronRight className="w-3 h-3" />}
                  <button
                    onClick={() => navigateTo(fullPath)}
                    className={`hover:text-foreground transition-colors ${isLast ? "text-foreground font-medium" : ""}`}
                  >
                    {part}
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-2">
          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Folder className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">하위 폴더 없음</p>
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map((folder) => (
                <motion.button
                  key={folder.path}
                  onClick={() => navigateTo(folder.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left group"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Folder className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{folder.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Scan Button */}
        <div className="p-4 border-t border-border">
          <motion.button
            onClick={handleScan}
            disabled={isScanning || !currentPath}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{scanProgress.phase || "스캔 중..."}</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>중복 파일 스캔</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center">
              <Copy className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">중복 파일 관리</h1>
              <p className="text-sm text-muted-foreground">
                {duplicates.length > 0
                  ? `${duplicates.length}개 중복 그룹 · ${formatSize(totalWastedSpace)} 절약 가능`
                  : isScanning ? scanProgress.phase : "폴더를 선택하면 자동으로 스캔합니다"}
              </p>
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <motion.button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-50"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              <span>{selectedFiles.size}개 삭제 ({formatSize(selectedWastedSpace)})</span>
            </motion.button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {isScanning ? (
              <motion.div
                className="flex flex-col items-center justify-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="scanning"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-foreground font-medium">{scanProgress.phase || "중복 파일을 검색하는 중..."}</p>
                <p className="text-xs text-muted-foreground mt-1">파일 수에 따라 시간이 걸릴 수 있습니다</p>
              </motion.div>
            ) : duplicates.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="empty"
              >
                <CheckCircle2 className="w-12 h-12 text-accent mb-4" />
                <p className="text-foreground font-medium">중복 파일이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentPath ? "이 폴더에는 중복 파일이 없습니다" : "왼쪽에서 폴더를 선택하세요"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="results"
              >
                {/* Quick Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      각 그룹에서 첫 번째 파일은 원본으로 유지됩니다
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllDuplicates}
                      className="text-xs text-primary hover:underline"
                    >
                      모든 중복 선택
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      선택 해제
                    </button>
                  </div>
                </div>

                {/* Duplicate Groups */}
                {duplicates.map((group, groupIndex) => {
                  const isExpanded = expandedGroups.has(group.hash);
                  const wastedSpace = group.size * (group.files.length - 1);
                  const firstFile = group.files[0];
                  const IconComponent = categoryIcons[firstFile.category] || File;
                  const color = categoryColors[firstFile.category] || "hsl(0, 0%, 50%)";

                  return (
                    <motion.div
                      key={group.hash}
                      className="glass rounded-2xl border border-border overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.03 }}
                    >
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(group.hash)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <IconComponent className="w-5 h-5" style={{ color }} />
                        </div>

                        <div className="flex-1 text-left">
                          <p className="font-medium text-foreground">
                            {group.files.length}개 동일 파일
                          </p>
                          <p className="text-xs text-muted-foreground">
                            각 {group.sizeFormatted} · {formatSize(wastedSpace)} 절약 가능
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-destructive/20 text-destructive">
                            -{formatSize(wastedSpace)}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Group Files */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border"
                          >
                            {group.files.map((file, fileIndex) => {
                              const isOriginal = fileIndex === 0;
                              const isSelected = selectedFiles.has(file.path);

                              return (
                                <div
                                  key={file.path}
                                  className={`flex items-center gap-4 p-4 ${
                                    isOriginal ? "bg-accent/5" : "hover:bg-secondary/30"
                                  } ${fileIndex > 0 ? "border-t border-border/50" : ""}`}
                                >
                                  {isOriginal ? (
                                    <div className="w-5 h-5 flex items-center justify-center">
                                      <CheckCircle2 className="w-4 h-4 text-accent" />
                                    </div>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleFileSelection(file.path)}
                                      className="w-4 h-4 rounded border-muted-foreground"
                                    />
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${isOriginal ? "font-medium text-accent" : "text-foreground"}`}>
                                      {file.name}
                                      {isOriginal && (
                                        <span className="ml-2 text-xs text-accent">(원본)</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {file.path}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">{file.sizeFormatted}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(file.modifiedAt)}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)}GB`;
  } else if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)}MB`;
  } else if (bytes >= KB) {
    return `${(bytes / KB).toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
