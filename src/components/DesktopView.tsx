import { useState, useMemo } from "react";
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
} from "lucide-react";
import FileCard from "./FileCard";
import HistoryPanel, { HistoryItem } from "./HistoryPanel";
import FileDetailPanel from "./FileDetailPanel";
import { useToast } from "@/hooks/use-toast";

type FileType = "image" | "document" | "video" | "audio" | "archive" | "code";
type SortKey = "name" | "date" | "size";
type SortOrder = "asc" | "desc";

interface MockFile {
  id: number;
  name: string;
  type: FileType;
  size: string;
  sizeBytes: number;
  date: string;
  dateTimestamp: number;
}

const mockDesktopFiles: MockFile[] = [
  { id: 1, name: "프로젝트_최종.psd", type: "image", size: "245MB", sizeBytes: 245000000, date: "오늘", dateTimestamp: Date.now() },
  { id: 2, name: "회의록_2024.docx", type: "document", size: "1.2MB", sizeBytes: 1200000, date: "어제", dateTimestamp: Date.now() - 86400000 },
  { id: 3, name: "홍보영상.mp4", type: "video", size: "1.8GB", sizeBytes: 1800000000, date: "3일 전", dateTimestamp: Date.now() - 259200000 },
  { id: 4, name: "배경음악.mp3", type: "audio", size: "8.5MB", sizeBytes: 8500000, date: "1주 전", dateTimestamp: Date.now() - 604800000 },
  { id: 5, name: "자료.zip", type: "archive", size: "156MB", sizeBytes: 156000000, date: "2주 전", dateTimestamp: Date.now() - 1209600000 },
  { id: 6, name: "스크린샷_001.png", type: "image", size: "2.1MB", sizeBytes: 2100000, date: "오늘", dateTimestamp: Date.now() - 3600000 },
  { id: 7, name: "계약서.pdf", type: "document", size: "890KB", sizeBytes: 890000, date: "오늘", dateTimestamp: Date.now() - 7200000 },
  { id: 8, name: "index.tsx", type: "code", size: "12KB", sizeBytes: 12000, date: "어제", dateTimestamp: Date.now() - 100800000 },
];

const categories = [
  { id: "image", label: "이미지", icon: Image, color: "hsl(340, 82%, 52%)" },
  { id: "document", label: "문서", icon: FileText, color: "hsl(207, 90%, 54%)" },
  { id: "video", label: "동영상", icon: Video, color: "hsl(270, 70%, 55%)" },
  { id: "audio", label: "오디오", icon: Music, color: "hsl(160, 84%, 39%)" },
  { id: "archive", label: "압축파일", icon: Archive, color: "hsl(35, 92%, 50%)" },
];

export default function DesktopView() {
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organized, setOrganized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<number | null>(null);
  const { toast } = useToast();

  const detailFile = selectedFileForDetail
    ? mockDesktopFiles.find((f) => f.id === selectedFileForDetail) || null
    : null;

  const addToHistory = (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setHistory((prev) => [newItem, ...prev]);
  };

  const filteredAndSortedFiles = useMemo(() => {
    let files = [...mockDesktopFiles];

    // Filter by search query
    if (searchQuery) {
      files = files.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (activeTypeFilter) {
      files = files.filter((file) => file.type === activeTypeFilter);
    }

    // Sort files
    files.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ko");
          break;
        case "date":
          comparison = b.dateTimestamp - a.dateTimestamp;
          break;
        case "size":
          comparison = b.sizeBytes - a.sizeBytes;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return files;
  }, [searchQuery, sortKey, sortOrder, activeTypeFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }

    // Add to history
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

  const toggleSelect = (id: number, isDoubleClick?: boolean) => {
    if (isDoubleClick) {
      setSelectedFileForDetail(id);
    } else {
      setSelectedFiles((prev) =>
        prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      );
    }
  };

  const handleOrganize = () => {
    setIsOrganizing(true);
    setTimeout(() => {
      setIsOrganizing(false);
      setOrganized(true);
      addToHistory({
        type: "organize",
        description: "바탕화면 자동 정리",
        details: `${mockDesktopFiles.length}개 파일을 유형별로 분류했습니다`,
      });
      toast({
        title: "정리 완료",
        description: "바탕화면 파일이 유형별로 정리되었습니다.",
      });
    }, 2000);
  };

  const handleUndo = (id: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, undone: true } : item
      )
    );

    const item = history.find((h) => h.id === id);
    if (item?.type === "organize") {
      setOrganized(false);
    }

    toast({
      title: "되돌리기 완료",
      description: "작업이 취소되었습니다.",
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    toast({
      title: "히스토리 삭제",
      description: "모든 작업 기록이 삭제되었습니다.",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTypeFilter(null);
    setSortKey("name");
    setSortOrder("asc");
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
              {mockDesktopFiles.length}개의 파일 · {selectedFiles.length}개 선택됨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            disabled={isOrganizing || organized}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              organized
                ? "bg-accent/20 text-accent"
                : "gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            }`}
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
      <div className="grid grid-cols-5 gap-4 mb-8">
        {categories.map((cat, index) => {
          const count = mockDesktopFiles.filter((f) => f.type === cat.id).length;
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
              onClick={() => setSelectedFiles(filteredAndSortedFiles.map((f) => f.id))}
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
          {organized ? (
            <motion.div
              className="grid grid-cols-5 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key="organized"
            >
              {categories.map((cat) => {
                const files = mockDesktopFiles.filter((f) => f.type === cat.id);
                if (files.length === 0) return null;
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
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="text-xs text-muted-foreground truncate"
                        >
                          {file.name}
                        </div>
                      ))}
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
              <p className="text-sm">검색 결과가 없습니다</p>
              <button
                onClick={clearFilters}
                className="mt-2 text-xs text-primary hover:underline"
              >
                필터 초기화
              </button>
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
                  key={file.id}
                  name={file.name}
                  type={file.type}
                  size={file.size}
                  date={file.date}
                  selected={selectedFiles.includes(file.id)}
                  onClick={() => toggleSelect(file.id)}
                  onDoubleClick={() => toggleSelect(file.id, true)}
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
        file={detailFile}
        isOpen={selectedFileForDetail !== null}
        onClose={() => setSelectedFileForDetail(null)}
      />
    </div>
  );
}
