import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  ArrowRight,
  Play,
  RefreshCw,
  Hash,
  Calendar,
  Type,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Loader2,
  Folder,
  Plus,
} from "lucide-react";
import { fileApi, renamerApi, dialogApi, isTauri } from "@/lib/tauri-api";
import type { FileInfo, RenameRule, RenamePreview } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const renameRuleTemplates = [
  { id: "prefix", label: "접두사 추가", icon: Type, example: "photo_" },
  { id: "suffix", label: "접미사 추가", icon: Type, example: "_edited" },
  { id: "serial_number", label: "일련번호", icon: Hash, example: "001, 002, 003..." },
  { id: "date", label: "날짜 형식", icon: Calendar, example: "2024-01-15" },
];

export default function BatchRename() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previews, setPreviews] = useState<RenamePreview[]>([]);
  const [prefix, setPrefix] = useState("파일_");
  const [suffix, setSuffix] = useState("");
  const [useNumber, setUseNumber] = useState(true);
  const [startNumber, setStartNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const { toast } = useToast();

  // Load files from a specific path
  const loadFiles = useCallback(async (path?: string) => {
    setIsLoading(true);
    try {
      if (isTauri()) {
        let filesResult: FileInfo[];
        if (path) {
          filesResult = await fileApi.scanDirectory(path, false, false);
          setCurrentPath(path);
        } else {
          filesResult = await fileApi.scanDesktop();
          const desktopPath = await fileApi.getDesktopPath();
          setCurrentPath(desktopPath);
        }
        const fileOnly = filesResult.filter(f => !f.isDirectory);
        setFiles(fileOnly);
        // Auto-select first 5 files
        setSelectedFiles(fileOnly.slice(0, 5).map(f => f.path));
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

  // Open folder picker
  const handleSelectFolder = async () => {
    try {
      const selectedPath = await dialogApi.pickFolder("파일 이름을 변경할 폴더 선택");
      if (selectedPath) {
        await loadFiles(selectedPath);
      }
    } catch (error) {
      console.error("Failed to pick folder:", error);
      toast({
        title: "폴더 선택 실패",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Build rename rules based on settings
  const buildRules = useCallback((): RenameRule[] => {
    const rules: RenameRule[] = [];

    if (prefix) {
      rules.push({
        ruleType: "prefix",
        value: prefix,
      });
    }

    if (useNumber) {
      rules.push({
        ruleType: "serial_number",
        value: String(startNumber),
        startNumber,
        padding: 3,
      });
    }

    if (suffix) {
      rules.push({
        ruleType: "suffix",
        value: suffix,
      });
    }

    return rules;
  }, [prefix, suffix, useNumber, startNumber]);

  // Update preview when settings change
  const updatePreview = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setPreviews([]);
      return;
    }

    try {
      if (isTauri()) {
        const rules = buildRules();
        const previewResult = await renamerApi.previewRename(selectedFiles, rules);
        setPreviews(previewResult);
      } else {
        // Mock preview for development
        setPreviews(selectedFiles.map((path, index) => {
          const name = path.split('/').pop() || path;
          const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
          const num = useNumber ? String(startNumber + index).padStart(3, "0") : "";
          return {
            originalPath: path,
            originalName: name,
            newName: `${prefix}${num}${suffix}${ext}`,
            newPath: path.replace(name, `${prefix}${num}${suffix}${ext}`),
          };
        }));
      }
    } catch (error) {
      console.error("Failed to preview rename:", error);
    }
  }, [selectedFiles, buildRules, prefix, suffix, useNumber, startNumber]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleRename = async () => {
    if (selectedFiles.length === 0) return;

    setIsRenaming(true);
    try {
      if (isTauri()) {
        const rules = buildRules();
        const result = await renamerApi.executeRename(selectedFiles, rules);

        if (result.success) {
          setRenamed(true);
          toast({
            title: "이름 변경 완료",
            description: `${result.renamedCount}개 파일의 이름이 변경되었습니다.`,
          });
        } else {
          toast({
            title: "이름 변경 부분 완료",
            description: `${result.renamedCount}개 성공, ${result.errors.length}개 실패`,
            variant: "destructive",
          });
        }
      } else {
        // Mock for development
        await new Promise(resolve => setTimeout(resolve, 1500));
        setRenamed(true);
        toast({
          title: "이름 변경 완료 (시뮬레이션)",
          description: `${selectedFiles.length}개 파일의 이름이 변경되었습니다.`,
        });
      }
    } catch (error) {
      console.error("Rename failed:", error);
      toast({
        title: "이름 변경 실패",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleReset = () => {
    setRenamed(false);
    setPrefix("파일_");
    setSuffix("");
    setUseNumber(true);
    setStartNumber(1);
    loadFiles();
  };

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
    setRenamed(false);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[hsl(270,70%,55%)]/20 flex items-center justify-center">
          <FileText className="w-6 h-6 text-[hsl(270,70%,55%)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">일괄 이름 변경</h1>
          <p className="text-sm text-muted-foreground">
            여러 파일의 이름을 한 번에 규칙적으로 변경하세요
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Settings */}
        <div className="glass rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-medium text-foreground mb-6">이름 변경 규칙</h2>

          {/* Prefix */}
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              접두사 (Prefix)
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => {
                setPrefix(e.target.value);
                setRenamed(false);
              }}
              placeholder="예: 여행사진_"
              className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Suffix */}
          <div className="mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              접미사 (Suffix)
            </label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => {
                setSuffix(e.target.value);
                setRenamed(false);
              }}
              placeholder="예: _final"
              className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Numbering */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-muted-foreground">
                일련번호 추가
              </label>
              <button
                onClick={() => {
                  setUseNumber(!useNumber);
                  setRenamed(false);
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  useNumber ? "bg-primary" : "bg-muted"
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-foreground rounded-full"
                  animate={{ x: useNumber ? 26 : 2 }}
                />
              </button>
            </div>
            {useNumber && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label className="text-xs text-muted-foreground mb-2 block">
                  시작 번호
                </label>
                <input
                  type="number"
                  value={startNumber}
                  onChange={(e) => {
                    setStartNumber(Number(e.target.value));
                    setRenamed(false);
                  }}
                  min={1}
                  className="w-32 px-4 py-2 bg-secondary rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </motion.div>
            )}
          </div>

          {/* File Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-muted-foreground">
                파일 선택 ({selectedFiles.length}/{files.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectFolder}
                  disabled={isLoading}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Folder className="w-3 h-3" />
                  폴더 선택
                </button>
                <button
                  onClick={() => loadFiles(currentPath)}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  새로고침
                </button>
              </div>
            </div>

            {/* Current Path */}
            {currentPath && (
              <div className="mb-2 px-3 py-2 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground truncate" title={currentPath}>
                  📁 {currentPath.split('/').slice(-2).join('/')}
                </p>
              </div>
            )}

            <div className="max-h-[200px] overflow-auto space-y-1 bg-secondary/50 rounded-xl p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs text-center mb-2">
                    {isTauri() ? "폴더에 파일이 없습니다" : "Tauri 환경에서만 사용 가능합니다"}
                  </p>
                  {isTauri() && (
                    <motion.button
                      onClick={handleSelectFolder}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-3 h-3" />
                      폴더 선택하기
                    </motion.button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                    <button
                      onClick={() => setSelectedFiles(files.map(f => f.path))}
                      className="text-xs text-primary hover:underline"
                    >
                      전체 선택
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      선택 해제
                    </button>
                  </div>
                  {files.map((file) => (
                    <label
                      key={file.path}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                        className="rounded border-muted-foreground"
                      />
                      <span className="text-xs text-foreground truncate">{file.name}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="glass rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-foreground">미리보기</h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              초기화
            </button>
          </div>

          <div className="space-y-3 mb-6 max-h-[300px] overflow-auto">
            {previews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FolderOpen className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">파일을 선택하세요</p>
              </div>
            ) : (
              previews.map((preview, index) => (
                <motion.div
                  key={preview.originalPath}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${renamed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {preview.originalName}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${renamed ? "text-accent font-medium" : "text-primary"}`}>
                      {preview.newName}
                    </p>
                  </div>
                  {renamed && (
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Action Button */}
          <motion.button
            onClick={handleRename}
            disabled={isRenaming || renamed || selectedFiles.length === 0}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              renamed
                ? "bg-accent/20 text-accent"
                : "gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            } disabled:opacity-50`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isRenaming ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.div>
                <span>변경 중...</span>
              </>
            ) : renamed ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{previews.length}개 파일 이름 변경 완료!</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>이름 변경 실행</span>
              </>
            )}
          </motion.button>

          {!renamed && selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>실행 후 히스토리에서 되돌릴 수 있습니다</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
