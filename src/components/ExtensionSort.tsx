import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileType,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Code,
  Folder,
  Plus,
  X,
  Sparkles,
  LucideIcon,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { fileApi, organizerApi, isTauri } from "@/lib/tauri-api";
import type { FileInfo, OrganizePreview } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ExtensionGroup {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  extensions: string[];
  folder: string;
  fileCount?: number;
}

const defaultGroups: ExtensionGroup[] = [
  {
    id: "images",
    name: "이미지",
    icon: Image,
    color: "hsl(340, 82%, 52%)",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"],
    folder: "이미지",
  },
  {
    id: "documents",
    name: "문서",
    icon: FileText,
    color: "hsl(207, 90%, 54%)",
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".hwp"],
    folder: "문서",
  },
  {
    id: "videos",
    name: "동영상",
    icon: Video,
    color: "hsl(270, 70%, 55%)",
    extensions: [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"],
    folder: "동영상",
  },
  {
    id: "audio",
    name: "오디오",
    icon: Music,
    color: "hsl(160, 84%, 39%)",
    extensions: [".mp3", ".wav", ".flac", ".aac", ".m4a", ".ogg", ".wma"],
    folder: "음악",
  },
  {
    id: "archives",
    name: "압축파일",
    icon: Archive,
    color: "hsl(35, 92%, 50%)",
    extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"],
    folder: "압축파일",
  },
  {
    id: "code",
    name: "소스코드",
    icon: Code,
    color: "hsl(180, 70%, 45%)",
    extensions: [".js", ".ts", ".tsx", ".py", ".java", ".html", ".css", ".json", ".xml", ".yml"],
    folder: "코드",
  },
];

export default function ExtensionSort() {
  const [groups, setGroups] = useState(defaultGroups);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newExtension, setNewExtension] = useState("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [previews, setPreviews] = useState<OrganizePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organized, setOrganized] = useState(false);
  const { toast } = useToast();

  // Load files and count by extension
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isTauri()) {
        const desktopFiles = await fileApi.scanDesktop();
        setFiles(desktopFiles.filter(f => !f.isDirectory));

        // Count files per group
        setGroups(prev => prev.map(group => ({
          ...group,
          fileCount: desktopFiles.filter(f =>
            !f.isDirectory && group.extensions.includes(f.extension.toLowerCase())
          ).length
        })));

        // Get preview
        const desktopPath = await fileApi.getDesktopPath();
        const previewResult = await organizerApi.previewOrganization(desktopPath);
        setPreviews(previewResult);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
      toast({
        title: "파일 로드 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const addExtension = (groupId: string) => {
    if (!newExtension.startsWith(".")) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, extensions: [...g.extensions, newExtension.toLowerCase()] }
          : g
      )
    );
    setNewExtension("");
  };

  const removeExtension = (groupId: string, ext: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, extensions: g.extensions.filter((e) => e !== ext) }
          : g
      )
    );
  };

  const handleOrganize = async () => {
    setIsOrganizing(true);
    try {
      if (isTauri()) {
        const desktopPath = await fileApi.getDesktopPath();
        const result = await organizerApi.executeOrganization(desktopPath, {
          createDateSubfolders: false,
          dateFormat: "YYYY-MM",
          handleDuplicates: "rename",
        });

        if (result.success) {
          setOrganized(true);
          toast({
            title: "분류 완료",
            description: `${result.filesMoved}개 파일이 분류되었습니다.`,
          });
        } else {
          toast({
            title: "분류 부분 완료",
            description: `${result.filesMoved}개 성공, ${result.errors.length}개 실패`,
            variant: "destructive",
          });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setOrganized(true);
        toast({
          title: "분류 완료 (시뮬레이션)",
          description: "파일이 확장자별로 분류되었습니다.",
        });
      }
    } catch (error) {
      console.error("Organization failed:", error);
      toast({
        title: "분류 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  const totalFilesToOrganize = groups.reduce((acc, g) => acc + (g.fileCount || 0), 0);

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(35,92%,50%)]/20 flex items-center justify-center">
            <FileType className="w-6 h-6 text-[hsl(35,92%,50%)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">확장자 분류</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "파일 스캔 중..." : `${totalFilesToOrganize}개 파일을 분류할 수 있습니다`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={loadFiles}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </motion.button>

          <motion.button
            onClick={handleOrganize}
            disabled={isOrganizing || organized || totalFilesToOrganize === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-glow transition-all ${
              organized
                ? "bg-accent/20 text-accent"
                : "gradient-primary text-primary-foreground hover:opacity-90"
            } disabled:opacity-50`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isOrganizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>분류 중...</span>
              </>
            ) : organized ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>분류 완료!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>분류 실행</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              className={`glass rounded-2xl p-5 border cursor-pointer transition-all ${
                selectedGroup === group.id
                  ? "border-primary shadow-glow"
                  : "border-border hover:border-primary/30"
              }`}
              onClick={() =>
                setSelectedGroup(selectedGroup === group.id ? null : group.id)
              }
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${group.color}20` }}
                  >
                    <group.icon
                      className="w-5 h-5"
                      style={{ color: group.color }}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.extensions.length}개 확장자 · {group.fileCount || 0}개 파일
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Folder className="w-4 h-4" />
                  <span>{group.folder}</span>
                </div>
              </div>

              {/* Extensions */}
              <div className="flex flex-wrap gap-2">
                {group.extensions.map((ext) => (
                  <motion.span
                    key={ext}
                    className="group relative px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: `${group.color}15`,
                      color: group.color,
                    }}
                    layout
                  >
                    {ext}
                    {selectedGroup === group.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExtension(group.id, ext);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </motion.span>
                ))}

                {selectedGroup === group.id && (
                  <motion.div
                    className="flex items-center gap-1"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={newExtension}
                      onChange={(e) => setNewExtension(e.target.value)}
                      placeholder=".ext"
                      className="w-16 px-2 py-1 bg-secondary rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addExtension(group.id);
                      }}
                    />
                    <button
                      onClick={() => addExtension(group.id)}
                      className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Folder Path Editor */}
              {selectedGroup === group.id && (
                <motion.div
                  className="mt-4 pt-4 border-t border-border"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="text-xs text-muted-foreground mb-2 block">
                    대상 폴더
                  </label>
                  <input
                    type="text"
                    value={group.folder}
                    onChange={(e) =>
                      setGroups((prev) =>
                        prev.map((g) =>
                          g.id === group.id ? { ...g, folder: e.target.value } : g
                        )
                      )
                    }
                    className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </motion.div>
              )}
            </motion.div>
          ))}

          {/* Add New Group */}
          <motion.button
            className="glass rounded-2xl p-5 border border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors min-h-[180px]"
            whileHover={{ scale: 1.01 }}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">새 분류 그룹 추가</span>
          </motion.button>
        </div>
      )}

      {/* Preview Section */}
      {previews.length > 0 && !organized && (
        <div className="mt-6 glass rounded-2xl p-6 border border-border">
          <h3 className="text-lg font-medium text-foreground mb-4">분류 미리보기</h3>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {previews.slice(0, 10).map((preview, index) => (
              <div
                key={preview.sourcePath}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 text-sm"
              >
                <span className="text-foreground truncate flex-1">{preview.fileName}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary truncate flex-1">{preview.category}</span>
              </div>
            ))}
            {previews.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                +{previews.length - 10}개 더...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
