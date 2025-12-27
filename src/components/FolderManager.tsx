import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderTree,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Search,
  RefreshCw,
  HardDrive,
  Loader2,
  File,
  Home,
  Monitor,
  Download,
  FileImage,
  Sparkles,
  ArrowLeft,
  Settings2,
  Plus,
  X,
  Package,
  Check,
} from "lucide-react";
import { fileApi, rulesApi, isTauri } from "@/lib/tauri-api";
import type { FileInfo, FileCategory, DriveInfo, UnifiedPreview } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_INFO } from "@/lib/types";

interface QuickAccessFolder {
  name: string;
  path: string;
}

interface ExtensionGroup {
  id: FileCategory;
  name: string;
  icon: typeof FileText;
  color: string;
  extensions: string[];
  folder: string;
  enabled: boolean;
}

// Map category to icon
const categoryIcons: Record<FileCategory, typeof FileText> = {
  images: Image,
  documents: FileText,
  videos: Video,
  music: Music,
  archives: Archive,
  installers: Package,
  code: Code,
  others: File,
};

// Icon mapping for quick access folders
const quickAccessIcons: Record<string, typeof Home> = {
  "홈": Home,
  "바탕화면": Monitor,
  "문서": FileText,
  "다운로드": Download,
  "사진": FileImage,
  "동영상": Video,
  "음악": Music,
};

// Default extension groups
const defaultExtensionGroups: ExtensionGroup[] = [
  {
    id: "images",
    name: "이미지",
    icon: Image,
    color: "hsl(340, 82%, 52%)",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".heic"],
    folder: "이미지",
    enabled: true,
  },
  {
    id: "documents",
    name: "문서",
    icon: FileText,
    color: "hsl(207, 90%, 54%)",
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".hwp"],
    folder: "문서",
    enabled: true,
  },
  {
    id: "videos",
    name: "동영상",
    icon: Video,
    color: "hsl(270, 70%, 55%)",
    extensions: [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"],
    folder: "동영상",
    enabled: true,
  },
  {
    id: "music",
    name: "오디오",
    icon: Music,
    color: "hsl(160, 84%, 39%)",
    extensions: [".mp3", ".wav", ".flac", ".aac", ".m4a", ".ogg", ".wma"],
    folder: "음악",
    enabled: true,
  },
  {
    id: "archives",
    name: "압축파일",
    icon: Archive,
    color: "hsl(35, 92%, 50%)",
    extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"],
    folder: "압축파일",
    enabled: true,
  },
  {
    id: "installers",
    name: "설치파일",
    icon: Package,
    color: "hsl(280, 70%, 50%)",
    extensions: [".exe", ".msi", ".dmg", ".pkg", ".deb", ".rpm", ".app"],
    folder: "설치파일",
    enabled: true,
  },
  {
    id: "code",
    name: "소스코드",
    icon: Code,
    color: "hsl(180, 70%, 45%)",
    extensions: [".js", ".ts", ".tsx", ".py", ".java", ".html", ".css", ".json", ".xml", ".yml", ".md"],
    folder: "코드",
    enabled: true,
  },
];

export default function FolderManager() {
  const [quickAccessFolders, setQuickAccessFolders] = useState<QuickAccessFolder[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [folderContents, setFolderContents] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Extension groups
  const [extensionGroups, setExtensionGroups] = useState<ExtensionGroup[]>(defaultExtensionGroups);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FileCategory | null>(null);
  const [newExtension, setNewExtension] = useState("");

  // Organize state
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizePreview, setOrganizePreview] = useState<UnifiedPreview[] | null>(null);
  const [showOrganizePanel, setShowOrganizePanel] = useState(false);
  const [disabledGroups, setDisabledGroups] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  // Load drives
  const loadDrives = useCallback(async () => {
    if (isTauri()) {
      try {
        const driveList = await fileApi.getDrives();
        setDrives(driveList);
      } catch (error) {
        console.error("Failed to load drives:", error);
      }
    }
  }, []);

  // Load quick access folders
  const loadQuickAccessFolders = useCallback(async () => {
    if (isTauri()) {
      try {
        const paths = await fileApi.getCommonPaths();
        setQuickAccessFolders(paths.map(([name, path]) => ({ name, path })));
      } catch (error) {
        console.error("Failed to load common paths:", error);
      }
    }
  }, []);

  // Navigate to folder
  const navigateTo = useCallback(async (path: string, addToHistory: boolean = true) => {
    setIsLoading(true);
    setShowOrganizePanel(false);
    setOrganizePreview(null);

    try {
      if (isTauri()) {
        if (addToHistory && currentPath && currentPath !== path) {
          setNavigationHistory(prev => [...prev, currentPath]);
        }

        const files = await fileApi.fastListDirectory(path);
        setFolderContents(files);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error("Failed to navigate:", error);
      const errorMsg = String(error);

      if (errorMsg.includes("Operation not permitted") || errorMsg.includes("Permission denied")) {
        toast({
          title: "접근 권한 없음",
          description: "이 폴더에 접근할 수 없습니다. 시스템 보호 폴더이거나 권한이 필요합니다.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "폴더 열기 실패",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, toast]);

  // Go back
  const goBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const previousPath = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      navigateTo(previousPath, false);
    }
  }, [navigationHistory, navigateTo]);

  // Go to parent folder
  const goToParent = useCallback(() => {
    if (currentPath && currentPath !== '/') {
      const parts = currentPath.split('/').filter(Boolean);
      if (parts.length > 1) {
        navigateTo('/' + parts.slice(0, -1).join('/'));
      } else {
        navigateTo('/');
      }
    }
  }, [currentPath, navigateTo]);

  // Preview organize
  const previewOrganize = useCallback(async () => {
    if (!currentPath) return;

    setIsLoading(true);
    setDisabledGroups(new Set());
    try {
      const preview = await rulesApi.previewUnified(currentPath);
      setOrganizePreview(preview);
      setShowOrganizePanel(true);
    } catch (error) {
      console.error("Failed to preview:", error);
      toast({
        title: "미리보기 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, toast]);

  // Execute organize
  const executeOrganize = useCallback(async () => {
    if (!currentPath) return;

    setIsOrganizing(true);
    try {
      // Filter out disabled groups
      const excludedDestinations = Array.from(disabledGroups);
      const result = await rulesApi.executeUnified(currentPath, excludedDestinations.length > 0 ? excludedDestinations : undefined);
      toast({
        title: "정리 완료",
        description: `${result.filesMoved}개 파일 이동, ${result.filesSkipped}개 건너뜀`,
      });
      setShowOrganizePanel(false);
      setOrganizePreview(null);
      await navigateTo(currentPath, false);
    } catch (error) {
      console.error("Failed to organize:", error);
      toast({
        title: "정리 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsOrganizing(false);
    }
  }, [currentPath, disabledGroups, navigateTo, toast]);

  // Toggle group in preview
  const togglePreviewGroup = useCallback((destination: string) => {
    setDisabledGroups(prev => {
      const next = new Set(prev);
      if (next.has(destination)) {
        next.delete(destination);
      } else {
        next.add(destination);
      }
      return next;
    });
  }, []);

  // Extension group management
  const addExtension = useCallback((groupId: FileCategory) => {
    if (!newExtension) return;
    const ext = newExtension.startsWith('.') ? newExtension.toLowerCase() : `.${newExtension.toLowerCase()}`;
    setExtensionGroups(prev =>
      prev.map(g =>
        g.id === groupId && !g.extensions.includes(ext)
          ? { ...g, extensions: [...g.extensions, ext] }
          : g
      )
    );
    setNewExtension("");
  }, [newExtension]);

  const removeExtension = useCallback((groupId: FileCategory, ext: string) => {
    setExtensionGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, extensions: g.extensions.filter(e => e !== ext) }
          : g
      )
    );
  }, []);

  const toggleGroupEnabled = useCallback((groupId: FileCategory) => {
    setExtensionGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, enabled: !g.enabled } : g
      )
    );
  }, []);

  const updateGroupFolder = useCallback((groupId: FileCategory, folder: string) => {
    setExtensionGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, folder } : g
      )
    );
  }, []);

  // Initial load
  useEffect(() => {
    loadDrives();
    loadQuickAccessFolders();
    fileApi.getDesktopPath().then(path => navigateTo(path, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter contents
  const filteredContents = folderContents.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate folders and files
  const folders = filteredContents.filter(f => f.isDirectory);
  const files = filteredContents.filter(f => !f.isDirectory);

  // Get current folder name
  const currentFolderName = currentPath.split('/').pop() || currentPath || "폴더 선택";

  // Count files per category
  const fileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of extensionGroups) {
      counts[group.id] = files.filter(f =>
        group.extensions.includes(f.extension.toLowerCase())
      ).length;
    }
    return counts;
  }, [files, extensionGroups]);

  // Group organize preview by destination
  const groupedPreview = useMemo(() => {
    if (!organizePreview) return null;
    return organizePreview.reduce((acc, item) => {
      const dest = item.destination;
      if (!acc[dest]) {
        acc[dest] = {
          destination: dest,
          matchType: item.matchType,
          ruleName: item.rule?.name,
          category: item.defaultRule?.category,
          categoryLabel: item.defaultRule?.category
            ? CATEGORY_INFO[item.defaultRule.category as FileCategory]?.label
            : undefined,
          files: [],
        };
      }
      acc[dest].files.push(item);
      return acc;
    }, {} as Record<string, { destination: string; matchType: string; ruleName?: string; category?: string; categoryLabel?: string; files: UnifiedPreview[] }>);
  }, [organizePreview]);

  // Calculate enabled files count
  const enabledFilesCount = useMemo(() => {
    if (!organizePreview) return 0;
    return organizePreview.filter(p => !disabledGroups.has(p.destination)).length;
  }, [organizePreview, disabledGroups]);

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center">
            <FolderTree className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">폴더 매니저</h1>
            <p className="text-sm text-muted-foreground">
              폴더를 탐색하고 파일을 확장자별로 정리하세요
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            showSettings
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings2 className="w-4 h-4" />
          <span>분류 설정</span>
        </motion.button>
      </div>

      {/* Extension Groups Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="glass rounded-2xl p-5 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">확장자 분류 그룹</h3>
                <span className="text-xs text-muted-foreground">
                  각 그룹을 클릭하여 확장자를 편집하세요
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {extensionGroups.map((group) => {
                  const isEditing = editingGroup === group.id;
                  const Icon = group.icon;
                  return (
                    <motion.div
                      key={group.id}
                      className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                        isEditing
                          ? "border-primary bg-primary/5"
                          : group.enabled
                            ? "border-border hover:border-primary/50 bg-secondary/30"
                            : "border-border/50 bg-muted/20 opacity-60"
                      }`}
                      onClick={() => setEditingGroup(isEditing ? null : group.id)}
                      layout
                    >
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleGroupEnabled(group.id); }}
                        className={`absolute top-2 right-2 w-8 h-4 rounded-full transition-colors ${
                          group.enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <motion.div
                          className="w-3 h-3 bg-white rounded-full shadow-sm"
                          animate={{ x: group.enabled ? 17 : 2 }}
                        />
                      </button>

                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${group.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: group.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fileCounts[group.id] || 0}개 파일
                          </p>
                        </div>
                      </div>

                      {/* Extensions */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.extensions.slice(0, isEditing ? undefined : 4).map((ext) => (
                          <span
                            key={ext}
                            className="relative group px-1.5 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${group.color}15`,
                              color: group.color,
                            }}
                          >
                            {ext}
                            {isEditing && (
                              <button
                                onClick={(e) => { e.stopPropagation(); removeExtension(group.id, ext); }}
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            )}
                          </span>
                        ))}
                        {!isEditing && group.extensions.length > 4 && (
                          <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                            +{group.extensions.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Editing UI */}
                      <AnimatePresence>
                        {isEditing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-border space-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newExtension}
                                onChange={(e) => setNewExtension(e.target.value)}
                                placeholder=".확장자"
                                className="flex-1 px-2 py-1 bg-secondary rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addExtension(group.id);
                                }}
                              />
                              <button
                                onClick={() => addExtension(group.id)}
                                className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">대상 폴더</label>
                              <input
                                type="text"
                                value={group.folder}
                                onChange={(e) => updateGroupFolder(group.id, e.target.value)}
                                className="w-full mt-1 px-2 py-1 bg-secondary rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Access & Drives */}
      <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {quickAccessFolders.map((folder) => {
            const IconComponent = quickAccessIcons[folder.name] || Folder;
            const isActive = currentPath === folder.path;
            return (
              <motion.button
                key={folder.path}
                onClick={() => navigateTo(folder.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <IconComponent className="w-4 h-4" />
                <span>{folder.name}</span>
              </motion.button>
            );
          })}

          <div className="w-px h-6 bg-border mx-2" />

          {drives.map((drive) => {
            const isActive = currentPath.startsWith(drive.path);
            return (
              <motion.button
                key={drive.path}
                onClick={() => navigateTo(drive.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={`${drive.availableFormatted} 사용 가능`}
              >
                <HardDrive className="w-4 h-4" />
                <span>{drive.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          <motion.button
            onClick={goBack}
            disabled={navigationHistory.length === 0}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="뒤로"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={goToParent}
            disabled={!currentPath || currentPath === '/'}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="상위 폴더"
          >
            <ChevronUp className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary/30 border border-border text-sm overflow-x-auto">
          <motion.button
            onClick={() => navigateTo('/')}
            className="px-1.5 py-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            whileHover={{ scale: 1.02 }}
          >
            /
          </motion.button>
          {currentPath.split('/').filter(Boolean).map((part, index, arr) => {
            const pathUpToHere = '/' + arr.slice(0, index + 1).join('/');
            const isLast = index === arr.length - 1;
            return (
              <span key={pathUpToHere} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <motion.button
                  onClick={() => !isLast && navigateTo(pathUpToHere)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    isLast
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer'
                  }`}
                  whileHover={!isLast ? { scale: 1.02 } : {}}
                  disabled={isLast}
                >
                  {part}
                </motion.button>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => navigateTo(currentPath, false)}
            disabled={isLoading}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            onClick={previewOrganize}
            disabled={!currentPath || isLoading || files.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="현재 폴더의 파일을 확장자별로 분류합니다"
          >
            <Sparkles className="w-4 h-4" />
            <span>정리하기</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-4">
        {/* File Browser */}
        <div className={`flex-1 glass rounded-2xl p-4 border border-border transition-all ${showOrganizePanel ? 'w-1/2' : 'w-full'}`}>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <FolderOpen className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">{currentFolderName}</span>
            <span className="text-sm text-muted-foreground">
              {folders.length}개 폴더, {files.length}개 파일
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Folder className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">폴더가 비어있습니다</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[calc(100vh-450px)] overflow-auto">
              {folders.map((folder) => (
                <motion.div
                  key={folder.path}
                  onClick={() => navigateTo(folder.path)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Folder className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">폴더</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              ))}

              {files.map((file) => {
                const IconComponent = categoryIcons[file.category] || File;
                const categoryColor = CATEGORY_INFO[file.category]?.color || "hsl(220, 10%, 50%)";
                return (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${categoryColor}20` }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: categoryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.sizeFormatted}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{file.modifiedAt.split(' ')[0]}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Organize Panel */}
        <AnimatePresence>
          {showOrganizePanel && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "50%" }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="glass rounded-2xl p-4 border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-foreground">정리 미리보기</h3>
                </div>
                <motion.button
                  onClick={() => setShowOrganizePanel(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {organizePreview && organizePreview.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {enabledFilesCount === organizePreview.length
                      ? `${organizePreview.length}개 파일이 분류됩니다`
                      : `${enabledFilesCount}개 파일이 분류됩니다 (${organizePreview.length - enabledFilesCount}개 제외)`}
                  </p>

                  <div className="space-y-2 max-h-[calc(100vh-550px)] overflow-auto mb-4">
                    {groupedPreview && Object.values(groupedPreview).map((group) => {
                      const isEnabled = !disabledGroups.has(group.destination);
                      const category = group.category as FileCategory | undefined;
                      const Icon = category ? categoryIcons[category] : Folder;
                      const color = category ? CATEGORY_INFO[category]?.color : undefined;

                      return (
                        <motion.div
                          key={group.destination}
                          className={`p-3 rounded-xl border transition-all ${
                            isEnabled
                              ? "bg-secondary/30 border-border"
                              : "bg-muted/20 border-border/50 opacity-60"
                          }`}
                          layout
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: color ? `${color}20` : "hsl(var(--secondary))" }}
                              >
                                <Icon
                                  className="w-4 h-4"
                                  style={{ color: color || "hsl(var(--primary))" }}
                                />
                              </div>
                              <div>
                                <span className={`text-sm font-medium ${isEnabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
                                  {group.ruleName || group.categoryLabel || '기타'}
                                </span>
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  group.matchType === 'custom'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {group.matchType === 'custom' ? '사용자 규칙' : '확장자 기반'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => togglePreviewGroup(group.destination)}
                              className={`w-10 h-5 rounded-full transition-colors ${
                                isEnabled ? "bg-primary" : "bg-muted"
                              }`}
                            >
                              <motion.div
                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                animate={{ x: isEnabled ? 22 : 2 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 pl-10">
                            → {group.destination.split('/').slice(-2).join('/')}
                          </p>
                          <div className="space-y-0.5 pl-10">
                            {group.files.slice(0, 3).map((item) => (
                              <div key={item.file.path} className="text-xs text-muted-foreground flex items-center gap-1">
                                <File className="w-3 h-3" />
                                <span className="truncate">{item.file.name}</span>
                              </div>
                            ))}
                            {group.files.length > 3 && (
                              <div className="text-xs text-muted-foreground pl-4">
                                ... 외 {group.files.length - 3}개
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => {
                        setShowOrganizePanel(false);
                        setOrganizePreview(null);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      취소
                    </motion.button>
                    <motion.button
                      onClick={executeOrganize}
                      disabled={isOrganizing || enabledFilesCount === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isOrganizing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>정리 중...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>정리 실행</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </>
              ) : organizePreview && organizePreview.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <File className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">정리할 파일이 없습니다</p>
                  <p className="text-xs mt-1">모든 파일이 이미 정리되어 있습니다</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
