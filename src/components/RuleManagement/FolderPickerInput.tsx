import { useState } from "react";
import { motion } from "framer-motion";
import { Folder, FolderOpen, Loader2, AlertCircle } from "lucide-react";
import { dialogApi } from "@/lib/tauri-api";

interface FolderPickerInputProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  label?: string;
}

export default function FolderPickerInput({
  value,
  onChange,
  placeholder = "폴더를 선택하세요",
  error,
  disabled,
  label,
}: FolderPickerInputProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePickFolder = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      const path = await dialogApi.pickFolder("대상 폴더 선택");
      if (path) {
        onChange(path);
      }
    } catch (err) {
      console.error("Failed to pick folder:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-muted-foreground block">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full pl-10 pr-3 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? "ring-2 ring-destructive/50" : ""
            }`}
          />
        </div>
        <motion.button
          type="button"
          onClick={handlePickFolder}
          disabled={disabled || isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderOpen className="w-4 h-4" />
          )}
          <span className="text-sm">찾아보기</span>
        </motion.button>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
