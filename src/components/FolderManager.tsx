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
} from "lucide-react";
import { fileApi, analyzerApi, isTauri, formatFileSize } from "@/lib/tauri-api";
import type { FileInfo, FolderTreeNode, FileCategory } from "@/lib/types";
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
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [folderContents, setFolderContents] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [currentBasePath, setCurrentBasePath] = useState<string>("");
  const { toast } = useToast();

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
  const loadFolderTree = useCallback(async (basePath?: string) => {
    setIsLoadingTree(true);
    try {
      if (isTauri()) {
        const pathToUse = basePath || await fileApi.getDesktopPath();
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

  useEffect(() => {
    loadQuickAccessFolders();
    loadFolderTree();
  }, [loadQuickAccessFolders, loadFolderTree]);

  const handleQuickAccessClick = (folder: QuickAccessFolder) => {
    loadFolderTree(folder.path);
  };

  useEffect(() => {
    if (selectedFolder) {
      loadFolderContents(selectedFolder);
    }
  }, [selectedFolder, loadFolderContents]);

  const handleSelectFolder = (folder: FolderItem) => {
    setSelectedFolder(folder);
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContents = folderContents.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center">
          <FolderTree className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">폴더 매니저</h1>
          <p className="text-sm text-muted-foreground">
            전체 폴더 구조를 탐색하고 관리하세요
          </p>
        </div>
        <div className="ml-auto">
          <motion.button
            onClick={loadFolderTree}
            disabled={isLoadingTree}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTree ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </motion.button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Folder Tree */}
        <div className="w-80 glass rounded-2xl p-4 border border-border h-fit max-h-[calc(100vh-200px)] overflow-auto">
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
          <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm">새 폴더</span>
          </button>
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
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
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
                        {file.isDirectory ? "폴더" : file.sizeFormatted}
                      </p>
                    </div>
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
    </div>
  );
}
