import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import DesktopView from "@/components/DesktopView";
import FolderManager from "@/components/FolderManager";
import BatchRename from "@/components/BatchRename";
import ExtensionSort from "@/components/ExtensionSort";
import DuplicateManager from "@/components/DuplicateManager";
import FolderCompare from "@/components/FolderCompare";

const Index = () => {
  const [activeTab, setActiveTab] = useState("desktop");

  const renderContent = () => {
    switch (activeTab) {
      case "desktop":
        return <DesktopView />;
      case "folder-manager":
        return <FolderManager />;
      case "batch-rename":
        return <BatchRename />;
      case "extension-sort":
        return <ExtensionSort />;
      case "duplicate-manager":
        return <DuplicateManager />;
      case "folder-compare":
        return <FolderCompare />;
      default:
        return <DesktopView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col">{renderContent()}</main>
    </div>
  );
};

export default Index;
