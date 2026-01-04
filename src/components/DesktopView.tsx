import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  LayoutGrid,
  List,
  Folder,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import FileCard from "./FileCard";
import HistoryPanel, { HistoryItem } from "./HistoryPanel";
import FileDetailPanel from "./FileDetailPanel";
import OrganizeRulesModal from "./OrganizeRulesModal";
import RulePreviewModal from "./RuleManagement/RulePreviewModal";
import { BackupManager } from "./BackupManager";
import { EmptyState } from "./EmptyState";
import { SkeletonLoader } from "./SkeletonLoader";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { SelectionToolbar } from "./SelectionToolbar";
import { AdvancedSearch, type AdvancedSearchFilters } from "./AdvancedSearch";
import { QuickLookModal } from "./QuickLookModal";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";
import { useFileDragDrop } from "@/hooks/useFileDragDrop";
import { handleError } from "@/utils/errorHandler";
import { fileApi, historyApi, rulesApi, isTauri, formatRelativeDate } from "@/lib/tauri-api";
import type { FileInfo, FileCategory } from "@/lib/types";

type SortKey = "name" | "date" | "size" | "category";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";

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
  { id: "installers", label: "설치파일", icon: Package, color: "hsl(280, 70%, 50%)" },
  { id: "code", label: "코드", icon: Code, color: "hsl(200, 70%, 50%)" },
  { id: "others", label: "기타", icon: File, color: "hsl(220, 10%, 50%)" },
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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [desktopPath, setDesktopPath] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true); // Default to true initially
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [isQuickLookOpen, setIsQuickLookOpen] = useState(false);
  const [quickLookFile, setQuickLookFile] = useState<FileInfo | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({
    categories: [],
    extensions: [],
  });
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const dragDrop = useFileDragDrop();

  // Check scroll position for category cards
  const checkScrollPosition = useCallback(() => {
    const container = categoriesScrollRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;

      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < maxScroll - 5);
    }
  }, []);

  // Scroll categories left/right
  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoriesScrollRef.current;
    if (container) {
      const scrollAmount = 200;
      const currentScroll = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      let newScrollLeft: number;
      if (direction === 'left') {
        newScrollLeft = Math.max(0, currentScroll - scrollAmount);
      } else {
        newScrollLeft = Math.min(maxScroll, currentScroll + scrollAmount);
      }

      // Use direct scrollLeft assignment for immediate effect
      container.scrollLeft = newScrollLeft;

      // Update state after scroll
      setTimeout(() => {
        checkScrollPosition();
      }, 50);
    }
  };

  // Check scroll on mount and resize
  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, [checkScrollPosition]);

  // Check scroll after categories are rendered
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      checkScrollPosition();
    }, 100);
    return () => clearTimeout(timer);
  }, [categories.length, checkScrollPosition]);

  // Load files on mount
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    console.log("[DesktopView] isTauri:", isTauri());
    try {
      if (isTauri()) {
        const [desktopFiles, path] = await Promise.all([
          fileApi.scanDesktop(),
          fileApi.getDesktopPath(),
        ]);
        setFiles(desktopFiles.filter(f => !f.isDirectory));
        setDesktopPath(path);
      } else {
        // Use mock data for development
        setFiles(mockDesktopFiles);
        setDesktopPath("/Users/mock/Desktop");
      }
    } catch (error) {
      handleError(error, toast, {
        title: "파일 로드 실패",
        onActionClick: loadFiles,
      });
      // Don't fallback to mock data in Tauri - show the error instead
      if (!isTauri()) {
        setFiles(mockDesktopFiles);
        setDesktopPath("/Users/mock/Desktop");
      } else {
        setFiles([]);
      }
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

  // Get unique extensions from all files
  const availableExtensions = useMemo(() => {
    const extensions = new Set(files.map(f => f.extension));
    return Array.from(extensions).sort();
  }, [files]);

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

    // Apply advanced filters
    if (advancedFilters.categories.length > 0) {
      filtered = filtered.filter((file) => advancedFilters.categories.includes(file.category));
    }

    if (advancedFilters.extensions.length > 0) {
      filtered = filtered.filter((file) => advancedFilters.extensions.includes(file.extension));
    }

    if (advancedFilters.minSize !== undefined) {
      filtered = filtered.filter((file) => file.size >= advancedFilters.minSize!);
    }

    if (advancedFilters.maxSize !== undefined) {
      filtered = filtered.filter((file) => file.size <= advancedFilters.maxSize!);
    }

    if (advancedFilters.dateFrom !== undefined) {
      filtered = filtered.filter((file) => 
        new Date(file.modifiedAt) >= advancedFilters.dateFrom!
      );
    }

    if (advancedFilters.dateTo !== undefined) {
      // Set to end of day for inclusive date range
      const endOfDay = new Date(advancedFilters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((file) => 
        new Date(file.modifiedAt) <= endOfDay
      );
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
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [files, searchQuery, sortKey, sortOrder, activeTypeFilter, advancedFilters]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }

    const sortLabels = { name: "이름", date: "날짜", size: "크기", category: "종류" };
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

  const toggleSelect = (path: string, isDoubleClick?: boolean, shiftKey?: boolean) => {
    if (isDoubleClick) {
      setSelectedFileForDetail(path);
      return;
    }

    const currentIndex = filteredAndSortedFiles.findIndex(f => f.path === path);

    // Handle Shift+Click for range selection
    if (shiftKey && lastSelectedIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeFiles = filteredAndSortedFiles.slice(start, end + 1).map(f => f.path);
      
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        rangeFiles.forEach(p => newSet.add(p));
        return Array.from(newSet);
      });
    } else {
      // Normal toggle
      setSelectedFiles((prev) =>
        prev.includes(path) ? prev.filter((f) => f !== path) : [...prev, path]
      );
      setLastSelectedIndex(currentIndex);
    }
  };

  // Open preview modal instead of executing directly
  const handleOrganize = () => {
    setIsPreviewModalOpen(true);
  };

  // Execute unified organization (called from preview modal)
  const executeOrganization = async (excludedDestinations?: string[]) => {
    setIsOrganizing(true);

    try {
      if (isTauri()) {
        // Execute unified organization with rules applied
        const result = await rulesApi.executeUnified(desktopPath, excludedDestinations);

        if (result.success) {
          setOrganized(true);
          addToHistory({
            type: "organize",
            description: "바탕화면 자동 정리 (규칙 적용)",
            details: `${result.filesMoved}개 파일을 규칙에 따라 분류했습니다`,
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
      handleError(error, toast, {
        title: "정리 실패",
        onActionClick: handleOrganize,
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
      handleError(error, toast, {
        title: "되돌리기 실패",
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
      handleError(error, toast, {
        title: "삭제 실패",
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTypeFilter(null);
    setSortKey("name");
    setSortOrder("asc");
    setAdvancedFilters({
      categories: [],
      extensions: [],
    });
  };

  const handleRefresh = () => {
    setOrganized(false);
    loadFiles();
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredAndSortedFiles.length) {
      setSelectedFiles([]);
      setLastSelectedIndex(-1);
    } else {
      setSelectedFiles(filteredAndSortedFiles.map(f => f.path));
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
    setLastSelectedIndex(-1);
  };

  const handleMoveSelected = () => {
    // TODO: Implement move dialog
    toast({
      title: "이동 예정",
      description: `${selectedFiles.length}개 파일을 이동합니다.`,
    });
  };

  const handleCopySelected = () => {
    // TODO: Implement copy dialog
    toast({
      title: "복사 예정",
      description: `${selectedFiles.length}개 파일을 복사합니다.`,
    });
  };

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    
    // TODO: Implement delete confirmation and execution
    toast({
      title: "삭제 예정",
      description: `${selectedFiles.length}개 파일을 삭제합니다.`,
    });
  };

  const handleUndoLast = async () => {
    const lastUndoableItem = history.find(item => !item.undone);
    if (lastUndoableItem) {
      await handleUndo(lastUndoableItem.id);
    }
  };

  const handleQuickLook = () => {
    if (selectedFiles.length === 1) {
      const file = files.find(f => f.path === selectedFiles[0]);
      if (file) {
        setQuickLookFile(file);
        setIsQuickLookOpen(true);
      }
    } else if (selectedFiles.length > 1) {
      // Show first selected file
      const file = files.find(f => f.path === selectedFiles[0]);
      if (file) {
        setQuickLookFile(file);
        setIsQuickLookOpen(true);
      }
    }
  };

  // Handle file drop to category
  const handleFileDrop = async (files: FileInfo[], targetCategory: string) => {
    try {
      if (!isTauri()) {
        toast({
          title: "이동 시뮬레이션",
          description: `${files.length}개 파일을 ${targetCategory}(으)로 이동합니다.`,
        });
        return;
      }

      // TODO: Implement actual file move operation via Tauri
      // This would call a backend function to move files to category folder
      toast({
        title: "파일 이동",
        description: `${files.length}개 파일을 ${targetCategory}(으)로 이동했습니다.`,
      });

      addToHistory({
        type: "organize",
        description: `드래그 앤 드롭으로 파일 이동`,
        details: `${files.length}개 파일을 ${targetCategory}(으)로 이동했습니다`,
      });

      // Reload files after move
      await loadFiles();
    } catch (error) {
      handleError(error, toast, {
        title: "파일 이동 실패",
      });
    }
  };

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'a',
      ctrl: true,
      handler: handleSelectAll,
      description: '모두 선택 / 선택 해제',
      category: '선택',
    },
    {
      key: 'f',
      ctrl: true,
      handler: handleFocusSearch,
      description: '검색 포커스',
      category: '탐색',
    },
    {
      key: 'o',
      ctrl: true,
      handler: handleOrganize,
      description: '자동 정리',
      category: '작업',
    },
    {
      key: 'z',
      ctrl: true,
      handler: handleUndoLast,
      description: '마지막 작업 되돌리기',
      category: '작업',
    },
    {
      key: 'Delete',
      handler: handleDeleteSelected,
      description: '선택한 파일 삭제',
      category: '작업',
    },
    {
      key: ' ',
      handler: () => {
        if (isQuickLookOpen) {
          setIsQuickLookOpen(false);
          setQuickLookFile(null);
        } else {
          handleQuickLook();
        }
      },
      description: '빠른 보기 (선택한 파일)',
      category: '탐색',
    },
    {
      key: '/',
      ctrl: true,
      handler: () => setIsShortcutsHelpOpen(true),
      description: '단축키 도움말 표시',
      category: '도움말',
    },
    {
      key: '?',
      handler: () => setIsShortcutsHelpOpen(true),
      description: '단축키 도움말 표시',
      category: '도움말',
    },
    {
      key: 'Escape',
      handler: () => {
        if (isQuickLookOpen) {
          setIsQuickLookOpen(false);
          setQuickLookFile(null);
        } else if (selectedFileForDetail) {
          setSelectedFileForDetail(null);
        } else if (selectedFiles.length > 0) {
          setSelectedFiles([]);
        }
      },
      description: '선택 해제 / 패널 닫기',
      category: '탐색',
    },
    {
      key: 'r',
      ctrl: true,
      handler: handleRefresh,
      description: '새로고침',
      category: '작업',
    },
  ];

  // Apply keyboard shortcuts
  useKeyboardShortcuts(shortcuts, true);

  return (
    <TooltipProvider>
      <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 flex-shrink-0">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Backup Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setIsBackupOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-all text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">백업</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>
              <p>바탕화면 백업 관리</p>
            </TooltipContent>
          </Tooltip>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">새로고침</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>
              <p>파일 목록 새로고침</p>
            </TooltipContent>
          </Tooltip>

          {/* Rules Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setIsRulesModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">정리 규칙</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>
              <p>파일 정리 규칙 설정</p>
            </TooltipContent>
          </Tooltip>

          {/* History Button */}
          <motion.button
            onClick={() => setIsHistoryOpen(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-all text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="히스토리"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">히스토리</span>
            {history.filter((h) => !h.undone).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {history.filter((h) => !h.undone).length}
              </span>
            )}
          </motion.button>

          {/* Organize Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleOrganize}
                disabled={isOrganizing || organized || isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
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
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    <span>정리 중...</span>
                  </>
                ) : organized ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>정리 완료!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>자동 정리</span>
                  </>
                )}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>
              <p>카테고리별로 파일을 자동 정리합니다</p>
              <p className="text-xs text-muted-foreground mt-1">단축키: Ctrl+O</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Categories Overview - Clickable Filter with Horizontal Scroll */}
      <div className="mb-8">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 32px',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {/* Left Arrow */}
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={categoriesScrollRef}
            onScroll={checkScrollPosition}
            className="overflow-x-auto pb-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
            }}
          >
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {categories.map((cat) => {
                const count = files.filter((f) => f.category === cat.id).length;
                const isActive = activeTypeFilter === cat.id;
                const isDropTarget = dragDrop.state.dropTarget === cat.id;
                const isDragging = dragDrop.state.isDragging;

                return (
                  <motion.div
                    key={cat.id}
                    onClick={() => setActiveTypeFilter(isActive ? null : cat.id)}
                    onDragOver={(e) => {
                      if (isDragging) {
                        e.preventDefault();
                        dragDrop.setDropTarget(cat.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragDrop.state.dropTarget === cat.id) {
                        dragDrop.setDropTarget(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      dragDrop.executeDrop((files) => handleFileDrop(files, cat.label));
                    }}
                    className={`w-[130px] p-3 rounded-xl glass border cursor-pointer transition-all ${
                      isActive
                        ? "border-primary shadow-glow"
                        : isDropTarget
                        ? "border-green-500 shadow-glow bg-green-500/10 scale-105"
                        : "border-border hover:border-primary/30"
                    } ${isDragging ? "hover:scale-105" : "hover:scale-[1.02] hover:-translate-y-0.5"}`}
                    animate={{
                      scale: isDropTarget ? 1.05 : 1,
                      borderColor: isDropTarget ? "rgb(34 197 94)" : undefined,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {count}개 파일
                      {isDropTarget && " • 드롭하세요"}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Files Grid */}
      <div className="glass rounded-2xl p-6 border border-border">
        {/* Advanced Search */}
        <AdvancedSearch
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          availableExtensions={availableExtensions}
        />

        {/* Files Display Area */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="loading"
            >
              <SkeletonLoader type={viewMode} count={12} />
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
            <EmptyState
              key="empty"
              type={searchQuery ? "no-search-results" : activeTypeFilter ? "no-category-files" : "no-files"}
              message={
                searchQuery
                  ? `"${searchQuery}"에 대한 검색 결과가 없습니다`
                  : activeTypeFilter
                  ? "선택한 카테고리에 파일이 없습니다"
                  : undefined
              }
              action={
                searchQuery || activeTypeFilter
                  ? { label: "필터 초기화", onClick: clearFilters }
                  : undefined
              }
            />
          ) : viewMode === "grid" ? (
            <motion.div
              className="grid grid-cols-4 gap-4"
              key="files-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredAndSortedFiles.map((file, index) => {
                const isDraggingThis = dragDrop.isDraggingFile(file.path);
                
                return (
                  <div
                    key={file.path}
                    draggable={true}
                    onDragStart={(e: React.DragEvent) => {
                      // If file is not selected, select only this file
                      // If file is selected, drag all selected files
                      const filesToDrag = selectedFiles.includes(file.path)
                        ? files.filter(f => selectedFiles.includes(f.path))
                        : [file];
                      
                      dragDrop.startDrag(filesToDrag);
                      
                      // Set drag image
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', filesToDrag.length.toString());
                    }}
                    onDragEnd={() => {
                      dragDrop.endDrag();
                    }}
                    onClick={(e) => toggleSelect(file.path, false, e.shiftKey)}
                    onDoubleClick={() => toggleSelect(file.path, true)}
                    style={{
                      opacity: isDraggingThis ? 0.5 : 1,
                      transform: isDraggingThis ? 'scale(0.95)' : 'scale(1)',
                      transition: 'opacity 0.2s, transform 0.2s',
                    }}
                    className={isDraggingThis ? "cursor-grabbing" : "cursor-grab"}
                  >
                    <FileCard
                      name={file.name}
                      type={categoryToType[file.category] as "image" | "document" | "video" | "audio" | "archive" | "code"}
                      size={file.sizeFormatted}
                      date={formatRelativeDate(file.modifiedAt)}
                      selected={selectedFiles.includes(file.path)}
                    />
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              className="space-y-1"
              key="files-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* List Header */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                <div className="w-6" /> {/* Checkbox space */}
                <div className="w-10" /> {/* Icon space */}
                <div className="flex-1">파일명</div>
                <div className="w-24 text-right">크기</div>
                <div className="w-32 text-right">수정일</div>
                <div className="w-20 text-right">종류</div>
              </div>
              {filteredAndSortedFiles.map((file, index) => {
                const IconComponent = categoryIcons[file.category] || File;
                const categoryInfo = categories.find(c => c.id === file.category);
                return (
                  <motion.div
                    key={file.path}
                    className={`flex items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
                      selectedFiles.includes(file.path)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-secondary border border-transparent"
                    }`}
                    onClick={(e) => toggleSelect(file.path, false, e.shiftKey)}
                    onDoubleClick={() => toggleSelect(file.path, true)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.path)}
                      onChange={() => toggleSelect(file.path)}
                      className="w-4 h-4 rounded border-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${categoryInfo?.color || 'hsl(0, 0%, 50%)'}20` }}
                    >
                      <IconComponent
                        className="w-5 h-5"
                        style={{ color: categoryInfo?.color || 'hsl(0, 0%, 50%)' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.extension}</p>
                    </div>
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {file.sizeFormatted}
                    </div>
                    <div className="w-32 text-right text-sm text-muted-foreground">
                      {formatRelativeDate(file.modifiedAt)}
                    </div>
                    <div className="w-20 text-right">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${categoryInfo?.color || 'hsl(0, 0%, 50%)'}15`,
                          color: categoryInfo?.color || 'hsl(0, 0%, 50%)'
                        }}
                      >
                        {categoryInfo?.label || '기타'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
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

      {/* QuickLook Modal */}
      <QuickLookModal
        file={quickLookFile}
        isOpen={isQuickLookOpen}
        onClose={() => {
          setIsQuickLookOpen(false);
          setQuickLookFile(null);
        }}
      />

      {/* Organize Rules Modal */}
      <OrganizeRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        sourcePath={desktopPath}
        onPreview={() => {
          setIsRulesModalOpen(false);
          setIsPreviewModalOpen(true);
        }}
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

      {/* Rule Preview Modal */}
      <RulePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        sourcePath={desktopPath}
        onExecute={executeOrganization}
      />

      {/* Backup Manager */}
      <BackupManager
        open={isBackupOpen}
        onOpenChange={setIsBackupOpen}
      />

      </div>

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={isShortcutsHelpOpen}
        onOpenChange={setIsShortcutsHelpOpen}
        shortcuts={shortcuts}
      />

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedFiles.length}
        totalCount={filteredAndSortedFiles.length}
        isAllSelected={selectedFiles.length === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onMove={handleMoveSelected}
        onCopy={handleCopySelected}
        onDelete={handleDeleteSelected}
      />
    </TooltipProvider>
  );
}
