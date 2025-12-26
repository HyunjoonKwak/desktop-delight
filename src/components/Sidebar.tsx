import { useState } from "react";
import { motion } from "framer-motion";
import {
  Folder,
  MonitorUp,
  FileText,
  Settings,
  FolderTree,
  FileType,
  ChevronRight,
  HardDrive,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: "desktop", label: "바탕화면 정리", icon: MonitorUp },
  { id: "folder-manager", label: "폴더 매니저", icon: FolderTree },
  { id: "batch-rename", label: "일괄 이름 변경", icon: FileText },
  { id: "extension-sort", label: "확장자 분류", icon: FileType },
];

const drives = [
  { label: "로컬 디스크 (C:)", used: 234, total: 500 },
  { label: "데이터 (D:)", used: 789, total: 1000 },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside className="w-72 h-screen glass border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Folder className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">File Organizer</h1>
            <p className="text-xs text-muted-foreground">데스크톱 정리 도구</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground px-3 mb-3">
          메인 메뉴
        </p>
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              activeTab === item.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
            {activeTab === item.id && (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </motion.button>
        ))}
      </nav>

      {/* Drives */}
      <div className="p-4 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground px-3 mb-3">
          드라이브
        </p>
        <div className="space-y-3">
          {drives.map((drive) => (
            <div
              key={drive.label}
              className="px-3 py-2 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-foreground">{drive.label}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(drive.used / drive.total) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {drive.used}GB / {drive.total}GB
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">설정</span>
        </button>
      </div>
    </aside>
  );
}
