import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FolderTree,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Plus,
  Search,
  MoreHorizontal,
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
} from "lucide-react";
import { fileApi, analyzerApi, rulesApi, isTauri, formatFileSize } from "@/lib/tauri-api";
import type { FileInfo, FolderTreeNode, FileCategory, DriveInfo, FolderStats } from "@/lib/types";
import RulePreviewModal from "./RuleManagement/RulePreviewModal";
import { useToast } from "@/hooks/use-toast";

interface FolderItem {
  id: string;
  name: string;
  path: string;
  children?: FolderItem[];
  files?: number;
  isExpanded?: boolean;
}

interface QuickAccessFolder {
  name: string;
  path: string;
}

// Map category to icon
const categoryIcons: Record<FileCategory, typeof FileText> = {
  images: Image,
  documents: FileText,
  videos: Video,
  music: Music,
  archives: Archive,
  installers: Archive,
  code: Code,
  others: File,
};

function convertTreeNodeToFolderItem(node: FolderTreeNode, parentPath: string = ""): FolderItem {
  const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  return {
    id: fullPath,
    name: node.name,
    path: node.path,
    files: node.fileCount,
    children: node.children?.map(child => convertTreeNodeToFolderItem(child, fullPath)),
  };
}

function FolderTreeItem({
  folder,
  level = 0,
  selectedId,
  onSelect,
}: {
  folder: FolderItem;
  level?: number;
  selectedId: string | null;
  onSelect: (folder: FolderItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedId === folder.id;

  return (
    <div>
      <motion.div
        onClick={() => {
          onSelect(folder);
          if (hasChildren) setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? "bg-primary/15 text-primary"
            : "text-foreground hover:bg-secondary"
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        whileHover={{ x: 2 }}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        {isOpen && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-primary" />
        ) : (
          <Folder className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
        {folder.files !== undefined && (
          <span className="text-xs text-muted-foreground">{folder.files}</span>
        )}
      </motion.div>

      {hasChildren && isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          {folder.children?.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

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

export default function FolderManager() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [quickAccessFolders, setQuickAccessFolders] = useState<QuickAccessFolder[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [folderContents, setFolderContents] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [currentBasePath, setCurrentBasePath] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [folderStats, setFolderStats] = useState<FolderStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
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

  // Load folder tree for a specific path
  const loadFolderTree = useCallback(async (basePath?: string, addToHistory: boolean = true) => {
    setIsLoadingTree(true);
    try {
      if (isTauri()) {
        const pathToUse = basePath || await fileApi.getDesktopPath();

        // Add to navigation history
        if (addToHistory && currentBasePath && currentBasePath !== pathToUse) {
          setNavigationHistory(prev => [...prev, currentBasePath]);
        }

        setCurrentBasePath(pathToUse);
        const tree = await analyzerApi.getFolderTree(pathToUse, 3);
        const folderItem = convertTreeNodeToFolderItem(tree, "");
        setFolders([folderItem]);

        // Auto-select the root folder
        setSelectedFolder(folderItem);
      }
    } catch (error) {
      console.error("Failed to load folder tree:", error);
      toast({
        title: "폴더 트리 로드 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoadingTree(false);
    }
  }, [toast]);

  // Load folder contents when selection changes
  const loadFolderContents = useCallback(async (folder: FolderItem) => {
    setIsLoadingContents(true);
    try {
      if (isTauri()) {
        const files = await fileApi.scanDirectory(folder.path, false, false);
        setFolderContents(files);
      }
    } catch (error) {
      console.error("Failed to load folder contents:", error);
      toast({
        title: "폴더 내용 로드 실패",
        description: String(error),
        variant: "destructive",
      });
      setFolderContents([]);
    } finally {
      setIsLoadingContents(false);
    }
  }, [toast]);

  // Load folder statistics
  const loadFolderStats = useCallback(async (path: string) => {
    setIsLoadingStats(true);
    setFolderStats(null);
    try {
      if (isTauri()) {
        const stats = await analyzerApi.analyzeFolder(path);
        setFolderStats(stats);
      }
    } catch (error) {
      console.error("Failed to load folder stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadDrives();
    loadQuickAccessFolders();
    loadFolderTree();
  }, [loadDrives, loadQuickAccessFolders, loadFolderTree]);

  // Load folder stats when currentBasePath changes
  useEffect(() => {
    if (currentBasePath) {
      loadFolderStats(currentBasePath);
    }
  }, [currentBasePath, loadFolderStats]);

  const handleQuickAccessClick = (folder: QuickAccessFolder) => {
    loadFolderTree(folder.path);
  };

  const handleDriveClick = (drive: DriveInfo) => {
    loadFolderTree(drive.path);
  };

  // Go back to previous folder
  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previousPath = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      loadFolderTree(previousPath, false);
    }
  };

  // Go to parent folder
  const handleGoToParent = () => {
    if (currentBasePath) {
      const parentPath = currentBasePath.split('/').slice(0, -1).join('/');
      if (parentPath) {
        loadFolderTree(parentPath);
      }
    }
  };

  // Organize current folder
  const handleOrganizeFolder = async (excludedDestinations?: string[]) => {
    if (!currentBasePath) return;

    setIsOrganizing(true);
    try {
      const result = await rulesApi.executeUnified(currentBasePath, excludedDestinations);
      toast({
        title: "정리 완료",
        description: `${result.filesMoved}개 파일 이동, ${result.filesSkipped}개 건너뜀`,
      });
      // Refresh the folder contents
      await loadFolderTree(currentBasePath, false);
      setShowPreviewModal(false);
    } catch (error) {
      toast({
        title: "정리 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  useEffect(() => {
    if (selectedFolder) {
      loadFolderContents(selectedFolder);
    }
  }, [selectedFolder, loadFolderContents]);

  const handleSelectFolder = (folder: FolderItem) => {
    setSelectedFolder(folder);
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "폴더 이름을 입력하세요",
        variant: "destructive",
      });
      return;
    }

    const parentPath = selectedFolder?.path || currentBasePath;
    if (!parentPath) {
      toast({
        title: "폴더를 먼저 선택하세요",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isTauri()) {
        const newFolderPath = `${parentPath}/${newFolderName.trim()}`;
        await fileApi.createFolder(newFolderPath);
        toast({
          title: "폴더 생성 완료",
          description: `'${newFolderName.trim()}' 폴더가 생성되었습니다.`,
        });
        // Refresh the folder tree and contents
        await loadFolderTree(currentBasePath);
        if (selectedFolder) {
          await loadFolderContents(selectedFolder);
        }
      } else {
        toast({
          title: "폴더 생성 완료 (시뮬레이션)",
          description: `'${newFolderName.trim()}' 폴더가 생성되었습니다.`,
        });
      }
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast({
        title: "폴더 생성 실패",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContents = folderContents.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigate into a folder from the contents panel
  const handleNavigateToFolder = async (file: FileInfo) => {
    if (!file.isDirectory) return;

    // Create a FolderItem for the clicked folder
    const folderItem: FolderItem = {
      id: file.path,
      name: file.name,
      path: file.path,
    };

    // Load the folder tree from this new path
    await loadFolderTree(file.path);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center">
          <FolderTree className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">폴더 매니저</h1>
          <p className="text-sm text-muted-foreground">
            폴더를 탐색하고, 설정된 규칙에 따라 파일을 자동 분류하세요
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <motion.button
            onClick={() => loadFolderTree(undefined, false)}
            disabled={isLoadingTree}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTree ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </motion.button>
          <motion.button
            onClick={() => setShowPreviewModal(true)}
            disabled={!currentBasePath || isOrganizing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="규칙 설정에 따라 파일을 카테고리별 폴더로 자동 분류합니다"
          >
            <Sparkles className={`w-4 h-4 ${isOrganizing ? 'animate-spin' : ''}`} />
            <span>규칙 기반 정리</span>
          </motion.button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-secondary/30 border border-border">
        <motion.button
          onClick={handleGoBack}
          disabled={navigationHistory.length === 0}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="뒤로"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <motion.button
          onClick={handleGoToParent}
          disabled={!currentBasePath || currentBasePath === '/'}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="상위 폴더"
        >
          <FolderOpen className="w-4 h-4" />
        </motion.button>
        <div className="flex-1 px-3 py-1.5 text-sm text-muted-foreground truncate">
          {currentBasePath || "경로를 선택하세요"}
        </div>
      </div>

      {/* Folder Stats */}
      {currentBasePath && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                {currentBasePath.split('/').pop() || currentBasePath}
              </span>
            </div>
            {isLoadingStats ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : folderStats ? (
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">총 크기:</span>
                  <span className="font-medium text-foreground">{folderStats.totalSizeFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">파일:</span>
                  <span className="font-medium text-foreground">{folderStats.fileCount}개</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">폴더:</span>
                  <span className="font-medium text-foreground">{folderStats.folderCount}개</span>
                </div>
              </div>
            ) : null}
          </div>
          {folderStats && Object.keys(folderStats.categoryBreakdown).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">카테고리별 파일 분포</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(folderStats.categoryBreakdown).map(([category, stats]) => (
                  <div
                    key={category}
                    className="px-2.5 py-1 rounded-lg bg-secondary/50 text-xs"
                  >
                    <span className="text-foreground font-medium">{category}</span>
                    <span className="text-muted-foreground ml-1.5">
                      {stats.count}개 ({stats.totalSizeFormatted})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drives Section */}
      {drives.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-3">드라이브 / 볼륨</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {drives.map((drive) => {
              const isActive = currentBasePath === drive.path;
              return (
                <motion.button
                  key={drive.path}
                  onClick={() => handleDriveClick(drive)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-primary/20' : 'bg-secondary'
                  }`}>
                    <HardDrive className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{drive.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {drive.availableFormatted} 사용 가능 / {drive.totalFormatted}
                    </p>
                    <div className="mt-1.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          drive.usagePercent > 90 ? 'bg-red-500' :
                          drive.usagePercent > 70 ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${drive.usagePercent}%` }}
                      />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Folder Tree */}
        <div className="w-80 glass rounded-2xl p-4 border border-border h-fit max-h-[calc(100vh-300px)] overflow-auto">
          {/* Quick Access */}
          {quickAccessFolders.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">빠른 액세스</p>
              <div className="flex flex-wrap gap-2">
                {quickAccessFolders.map((folder) => {
                  const IconComponent = quickAccessIcons[folder.name] || Folder;
                  const isActive = currentBasePath === folder.path;
                  return (
                    <motion.button
                      key={folder.path}
                      onClick={() => handleQuickAccessClick(folder)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{folder.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="폴더 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Tree */}
          {isLoadingTree ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  selectedId={selectedFolder?.id || null}
                  onSelect={handleSelectFolder}
                />
              ))}
              {filteredFolders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isTauri() ? "폴더가 없습니다" : "Tauri 환경에서만 사용 가능합니다"}
                </p>
              )}
            </div>
          )}

          {/* Add Folder */}
          {isCreatingFolder ? (
            <div className="mt-4 p-3 rounded-xl border border-primary/50 bg-secondary/30">
              <input
                type="text"
                placeholder="폴더 이름 입력..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
              />
              <div className="flex gap-2">
                <motion.button
                  onClick={handleCreateFolder}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  생성
                </motion.button>
                <motion.button
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName("");
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  취소
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button
              onClick={() => setIsCreatingFolder(true)}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">새 폴더</span>
            </motion.button>
          )}
        </div>

        {/* Folder Content */}
        <div className="flex-1 glass rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-medium text-foreground truncate max-w-[300px]">
                {selectedFolder?.name || "폴더를 선택하세요"}
              </h2>
              {selectedFolder && (
                <span className="px-2 py-1 text-xs bg-primary/15 text-primary rounded-lg">
                  {folderContents.length} 항목
                </span>
              )}
            </div>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* File List */}
          {isLoadingContents ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Folder className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">
                {selectedFolder ? "폴더가 비어있습니다" : "폴더를 선택하세요"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-auto">
              {filteredContents.map((file, index) => {
                const IconComponent = file.isDirectory
                  ? Folder
                  : categoryIcons[file.category] || File;

                return (
                  <motion.div
                    key={file.path}
                    onClick={() => file.isDirectory && handleNavigateToFolder(file)}
                    className={`flex items-center gap-4 p-3 rounded-xl hover:bg-secondary transition-colors ${
                      file.isDirectory ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={file.isDirectory ? { x: 4 } : {}}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      file.isDirectory ? 'bg-accent/10' : 'bg-primary/10'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        file.isDirectory ? 'text-accent' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.isDirectory ? "폴더 - 클릭하여 열기" : file.sizeFormatted}
                      </p>
                    </div>
                    {file.isDirectory && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {file.modifiedAt.split(' ')[0]}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && currentBasePath && (
        <RulePreviewModal
          sourcePath={currentBasePath}
          onClose={() => setShowPreviewModal(false)}
          onExecute={handleOrganizeFolder}
        />
      )}
    </div>
  );
}
