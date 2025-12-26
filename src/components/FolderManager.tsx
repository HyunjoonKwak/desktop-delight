import { useState } from "react";
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
  Plus,
  Search,
  MoreHorizontal,
} from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  children?: FolderItem[];
  files?: number;
}

const mockFolders: FolderItem[] = [
  {
    id: "1",
    name: "Documents",
    files: 24,
    children: [
      { id: "1-1", name: "Work", files: 12 },
      { id: "1-2", name: "Personal", files: 8 },
      { id: "1-3", name: "Projects", files: 4 },
    ],
  },
  {
    id: "2",
    name: "Pictures",
    files: 156,
    children: [
      { id: "2-1", name: "Screenshots", files: 89 },
      { id: "2-2", name: "Camera", files: 67 },
    ],
  },
  {
    id: "3",
    name: "Downloads",
    files: 45,
  },
  {
    id: "4",
    name: "Videos",
    files: 12,
  },
];

function FolderTreeItem({
  folder,
  level = 0,
  selectedId,
  onSelect,
}: {
  folder: FolderItem;
  level?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedId === folder.id;

  return (
    <div>
      <motion.div
        onClick={() => {
          onSelect(folder.id);
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
        <span className="text-sm font-medium flex-1">{folder.name}</span>
        <span className="text-xs text-muted-foreground">{folder.files}</span>
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

export default function FolderManager() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>("1");
  const [searchQuery, setSearchQuery] = useState("");

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
      </div>

      <div className="flex gap-6">
        {/* Folder Tree */}
        <div className="w-80 glass rounded-2xl p-4 border border-border h-fit">
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
          <div className="space-y-1">
            {mockFolders.map((folder) => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                selectedId={selectedFolder}
                onSelect={setSelectedFolder}
              />
            ))}
          </div>

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
              <h2 className="text-lg font-medium text-foreground">Documents</h2>
              <span className="px-2 py-1 text-xs bg-primary/15 text-primary rounded-lg">
                24 파일
              </span>
            </div>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {[
              { name: "보고서_최종.docx", icon: FileText, size: "2.4MB", date: "2024.01.15" },
              { name: "프레젠테이션.pptx", icon: FileText, size: "15.8MB", date: "2024.01.14" },
              { name: "참고자료.pdf", icon: FileText, size: "890KB", date: "2024.01.12" },
              { name: "썸네일.png", icon: Image, size: "1.2MB", date: "2024.01.10" },
              { name: "데모영상.mp4", icon: Video, size: "234MB", date: "2024.01.08" },
            ].map((file, index) => (
              <motion.div
                key={file.name}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <file.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                </div>
                <p className="text-xs text-muted-foreground">{file.date}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
