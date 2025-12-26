import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  File,
  Calendar,
  HardDrive,
  FolderOpen,
  Tag,
  Clock,
  Edit3,
  Trash2,
  Download,
  Copy,
  ExternalLink,
} from "lucide-react";

type FileType = "image" | "document" | "video" | "audio" | "archive" | "code" | "other";

interface FileDetailProps {
  file: {
    id: number;
    name: string;
    type: FileType;
    size: string;
    sizeBytes: number;
    date: string;
    dateTimestamp: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const fileIcons = {
  image: { icon: Image, color: "hsl(340, 82%, 52%)", label: "이미지" },
  document: { icon: FileText, color: "hsl(207, 90%, 54%)", label: "문서" },
  video: { icon: Video, color: "hsl(270, 70%, 55%)", label: "동영상" },
  audio: { icon: Music, color: "hsl(160, 84%, 39%)", label: "오디오" },
  archive: { icon: Archive, color: "hsl(35, 92%, 50%)", label: "압축파일" },
  code: { icon: Code, color: "hsl(180, 70%, 45%)", label: "소스코드" },
  other: { icon: File, color: "hsl(215, 20%, 55%)", label: "기타" },
};

const mockFileDetails = {
  path: "C:/Users/User/Desktop/",
  created: "2024년 1월 10일 오전 9:30",
  modified: "2024년 1월 15일 오후 3:45",
  accessed: "2024년 1월 15일 오후 5:20",
  attributes: ["읽기 전용", "숨김"],
  dimensions: "1920 x 1080",
  duration: "3분 24초",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() || "UNKNOWN";
}

export default function FileDetailPanel({ file, isOpen, onClose }: FileDetailProps) {
  if (!file) return null;

  const { icon: Icon, color, label } = fileIcons[file.type];
  const extension = getFileExtension(file.name);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-[420px] glass border-l border-border z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">파일 상세 정보</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              {/* File Preview */}
              <div className="flex flex-col items-center mb-6">
                <motion.div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${color}20` }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Icon className="w-12 h-12" style={{ color }} />
                </motion.div>
                <motion.h3
                  className="text-lg font-medium text-foreground text-center break-all px-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {file.name}
                </motion.h3>
                <motion.div
                  className="flex items-center gap-2 mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {label}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-muted-foreground">
                    .{extension}
                  </span>
                </motion.div>
              </div>

              {/* Quick Actions */}
              <motion.div
                className="grid grid-cols-4 gap-2 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {[
                  { icon: Edit3, label: "이름 변경" },
                  { icon: Copy, label: "복사" },
                  { icon: Download, label: "다운로드" },
                  { icon: Trash2, label: "삭제" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <action.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {action.label}
                    </span>
                  </button>
                ))}
              </motion.div>

              {/* Details */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  상세 정보
                </h4>

                <div className="space-y-3">
                  {/* Size */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <HardDrive className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">파일 크기</p>
                      <p className="text-sm font-medium text-foreground">
                        {file.size}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({formatBytes(file.sizeBytes)})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">위치</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {mockFileDetails.path}
                      </p>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">파일 형식</p>
                      <p className="text-sm font-medium text-foreground">
                        {extension} 파일 ({label})
                      </p>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">만든 날짜</p>
                      <p className="text-sm font-medium text-foreground">
                        {mockFileDetails.created}
                      </p>
                    </div>
                  </div>

                  {/* Modified Date */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">수정한 날짜</p>
                      <p className="text-sm font-medium text-foreground">
                        {mockFileDetails.modified}
                      </p>
                    </div>
                  </div>

                  {/* Extra info for media files */}
                  {(file.type === "image" || file.type === "video") && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Image className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          {file.type === "video" ? "해상도 / 길이" : "해상도"}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {mockFileDetails.dimensions}
                          {file.type === "video" && ` · ${mockFileDetails.duration}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {file.type === "audio" && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Music className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">재생 시간</p>
                        <p className="text-sm font-medium text-foreground">
                          {mockFileDetails.duration}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attributes */}
                <div className="pt-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    속성
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mockFileDetails.attributes.map((attr) => (
                      <span
                        key={attr}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground"
                      >
                        {attr}
                      </span>
                    ))}
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                      + 태그 추가
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
                <FolderOpen className="w-4 h-4" />
                파일 위치 열기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
