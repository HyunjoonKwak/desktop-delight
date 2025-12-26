import { motion } from "framer-motion";
import {
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Code,
  File,
  MoreVertical,
} from "lucide-react";

interface FileCardProps {
  name: string;
  type: "image" | "document" | "video" | "audio" | "archive" | "code" | "other";
  size: string;
  date: string;
  selected?: boolean;
  onClick?: () => void;
}

const fileIcons = {
  image: { icon: Image, colorClass: "file-image", bgClass: "bg-[hsl(340,82%,52%)]/15" },
  document: { icon: FileText, colorClass: "file-document", bgClass: "bg-[hsl(207,90%,54%)]/15" },
  video: { icon: Video, colorClass: "file-video", bgClass: "bg-[hsl(270,70%,55%)]/15" },
  audio: { icon: Music, colorClass: "file-audio", bgClass: "bg-[hsl(160,84%,39%)]/15" },
  archive: { icon: Archive, colorClass: "file-archive", bgClass: "bg-[hsl(35,92%,50%)]/15" },
  code: { icon: Code, colorClass: "file-code", bgClass: "bg-[hsl(180,70%,45%)]/15" },
  other: { icon: File, colorClass: "text-muted-foreground", bgClass: "bg-muted/50" },
};

export default function FileCard({
  name,
  type,
  size,
  date,
  selected,
  onClick,
}: FileCardProps) {
  const { icon: Icon, colorClass, bgClass } = fileIcons[type];

  return (
    <motion.div
      onClick={onClick}
      className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        selected
          ? "bg-primary/10 border border-primary/50 shadow-glow"
          : "bg-card hover:bg-secondary border border-transparent"
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Selection indicator */}
      {selected && (
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <span className="text-xs text-primary-foreground">✓</span>
        </motion.div>
      )}

      {/* More button */}
      <button className="absolute top-3 right-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center mb-3`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>

      {/* File info */}
      <h3 className="text-sm font-medium text-foreground truncate mb-1">
        {name}
      </h3>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{size}</span>
        <span>{date}</span>
      </div>
    </motion.div>
  );
}
