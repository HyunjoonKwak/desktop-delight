import { useState } from "react";
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
  Play,
  CheckCircle2,
} from "lucide-react";
import FileCard from "./FileCard";

const mockDesktopFiles = [
  { id: 1, name: "프로젝트_최종.psd", type: "image" as const, size: "245MB", date: "오늘" },
  { id: 2, name: "회의록_2024.docx", type: "document" as const, size: "1.2MB", date: "어제" },
  { id: 3, name: "홍보영상.mp4", type: "video" as const, size: "1.8GB", date: "3일 전" },
  { id: 4, name: "배경음악.mp3", type: "audio" as const, size: "8.5MB", date: "1주 전" },
  { id: 5, name: "자료.zip", type: "archive" as const, size: "156MB", date: "2주 전" },
  { id: 6, name: "스크린샷_001.png", type: "image" as const, size: "2.1MB", date: "오늘" },
  { id: 7, name: "계약서.pdf", type: "document" as const, size: "890KB", date: "오늘" },
  { id: 8, name: "index.tsx", type: "code" as const, size: "12KB", date: "어제" },
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

  const toggleSelect = (id: number) => {
    setSelectedFiles((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleOrganize = () => {
    setIsOrganizing(true);
    setTimeout(() => {
      setIsOrganizing(false);
      setOrganized(true);
    }, 2000);
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

      {/* Categories Overview */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {categories.map((cat, index) => {
          const count = mockDesktopFiles.filter((f) => f.type === cat.id).length;
          return (
            <motion.div
              key={cat.id}
              className="p-4 rounded-xl glass border border-border hover:border-primary/30 cursor-pointer transition-all"
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            바탕화면 파일
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedFiles(mockDesktopFiles.map((f) => f.id))}
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

        <AnimatePresence>
          {organized ? (
            <motion.div
              className="grid grid-cols-5 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {mockDesktopFiles.map((file) => (
                <FileCard
                  key={file.id}
                  name={file.name}
                  type={file.type}
                  size={file.size}
                  date={file.date}
                  selected={selectedFiles.includes(file.id)}
                  onClick={() => toggleSelect(file.id)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
