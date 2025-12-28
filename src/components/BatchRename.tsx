import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ArrowRight,
  Play,
  RefreshCw,
  Hash,
  Type,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Loader2,
  Folder,
  ChevronRight,
  ChevronUp,
  ArrowLeft,
  Home,
  Monitor,
  Download,
  HardDrive,
  Check,
  X,
  Replace,
  Scissors,
  Calendar,
  Eye,
  Wrench,
} from "lucide-react";
import { fileApi, renamerApi, isTauri } from "@/lib/tauri-api";
import type { FileInfo, RenameRule, RenamePreview, DriveInfo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface QuickAccessFolder {
  name: string;
  path: string;
}

const quickAccessIcons: Record<string, typeof Home> = {
  "홈": Home,
  "바탕화면": Monitor,
  "문서": FileText,
  "다운로드": Download,
};

// Rename mode definitions
type RenameMode = "pattern" | "replace" | "remove" | "date" | "fix";

interface RenameModeInfo {
  id: RenameMode;
  name: string;
  icon: typeof Type;
  description: string;
}

const renameModes: RenameModeInfo[] = [
  { id: "pattern", name: "패턴", icon: Type, description: "접두사 + 번호 + 접미사" },
  { id: "replace", name: "찾아 바꾸기", icon: Replace, description: "특정 텍스트를 다른 텍스트로" },
  { id: "remove", name: "텍스트 제거", icon: Scissors, description: "원하지 않는 텍스트 삭제" },
  { id: "date", name: "날짜 추가", icon: Calendar, description: "파일명에 날짜 추가" },
  { id: "fix", name: "파일명 고치기", icon: Wrench, description: "한글 자모 분리 등 깨진 파일명 수정" },
];

// 한글 자모 결합 함수 - NFD (분리형) -> NFC (조합형)
function combineKoreanJamo(text: string): string {
  // Unicode Normalization Form C (NFC)로 변환
  // NFD로 분리된 한글을 NFC로 조합
  return text.normalize('NFC');
}

// 파일명에 분리된 자모가 있는지 확인
function hasDecomposedKorean(text: string): boolean {
  // 한글 자모 영역 (U+1100-U+11FF: 한글 자모, U+3130-U+318F: 호환용 자모)
  // NFD 분해된 한글은 이 영역의 문자를 포함
  const jamoRegex = /[\u1100-\u11FF\u3130-\u318F]/;
  // NFC와 원본이 다른 경우 분리된 자모가 있는 것
  return text !== text.normalize('NFC') || jamoRegex.test(text);
}

export default function BatchRename() {
  // File browser state
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folderContents, setFolderContents] = useState<FileInfo[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [quickAccessFolders, setQuickAccessFolders] = useState<QuickAccessFolder[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);

  // Selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Rename mode
  const [renameMode, setRenameMode] = useState<RenameMode>("pattern");

  // Pattern mode settings
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [useNumber, setUseNumber] = useState(true);
  const [startNumber, setStartNumber] = useState(1);
  const [numberPosition, setNumberPosition] = useState<"before" | "after">("before");
  const [separator, setSeparator] = useState<"" | "_" | "-">("_");
  const [keepOriginalName, setKeepOriginalName] = useState(true);

  // Replace mode settings
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  // Remove mode settings
  const [removeText, setRemoveText] = useState("");

  // Date mode settings
  const [dateFormat, setDateFormat] = useState("YYYYMMDD");
  const [datePosition, setDatePosition] = useState<"prefix" | "suffix">("prefix");

  // Rename state
  const [previews, setPreviews] = useState<RenamePreview[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamed, setRenamed] = useState(false);

  const { toast } = useToast();

  // Load drives and quick access
  useEffect(() => {
    const init = async () => {
      if (isTauri()) {
        try {
          const [driveList, paths, desktopPath] = await Promise.all([
            fileApi.getDrives(),
            fileApi.getCommonPaths(),
            fileApi.getDesktopPath(),
          ]);
          setDrives(driveList);
          setQuickAccessFolders(paths.map(([name, path]) => ({ name, path })));
          await navigateTo(desktopPath, false);
        } catch (error) {
          console.error("Failed to initialize:", error);
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to folder
  const navigateTo = useCallback(async (path: string, addToHistory: boolean = true) => {
    setIsLoadingFolder(true);
    try {
      if (isTauri()) {
        if (addToHistory && currentPath && currentPath !== path) {
          setNavigationHistory(prev => [...prev, currentPath]);
        }
        const files = await fileApi.fastListDirectory(path);
        setFolderContents(files);
        setCurrentPath(path);
        setSelectedFiles(new Set());
        setRenamed(false);
      }
    } catch (error) {
      console.error("Failed to navigate:", error);
      const errorMsg = String(error);
      if (errorMsg.includes("Operation not permitted") || errorMsg.includes("Permission denied")) {
        toast({
          title: "접근 권한 없음",
          description: "이 폴더에 접근할 수 없습니다.",
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
      setIsLoadingFolder(false);
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

  // Go to parent
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

  // Toggle file selection
  const toggleFile = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    setRenamed(false);
  };

  // Select all files
  const selectAllFiles = () => {
    const allFiles = folderContents.filter(f => !f.isDirectory).map(f => f.path);
    setSelectedFiles(new Set(allFiles));
    setRenamed(false);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFiles(new Set());
    setRenamed(false);
  };

  // Get files and folders
  const folders = folderContents.filter(f => f.isDirectory);
  const files = folderContents.filter(f => !f.isDirectory);
  const selectedFilesArray = Array.from(selectedFiles);

  // Get sample file name for preview pattern
  const sampleFileName = useMemo(() => {
    if (selectedFilesArray.length > 0) {
      const path = selectedFilesArray[0];
      return path.split('/').pop() || "example.txt";
    }
    return "사진_001.jpg";
  }, [selectedFilesArray]);

  // Get current date formatted
  const getFormattedDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    switch (dateFormat) {
      case "YYYYMMDD": return `${yyyy}${mm}${dd}`;
      case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
      case "YYYY_MM_DD": return `${yyyy}_${mm}_${dd}`;
      case "MMDD": return `${mm}${dd}`;
      default: return `${yyyy}${mm}${dd}`;
    }
  };

  // Generate pattern example
  const patternExample = useMemo(() => {
    const namePart = sampleFileName.includes('.')
      ? sampleFileName.substring(0, sampleFileName.lastIndexOf('.'))
      : sampleFileName;
    const ext = sampleFileName.includes('.')
      ? sampleFileName.substring(sampleFileName.lastIndexOf('.'))
      : '';

    switch (renameMode) {
      case "pattern": {
        const parts: { text: string; type: 'prefix' | 'number' | 'name' | 'suffix' | 'ext' | 'sep' }[] = [];
        if (prefix) parts.push({ text: prefix, type: 'prefix' });

        // Number before name
        if (useNumber && numberPosition === "before") {
          if (parts.length > 0 && separator) parts.push({ text: separator, type: 'sep' });
          parts.push({ text: '001', type: 'number' });
        }

        // Original name
        if (keepOriginalName) {
          if (parts.length > 0 && separator) parts.push({ text: separator, type: 'sep' });
          parts.push({ text: namePart, type: 'name' });
        }

        // Number after name
        if (useNumber && numberPosition === "after") {
          if (parts.length > 0 && separator) parts.push({ text: separator, type: 'sep' });
          parts.push({ text: '001', type: 'number' });
        }

        if (suffix) {
          if (parts.length > 0 && separator) parts.push({ text: separator, type: 'sep' });
          parts.push({ text: suffix, type: 'suffix' });
        }
        parts.push({ text: ext, type: 'ext' });
        return parts;
      }
      case "replace": {
        if (!findText) return [{ text: sampleFileName, type: 'name' as const }];
        const newName = sampleFileName.replace(new RegExp(findText, 'g'), replaceText);
        return [{ text: newName, type: 'name' as const }];
      }
      case "remove": {
        if (!removeText) return [{ text: sampleFileName, type: 'name' as const }];
        const newName = sampleFileName.replace(new RegExp(removeText, 'g'), '');
        return [{ text: newName, type: 'name' as const }];
      }
      case "date": {
        const dateStr = getFormattedDate();
        if (datePosition === "prefix") {
          return [
            { text: dateStr + "_", type: 'prefix' as const },
            { text: sampleFileName, type: 'name' as const }
          ];
        } else {
          return [
            { text: namePart, type: 'name' as const },
            { text: "_" + dateStr, type: 'suffix' as const },
            { text: ext, type: 'ext' as const }
          ];
        }
      }
      case "fix": {
        const fixedName = combineKoreanJamo(sampleFileName);
        const hasIssue = fixedName !== sampleFileName;
        return [
          { text: fixedName, type: hasIssue ? 'prefix' as const : 'name' as const }
        ];
      }
      default:
        return [{ text: sampleFileName, type: 'name' as const }];
    }
  }, [renameMode, prefix, suffix, useNumber, numberPosition, separator, keepOriginalName, findText, replaceText, removeText, dateFormat, datePosition, sampleFileName]);

  // Build rename rules
  const buildRules = useCallback((): RenameRule[] => {
    const rules: RenameRule[] = [];

    switch (renameMode) {
      case "pattern":
        if (prefix) {
          rules.push({ ruleType: "prefix", value: prefix });
        }
        if (useNumber) {
          rules.push({ ruleType: "serial_number", value: String(startNumber), startNumber, padding: 3 });
        }
        if (keepOriginalName) {
          rules.push({ ruleType: "keep_original", value: "" });
        }
        if (suffix) {
          rules.push({ ruleType: "suffix", value: suffix });
        }
        break;
      case "replace":
        if (findText) {
          rules.push({ ruleType: "replace", value: findText, replaceWith: replaceText });
        }
        break;
      case "remove":
        if (removeText) {
          rules.push({ ruleType: "remove", value: removeText });
        }
        break;
      case "date":
        rules.push({
          ruleType: "date",
          value: dateFormat,
          position: datePosition
        });
        break;
    }

    return rules;
  }, [renameMode, prefix, suffix, useNumber, startNumber, keepOriginalName, findText, replaceText, removeText, dateFormat, datePosition]);

  // Update preview - local simulation for better UX
  const updatePreviewLocal = useCallback(() => {
    if (selectedFilesArray.length === 0) {
      setPreviews([]);
      return;
    }

    const newPreviews: RenamePreview[] = selectedFilesArray.map((path, index) => {
      const fullName = path.split('/').pop() || path;
      const name = fullName.includes('.')
        ? fullName.substring(0, fullName.lastIndexOf('.'))
        : fullName;
      const ext = fullName.includes('.')
        ? fullName.substring(fullName.lastIndexOf('.'))
        : '';

      let newName = "";

      switch (renameMode) {
        case "pattern": {
          const parts: string[] = [];
          if (prefix) parts.push(prefix);

          // Number before name
          if (useNumber && numberPosition === "before") {
            parts.push(String(startNumber + index).padStart(3, "0"));
          }

          // Original name
          if (keepOriginalName) {
            parts.push(name);
          }

          // Number after name
          if (useNumber && numberPosition === "after") {
            parts.push(String(startNumber + index).padStart(3, "0"));
          }

          if (suffix) parts.push(suffix);
          newName = parts.join(separator) + ext;
          break;
        }
        case "replace": {
          if (findText) {
            newName = fullName.replace(new RegExp(findText, 'g'), replaceText);
          } else {
            newName = fullName;
          }
          break;
        }
        case "remove": {
          if (removeText) {
            newName = fullName.replace(new RegExp(removeText, 'g'), '');
          } else {
            newName = fullName;
          }
          break;
        }
        case "date": {
          const dateStr = getFormattedDate();
          if (datePosition === "prefix") {
            newName = dateStr + "_" + fullName;
          } else {
            newName = name + "_" + dateStr + ext;
          }
          break;
        }
        case "fix": {
          // 한글 자모 결합 (NFD -> NFC)
          newName = combineKoreanJamo(fullName);
          break;
        }
      }

      return {
        originalPath: path,
        originalName: fullName,
        newName: newName || fullName,
        newPath: path.replace(fullName, newName || fullName),
      };
    });

    setPreviews(newPreviews);
  }, [selectedFilesArray, renameMode, prefix, suffix, useNumber, startNumber, numberPosition, separator, keepOriginalName, findText, replaceText, removeText, dateFormat, datePosition]);

  useEffect(() => {
    updatePreviewLocal();
  }, [updatePreviewLocal]);

  // Execute rename
  const handleRename = async () => {
    if (selectedFilesArray.length === 0) return;
    setIsRenaming(true);
    try {
      if (isTauri()) {
        const rules = buildRules();
        const result = await renamerApi.executeRename(selectedFilesArray, rules);
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

  // Reset
  const handleReset = () => {
    setRenamed(false);
    setPrefix("");
    setSuffix("");
    setUseNumber(true);
    setStartNumber(1);
    setNumberPosition("before");
    setSeparator("_");
    setKeepOriginalName(true);
    setFindText("");
    setReplaceText("");
    setRemoveText("");
    setDateFormat("YYYYMMDD");
    setDatePosition("prefix");
    setSelectedFiles(new Set());
    navigateTo(currentPath, false);
  };

  const currentFolderName = currentPath.split('/').pop() || currentPath || "폴더";

  // Color coding for preview parts
  const getPartColor = (type: string) => {
    switch (type) {
      case 'prefix': return 'text-blue-400';
      case 'number': return 'text-amber-400';
      case 'name': return 'text-foreground';
      case 'suffix': return 'text-green-400';
      case 'ext': return 'text-muted-foreground';
      case 'sep': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const getPartBg = (type: string) => {
    switch (type) {
      case 'prefix': return 'bg-blue-500/10';
      case 'number': return 'bg-amber-500/10';
      case 'name': return 'bg-secondary/50';
      case 'suffix': return 'bg-green-500/10';
      case 'ext': return 'bg-muted/30';
      case 'sep': return '';
      default: return '';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
        {/* Left: File Browser */}
        <div className="glass rounded-2xl p-4 border border-border">
          {/* Quick Access */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border">
            {quickAccessFolders.slice(0, 4).map((folder) => {
              const IconComponent = quickAccessIcons[folder.name] || Folder;
              const isActive = currentPath === folder.path;
              return (
                <motion.button
                  key={folder.path}
                  onClick={() => navigateTo(folder.path)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
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
            <div className="w-px h-5 bg-border mx-1" />
            {drives.map((drive) => (
              <motion.button
                key={drive.path}
                onClick={() => navigateTo(drive.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  currentPath.startsWith(drive.path)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{drive.name}</span>
              </motion.button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <motion.button
              onClick={goBack}
              disabled={navigationHistory.length === 0}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={goToParent}
              disabled={!currentPath || currentPath === '/'}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronUp className="w-4 h-4" />
            </motion.button>

            {/* Breadcrumb */}
            <div className="flex-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/30 text-xs overflow-x-auto">
              <button onClick={() => navigateTo('/')} className="text-muted-foreground hover:text-foreground">
                /
              </button>
              {currentPath.split('/').filter(Boolean).map((part, index, arr) => {
                const pathUpToHere = '/' + arr.slice(0, index + 1).join('/');
                const isLast = index === arr.length - 1;
                return (
                  <span key={pathUpToHere} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <button
                      onClick={() => !isLast && navigateTo(pathUpToHere)}
                      className={isLast ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}
                      disabled={isLast}
                    >
                      {part}
                    </button>
                  </span>
                );
              })}
            </div>

            <motion.button
              onClick={() => navigateTo(currentPath, false)}
              disabled={isLoadingFolder}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingFolder ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4 inline mr-1" />
                {currentFolderName}
              </span>
              <span className="text-xs text-muted-foreground">
                {folders.length}개 폴더, {files.length}개 파일
              </span>
            </div>
            <div className="flex items-center gap-2">
              {files.length > 0 && (
                <>
                  <button
                    onClick={selectAllFiles}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    전체 선택
                  </button>
                  {selectedFiles.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      해제
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* File List */}
          <div className="max-h-[400px] overflow-auto space-y-1 rounded-xl bg-secondary/30 p-2">
            {isLoadingFolder ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : folderContents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Folder className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">폴더가 비어있습니다</p>
              </div>
            ) : (
              <>
                {/* Folders */}
                {folders.map((folder) => (
                  <motion.div
                    key={folder.path}
                    onClick={() => navigateTo(folder.path)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                    whileHover={{ x: 2 }}
                  >
                    <Folder className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">{folder.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ))}

                {/* Files */}
                {files.map((file) => {
                  const isSelected = selectedFiles.has(file.path);
                  return (
                    <motion.div
                      key={file.path}
                      onClick={() => toggleFile(file.path)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/15 border border-primary/30'
                          : 'hover:bg-secondary border border-transparent'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.sizeFormatted}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>

          {/* Selected Count */}
          {selectedFiles.size > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                {selectedFiles.size}개 파일 선택됨
              </p>
            </div>
          )}
        </div>

        {/* Right: Rename Settings & Preview */}
        <div className="space-y-4">
          {/* Rename Mode Selector */}
          <div className="glass rounded-2xl p-4 border border-border">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">이름 변경 방식</h2>
            <div className="grid grid-cols-4 gap-2">
              {renameModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = renameMode === mode.id;
                return (
                  <motion.button
                    key={mode.id}
                    onClick={() => { setRenameMode(mode.id); setRenamed(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{mode.name}</span>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {renameModes.find(m => m.id === renameMode)?.description}
            </p>
          </div>

          {/* Rename Settings */}
          <div className="glass rounded-2xl p-5 border border-border">
            <h2 className="text-lg font-medium text-foreground mb-4">규칙 설정</h2>

            <AnimatePresence mode="wait">
              {renameMode === "pattern" && (
                <motion.div
                  key="pattern"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        접두사
                      </label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => { setPrefix(e.target.value); setRenamed(false); }}
                        placeholder="예: 여행_"
                        className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        접미사
                      </label>
                      <input
                        type="text"
                        value={suffix}
                        onChange={(e) => { setSuffix(e.target.value); setRenamed(false); }}
                        placeholder="예: _final"
                        className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  {/* Serial Number Toggle */}
                  <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">일련번호</span>
                      </div>
                      <button
                        onClick={() => { setUseNumber(!useNumber); setRenamed(false); }}
                        className={`w-10 h-5 rounded-full transition-colors ${useNumber ? "bg-primary" : "bg-muted"}`}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{ x: useNumber ? 22 : 2 }}
                        />
                      </button>
                    </div>

                    {useNumber && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 pt-2 border-t border-border/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">시작:</span>
                          <input
                            type="number"
                            value={startNumber}
                            onChange={(e) => { setStartNumber(Number(e.target.value)); setRenamed(false); }}
                            min={1}
                            className="w-14 px-2 py-1 bg-secondary rounded text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">위치:</span>
                          <div className="flex rounded-lg overflow-hidden border border-border">
                            <button
                              onClick={() => { setNumberPosition("before"); setRenamed(false); }}
                              className={`px-2 py-1 text-xs transition-colors ${
                                numberPosition === "before" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              앞
                            </button>
                            <button
                              onClick={() => { setNumberPosition("after"); setRenamed(false); }}
                              className={`px-2 py-1 text-xs transition-colors ${
                                numberPosition === "after" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              뒤
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Original Name Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">원본 이름 유지</span>
                    </div>
                    <button
                      onClick={() => { setKeepOriginalName(!keepOriginalName); setRenamed(false); }}
                      className={`w-10 h-5 rounded-full transition-colors ${keepOriginalName ? "bg-primary" : "bg-muted"}`}
                    >
                      <motion.div
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: keepOriginalName ? 22 : 2 }}
                      />
                    </button>
                  </div>

                  {/* Separator */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">구분자</span>
                    </div>
                    <div className="flex rounded-lg overflow-hidden border border-border">
                      {(["", "_", "-"] as const).map((sep) => (
                        <button
                          key={sep || "none"}
                          onClick={() => { setSeparator(sep); setRenamed(false); }}
                          className={`px-3 py-1 text-xs transition-colors ${
                            separator === sep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {sep === "" ? "없음" : sep === "_" ? "밑줄 _" : "하이픈 -"}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {renameMode === "replace" && (
                <motion.div
                  key="replace"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">찾을 텍스트</label>
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => { setFindText(e.target.value); setRenamed(false); }}
                      placeholder="바꿀 텍스트를 입력하세요"
                      className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">바꿀 텍스트</label>
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => { setReplaceText(e.target.value); setRenamed(false); }}
                      placeholder="새로운 텍스트를 입력하세요 (비워두면 삭제)"
                      className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </motion.div>
              )}

              {renameMode === "remove" && (
                <motion.div
                  key="remove"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">제거할 텍스트</label>
                    <input
                      type="text"
                      value={removeText}
                      onChange={(e) => { setRemoveText(e.target.value); setRenamed(false); }}
                      placeholder="파일명에서 제거할 텍스트"
                      className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    예: "복사본", "(1)", "final" 등을 제거
                  </p>
                </motion.div>
              )}

              {renameMode === "date" && (
                <motion.div
                  key="date"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">날짜 형식</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["YYYYMMDD", "YYYY-MM-DD", "YYYY_MM_DD", "MMDD"].map((format) => (
                        <button
                          key={format}
                          onClick={() => { setDateFormat(format); setRenamed(false); }}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            dateFormat === format
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                          }`}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">날짜 위치</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setDatePosition("prefix"); setRenamed(false); }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          datePosition === "prefix"
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        }`}
                      >
                        앞에 추가
                      </button>
                      <button
                        onClick={() => { setDatePosition("suffix"); setRenamed(false); }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          datePosition === "suffix"
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        }`}
                      >
                        뒤에 추가
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {renameMode === "fix" && (
                <motion.div
                  key="fix"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-foreground">한글 자모 결합</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      macOS와 Windows 간 호환성 문제로 인해 파일명이 분리된 자모로 표시되는 경우를 수정합니다.
                    </p>
                    <div className="p-3 rounded bg-secondary/70 space-y-2 font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-destructive">Before:</span>
                        <span className="text-muted-foreground">ㅎㅏㄴㄱㅡㄹ.txt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-accent">After:</span>
                        <span className="text-foreground">한글.txt</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      NFD (분리형) → NFC (조합형)으로 유니코드 정규화를 수행합니다.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live Pattern Preview */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Eye className="w-3.5 h-3.5" />
                <span>결과 미리보기</span>
              </div>
              <div className="flex items-center gap-1 p-3 rounded-lg bg-secondary/30 font-mono text-sm overflow-x-auto">
                {patternExample.map((part, idx) => (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded ${getPartColor(part.type)} ${getPartBg(part.type)}`}
                  >
                    {part.text}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> 접두사
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> 번호
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" /> 접미사
                </span>
              </div>
            </div>
          </div>

          {/* File Preview */}
          <div className="glass rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">파일별 미리보기</h2>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                초기화
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-[180px] overflow-auto">
              {previews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">파일을 선택하세요</p>
                </div>
              ) : (
                previews.map((preview, index) => (
                  <motion.div
                    key={preview.originalPath}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${renamed ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                        {preview.originalName}
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate font-medium ${renamed ? "text-accent" : "text-foreground"}`}>
                        {preview.newName}
                      </p>
                    </div>
                    {renamed && <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                  </motion.div>
                ))
              )}
            </div>

            {/* Execute Button */}
            <motion.button
              onClick={handleRename}
              disabled={isRenaming || renamed || selectedFiles.size === 0}
              className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                renamed
                  ? "bg-accent/20 text-accent"
                  : "gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              } disabled:opacity-50`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
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

            {!renamed && selectedFiles.size > 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>실행 후 히스토리에서 되돌릴 수 있습니다</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
