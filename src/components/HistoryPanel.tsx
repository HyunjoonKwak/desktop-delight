import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  RotateCcw,
  Trash2,
  FileText,
  FolderOpen,
  Sparkles,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";

export interface HistoryItem {
  id: string;
  type: "rename" | "move" | "copy" | "organize" | "delete" | "sort";
  description: string;
  details: string;
  timestamp: Date;
  undone?: boolean;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onUndo: (id: string) => void;
  onClearHistory: () => void;
}

const typeIcons = {
  rename: FileText,
  move: FolderOpen,
  copy: FolderOpen,
  organize: Sparkles,
  delete: Trash2,
  sort: History,
};

const typeColors = {
  rename: "hsl(270, 70%, 55%)",
  move: "hsl(207, 90%, 54%)",
  copy: "hsl(180, 70%, 45%)",
  organize: "hsl(160, 84%, 39%)",
  delete: "hsl(0, 72%, 51%)",
  sort: "hsl(35, 92%, 50%)",
};

const typeLabels = {
  rename: "이름 변경",
  move: "파일 이동",
  copy: "파일 복사",
  organize: "자동 정리",
  delete: "파일 삭제",
  sort: "정렬 변경",
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return date.toLocaleDateString("ko-KR");
}

export default function HistoryPanel({
  isOpen,
  onClose,
  history,
  onUndo,
  onClearHistory,
}: HistoryPanelProps) {
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
            className="fixed right-0 top-0 h-full w-96 glass border-l border-border z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <History className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">작업 히스토리</h2>
                  <p className="text-xs text-muted-foreground">
                    {history.filter((h) => !h.undone).length}개의 작업
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Clock className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">아직 작업 기록이 없습니다</p>
                </div>
              ) : (
                history.map((item, index) => {
                  const Icon = typeIcons[item.type];
                  const color = typeColors[item.type];
                  const label = typeLabels[item.type];

                  return (
                    <motion.div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        item.undone
                          ? "bg-muted/30 border-border opacity-50"
                          : "bg-card border-border hover:border-primary/30"
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `${color}15`,
                                color,
                              }}
                            >
                              {label}
                            </span>
                            {item.undone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" />
                                되돌림
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.details}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {formatTime(item.timestamp)}
                          </p>
                        </div>

                        {!item.undone && (
                          <motion.button
                            onClick={() => onUndo(item.id)}
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors shrink-0"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            title="되돌리기"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {history.length > 0 && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={onClearHistory}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  히스토리 전체 삭제
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
