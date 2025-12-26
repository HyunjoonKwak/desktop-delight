import { useState } from "react";
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
} from "lucide-react";

const sampleFiles = [
  "IMG_20240115_001.jpg",
  "IMG_20240115_002.jpg",
  "IMG_20240115_003.jpg",
  "IMG_20240116_001.jpg",
  "IMG_20240116_002.jpg",
];

const renameRules = [
  { id: "prefix", label: "접두사 추가", icon: Type, example: "photo_" },
  { id: "suffix", label: "접미사 추가", icon: Type, example: "_edited" },
  { id: "number", label: "일련번호", icon: Hash, example: "001, 002, 003..." },
  { id: "date", label: "날짜 형식", icon: Calendar, example: "2024-01-15" },
];

export default function BatchRename() {
  const [prefix, setPrefix] = useState("여행사진_");
  const [useNumber, setUseNumber] = useState(true);
  const [startNumber, setStartNumber] = useState(1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamed, setRenamed] = useState(false);

  const getPreviewName = (original: string, index: number) => {
    const ext = original.split(".").pop();
    const num = useNumber ? String(startNumber + index).padStart(3, "0") : "";
    return `${prefix}${num}.${ext}`;
  };

  const handleRename = () => {
    setIsRenaming(true);
    setTimeout(() => {
      setIsRenaming(false);
      setRenamed(true);
    }, 1500);
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
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="예: 여행사진_"
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
                onClick={() => setUseNumber(!useNumber)}
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
                  onChange={(e) => setStartNumber(Number(e.target.value))}
                  min={1}
                  className="w-32 px-4 py-2 bg-secondary rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </motion.div>
            )}
          </div>

          {/* Quick Rules */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              빠른 규칙
            </label>
            <div className="grid grid-cols-2 gap-2">
              {renameRules.map((rule) => (
                <button
                  key={rule.id}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <rule.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{rule.label}</p>
                    <p className="text-xs text-muted-foreground">{rule.example}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="glass rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-foreground">미리보기</h2>
            <button
              onClick={() => {
                setRenamed(false);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              초기화
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {sampleFiles.map((file, index) => (
              <motion.div
                key={file}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex-1">
                  <p className={`text-sm ${renamed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {file}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className={`text-sm ${renamed ? "text-accent font-medium" : "text-primary"}`}>
                    {getPreviewName(file, index)}
                  </p>
                </div>
                {renamed && (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Action Button */}
          <motion.button
            onClick={handleRename}
            disabled={isRenaming || renamed}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              renamed
                ? "bg-accent/20 text-accent"
                : "gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            }`}
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
                <span>5개 파일 이름 변경 완료!</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>이름 변경 실행</span>
              </>
            )}
          </motion.button>

          {!renamed && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>실제 파일은 변경되지 않습니다 (프로토타입)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
