import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MonitorUp,
  Sparkles,
  FolderOpen,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  History,
  Settings2,
  RefreshCw,
  Code,
  Package,
  File,
  Shield,
} from "lucide-react";
import FileCard from "./FileCard";
import HistoryPanel, { HistoryItem } from "./HistoryPanel";
import FileDetailPanel from "./FileDetailPanel";
import OrganizeRulesModal from "./OrganizeRulesModal";
import { BackupManager } from "./BackupManager";
import { useToast } from "@/hooks/use-toast";
import { fileApi, historyApi, organizerApi, isTauri, formatRelativeDate } from "@/lib/tauri-api";
import type { FileInfo, FileCategory } from "@/lib/types";

type SortKey = "name" | "date" | "size";
type SortOrder = "asc" | "desc";

// Map FileCategory to legacy type for FileCard compatibility
const categoryToType: Record<FileCategory, string> = {
  images: "image",
  documents: "document",
  videos: "video",
  music: "audio",
  archives: "archive",
  installers: "archive",
  code: "code",
  others: "document",
};

// Categories for the filter UI
const categories = [
  { id: "images", label: "이미지", icon: Image, color: "hsl(340, 82%, 52%)" },
  { id: "documents", label: "문서", icon: FileText, color: "hsl(207, 90%, 54%)" },
  { id: "videos", label: "동영상", icon: Video, color: "hsl(270, 70%, 55%)" },
  { id: "music", label: "음악", icon: Music, color: "hsl(160, 84%, 39%)" },
  { id: "archives", label: "압축파일", icon: Archive, color: "hsl(35, 92%, 50%)" },
  { id: "code", label: "코드", icon: Code, color: "hsl(200, 70%, 50%)" },
];

// Mock data for development without Tauri
const mockDesktopFiles: FileInfo[] = [
  { path: "/desktop/프로젝트_최종.psd", name: "프로젝트_최종.psd", extension: ".psd", size: 245000000, sizeFormatted: "245MB", createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), isDirectory: false, isHidden: false, category: "images" },
  { path: "/desktop/회의록_2024.docx", name: "회의록_2024.docx", extension: ".docx", size: 1200000, sizeFormatted: "1.2MB", createdAt: new Date(Date.now() - 86400000).toISOString(), modifiedAt: new Date(Date.now() - 86400000).toISOString(), isDirectory: false, isHidden: false, category: "documents" },
  { path: "/desktop/홍보영상.mp4", name: "홍보영상.mp4", extension: ".mp4", size: 1800000000, sizeFormatted: "1.8GB", createdAt: new Date(Date.now() - 259200000).toISOString(), modifiedAt: new Date(Date.now() - 259200000).toISOString(), isDirectory: false, isHidden: false, category: "videos" },
  { path: "/desktop/배경음악.mp3", name: "배경음악.mp3", extension: ".mp3", size: 8500000, sizeFormatted: "8.5MB", createdAt: new Date(Date.now() - 604800000).toISOString(), modifiedAt: new Date(Date.now() - 604800000).toISOString(), isDirectory: false, isHidden: false, category: "music" },
  { path: "/desktop/자료.zip", name: "자료.zip", extension: ".zip", size: 156000000, sizeFormatted: "156MB", createdAt: new Date(Date.now() - 1209600000).toISOString(), modifiedAt: new Date(Date.now() - 1209600000).toISOString(), isDirectory: false, isHidden: false, category: "archives" },
  { path: "/desktop/스크린샷_001.png", name: "스크린샷_001.png", extension: ".png", size: 2100000, sizeFormatted: "2.1MB", createdAt: new Date(Date.now() - 3600000).toISOString(), modifiedAt: new Date(Date.now() - 3600000).toISOString(), isDirectory: false, isHidden: false, category: "images" },
  { path: "/desktop/계약서.pdf", name: "계약서.pdf", extension: ".pdf", size: 890000, sizeFormatted: "890KB", createdAt: new Date(Date.now() - 7200000).toISOString(), modifiedAt: new Date(Date.now() - 7200000).toISOString(), isDirectory: false, isHidden: false, category: "documents" },
  { path: "/desktop/index.tsx", name: "index.tsx", extension: ".tsx", size: 12000, sizeFormatted: "12KB", createdAt: new Date(Date.now() - 100800000).toISOString(), modifiedAt: new Date(Date.now() - 100800000).toISOString(), isDirectory: false, isHidden: false, category: "code" },
];

export default function DesktopView() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organized, setOrganized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<string | null>(null);
  const { toast } = useToast();

  // Load files on mount
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isTauri()) {
        const desktopFiles = await fileApi.scanDesktop();
        setFiles(desktopFiles.filter(f => !f.isDirectory));
      } else {
        // Use mock data for development
        setFiles(mockDesktopFiles);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
      toast({
        title: "파일 로드 실패",
        description: "바탕화면 파일을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
      // Fallback to mock data
      setFiles(mockDesktopFiles);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      if (isTauri()) {
        const historyItems = await historyApi.getHistory(50, 0);
        setHistory(historyItems.map(item => ({
          id: String(item.id),
          type: item.operationType as HistoryItem["type"],
          description: item.description,
          details: item.details || "",
          timestamp: new Date(item.createdAt),
          undone: item.isUndone,
        })));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadHistory();
  }, [loadFiles, loadHistory]);

  // Find file by path for detail panel
  const detailFile = selectedFileForDetail
    ? files.find((f) => f.path === selectedFileForDetail) || null
    : null;

  // Convert FileInfo to legacy format for FileDetailPanel
  const detailFileLegacy = detailFile ? {
    id: 0,
    name: detailFile.name,
    type: categoryToType[detailFile.category] as "image" | "document" | "video" | "audio" | "archive" | "code",
    size: detailFile.sizeFormatted,
    sizeBytes: detailFile.size,
    date: formatRelativeDate(detailFile.modifiedAt),
    dateTimestamp: new Date(detailFile.modifiedAt).getTime(),
  } : null;

  const addToHistory = (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setHistory((prev) => [newItem, ...prev]);
  };

  const filteredAndSortedFiles = useMemo(() => {
    let filtered = [...files];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (activeTypeFilter) {
      filtered = filtered.filter((file) => file.category === activeTypeFilter);
    }

    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ko");
          break;
        case "date":
          comparison = new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
          break;
        case "size":
          comparison = b.size - a.size;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchQuery, sortKey, sortOrder, activeTypeFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }

    const sortLabels = { name: "이름", date: "날짜", size: "크기" };
    addToHistory({
      type: "sort",
      description: `${sortLabels[key]}순 정렬`,
      details: `파일을 ${sortLabels[key]} 기준으로 정렬했습니다`,
    });
  };

  const SortIcon = ({ keyName }: { keyName: SortKey }) => {
    if (sortKey !== keyName) return <ArrowUpDown className="w-3.5 h-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5" />
    );
  };

  const toggleSelect = (path: string, isDoubleClick?: boolean) => {
    if (isDoubleClick) {
      setSelectedFileForDetail(path);
    } else {
      setSelectedFiles((prev) =>
        prev.includes(path) ? prev.filter((f) => f !== path) : [...prev, path]
      );
    }
  };

  const handleOrganize = async () => {
    setIsOrganizing(true);

    try {
      if (isTauri()) {
        // Get desktop path and execute organization
        const desktopPath = await fileApi.getDesktopPath();
        const result = await organizerApi.executeOrganization(desktopPath, {
          createDateSubfolders: false,
          dateFormat: "YYYY-MM",
          handleDuplicates: "rename",
        });

        if (result.success) {
          setOrganized(true);
          addToHistory({
            type: "organize",
            description: "바탕화면 자동 정리",
            details: `${result.filesMoved}개 파일을 유형별로 분류했습니다`,
          });
          toast({
            title: "정리 완료",
            description: `${result.filesMoved}개 파일이 정리되었습니다.${result.filesSkipped > 0 ? ` (${result.filesSkipped}개 건너뜀)` : ''}`,
          });
          // Reload files to show updated state
          await loadFiles();
          await loadHistory();
        } else {
          toast({
            title: "정리 부분 완료",
            description: `${result.filesMoved}개 파일 정리됨. 오류: ${result.errors.length}개`,
            variant: "destructive",
          });
        }
      } else {
        // Simulate for development
        await new Promise(resolve => setTimeout(resolve, 2000));
        setOrganized(true);
        addToHistory({
          type: "organize",
          description: "바탕화면 자동 정리",
          details: `${files.length}개 파일을 유형별로 분류했습니다`,
        });
        toast({
          title: "정리 완료",
          description: "바탕화면 파일이 유형별로 정리되었습니다.",
        });
      }
    } catch (error) {
      console.error("Organization failed:", error);
      toast({
        title: "정리 실패",
        description: "파일 정리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleUndo = async (id: string) => {
    try {
      if (isTauri()) {
        await historyApi.undoOperation(Number(id));
      }

      setHistory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, undone: true } : item
        )
      );

      const item = history.find((h) => h.id === id);
      if (item?.type === "organize") {
        setOrganized(false);
        await loadFiles(); // Reload files after undo
      }

      toast({
        title: "되돌리기 완료",
        description: "작업이 취소되었습니다.",
      });
    } catch (error) {
      toast({
        title: "되돌리기 실패",
        description: "작업을 취소하는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleClearHistory = async () => {
    try {
      if (isTauri()) {
        await historyApi.clearHistory();
      }
      setHistory([]);
      toast({
        title: "히스토리 삭제",
        description: "모든 작업 기록이 삭제되었습니다.",
      });
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "히스토리 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTypeFilter(null);
    setSortKey("name");
    setSortOrder("asc");
  };

  const handleRefresh = () => {
    setOrganized(false);
    loadFiles();
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <MonitorUp className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              바탕화면 정리
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "로딩 중..." : `${files.length}개의 파일 · ${selectedFiles.length}개 선택됨`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Backup Button */}
          <motion.button
            onClick={() => setIsBackupOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Shield className="w-5 h-5" />
            <span>백업</span>
          </motion.button>

          {/* Refresh Button */}
          <motion.button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </motion.button>

          {/* Rules Button */}
          <motion.button
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings2 className="w-5 h-5" />
            <span>정리 규칙</span>
          </motion.button>

          {/* History Button */}
          <motion.button
            onClick={() => setIsHistoryOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <History className="w-5 h-5" />
            <span>히스토리</span>
            {history.filter((h) => !h.undone).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {history.filter((h) => !h.undone).length}
              </span>
            )}
          </motion.button>

          {/* Organize Button */}
          <motion.button
            onClick={handleOrganize}
            disabled={isOrganizing || organized || isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              organized
                ? "bg-accent/20 text-accent"
                : "gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            } disabled:opacity-50`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isOrganizing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                <span>정리 중...</span>
              </>
            ) : organized ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>정리 완료!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>자동 정리</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Categories Overview - Clickable Filter */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        {categories.map((cat, index) => {
          const count = files.filter((f) => f.category === cat.id).length;
          const isActive = activeTypeFilter === cat.id;
          return (
            <motion.div
              key={cat.id}
              onClick={() => setActiveTypeFilter(isActive ? null : cat.id)}
              className={`p-4 rounded-xl glass border cursor-pointer transition-all ${
                isActive
                  ? "border-primary shadow-glow"
                  : "border-border hover:border-primary/30"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <p className="text-sm font-medium text-foreground">{cat.label}</p>
              <p className="text-xs text-muted-foreground">{count}개 파일</p>
            </motion.div>
          );
        })}
      </div>

      {/* Files Grid */}
      <div className="glass rounded-2xl p-6 border border-border">
        {/* Search and Sort Bar */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="파일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort Buttons */}
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
            <button
              onClick={() => toggleSort("name")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortKey === "name"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>이름</span>
              <SortIcon keyName="name" />
            </button>
            <button
              onClick={() => toggleSort("date")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortKey === "date"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>날짜</span>
              <SortIcon keyName="date" />
            </button>
            <button
              onClick={() => toggleSort("size")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortKey === "size"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>크기</span>
              <SortIcon keyName="size" />
            </button>
          </div>

          {/* Clear Filters */}
          {(searchQuery || activeTypeFilter) && (
            <motion.button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <X className="w-3.5 h-3.5" />
              필터 초기화
            </motion.button>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            바탕화면 파일
            <span className="text-sm text-muted-foreground font-normal">
              ({filteredAndSortedFiles.length}개)
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedFiles(filteredAndSortedFiles.map((f) => f.path))}
              className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              전체 선택
            </button>
            <button
              onClick={() => setSelectedFiles([])}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              선택 해제
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key="loading"
            >
              <RefreshCw className="w-12 h-12 mb-4 animate-spin opacity-50" />
              <p className="text-sm">파일을 불러오는 중...</p>
            </motion.div>
          ) : organized ? (
            <motion.div
              className="grid grid-cols-6 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key="organized"
            >
              {categories.map((cat) => {
                const catFiles = files.filter((f) => f.category === cat.id);
                if (catFiles.length === 0) return null;
                return (
                  <motion.div
                    key={cat.id}
                    className="p-4 rounded-xl border border-border bg-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <cat.icon
                        className="w-4 h-4"
                        style={{ color: cat.color }}
                      />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </div>
                    <div className="space-y-2">
                      {catFiles.slice(0, 5).map((file) => (
                        <div
                          key={file.path}
                          className="text-xs text-muted-foreground truncate"
                        >
                          {file.name}
                        </div>
                      ))}
                      {catFiles.length > 5 && (
                        <div className="text-xs text-primary">
                          +{catFiles.length - 5}개 더
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : filteredAndSortedFiles.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key="empty"
            >
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery || activeTypeFilter ? "검색 결과가 없습니다" : "바탕화면에 파일이 없습니다"}
              </p>
              {(searchQuery || activeTypeFilter) && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  필터 초기화
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-4 gap-4"
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredAndSortedFiles.map((file) => (
                <FileCard
                  key={file.path}
                  name={file.name}
                  type={categoryToType[file.category] as "image" | "document" | "video" | "audio" | "archive" | "code"}
                  size={file.sizeFormatted}
                  date={formatRelativeDate(file.modifiedAt)}
                  selected={selectedFiles.includes(file.path)}
                  onClick={() => toggleSelect(file.path)}
                  onDoubleClick={() => toggleSelect(file.path, true)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Panel */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onUndo={handleUndo}
        onClearHistory={handleClearHistory}
      />

      {/* File Detail Panel */}
      <FileDetailPanel
        file={detailFileLegacy}
        isOpen={selectedFileForDetail !== null}
        onClose={() => setSelectedFileForDetail(null)}
      />

      {/* Organize Rules Modal */}
      <OrganizeRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        onSave={(rules) => {
          toast({
            title: "규칙 저장 완료",
            description: `${rules.filter((r) => r.enabled).length}개의 규칙이 활성화되었습니다.`,
          });
          addToHistory({
            type: "organize",
            description: "정리 규칙 수정",
            details: `${rules.length}개의 규칙을 설정했습니다`,
          });
        }}
      />

      {/* Backup Manager */}
      <BackupManager
        open={isBackupOpen}
        onOpenChange={setIsBackupOpen}
      />
    </div>
  );
}
