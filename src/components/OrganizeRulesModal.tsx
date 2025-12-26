import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Calendar,
  HardDrive,
  Tag,
  Clock,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Save,
} from "lucide-react";

interface OrganizeRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    type: "extension" | "size" | "date" | "name";
    operator: string;
    value: string;
  };
  action: {
    type: "move" | "rename" | "tag";
    destination: string;
  };
}

interface OrganizeRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: OrganizeRule[]) => void;
}

const conditionTypes = [
  { id: "extension", label: "파일 확장자", icon: FileText },
  { id: "size", label: "파일 크기", icon: HardDrive },
  { id: "date", label: "수정 날짜", icon: Calendar },
  { id: "name", label: "파일 이름", icon: Tag },
];

const extensionOperators = [
  { id: "is", label: "다음과 같음" },
  { id: "contains", label: "포함" },
  { id: "startsWith", label: "시작 문자" },
];

const sizeOperators = [
  { id: "gt", label: "보다 큼" },
  { id: "lt", label: "보다 작음" },
  { id: "eq", label: "같음" },
];

const dateOperators = [
  { id: "within", label: "최근" },
  { id: "before", label: "이전" },
  { id: "after", label: "이후" },
];

const nameOperators = [
  { id: "contains", label: "포함" },
  { id: "startsWith", label: "시작" },
  { id: "endsWith", label: "끝" },
];

const defaultFolders = [
  { id: "images", label: "이미지", icon: Image, color: "hsl(340, 82%, 52%)" },
  { id: "documents", label: "문서", icon: FileText, color: "hsl(207, 90%, 54%)" },
  { id: "videos", label: "동영상", icon: Video, color: "hsl(270, 70%, 55%)" },
  { id: "music", label: "음악", icon: Music, color: "hsl(160, 84%, 39%)" },
  { id: "archives", label: "압축파일", icon: Archive, color: "hsl(35, 92%, 50%)" },
  { id: "code", label: "소스코드", icon: Code, color: "hsl(180, 70%, 45%)" },
];

const defaultRules: OrganizeRule[] = [
  {
    id: "1",
    name: "이미지 파일 정리",
    enabled: true,
    condition: { type: "extension", operator: "is", value: ".jpg, .png, .gif" },
    action: { type: "move", destination: "이미지" },
  },
  {
    id: "2",
    name: "대용량 파일 분류",
    enabled: true,
    condition: { type: "size", operator: "gt", value: "100MB" },
    action: { type: "move", destination: "대용량 파일" },
  },
  {
    id: "3",
    name: "오래된 파일 정리",
    enabled: false,
    condition: { type: "date", operator: "before", value: "30일" },
    action: { type: "move", destination: "오래된 파일" },
  },
];

export default function OrganizeRulesModal({
  isOpen,
  onClose,
  onSave,
}: OrganizeRulesModalProps) {
  const [rules, setRules] = useState<OrganizeRule[]>(defaultRules);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const addNewRule = () => {
    const newRule: OrganizeRule = {
      id: `${Date.now()}`,
      name: "새 규칙",
      enabled: true,
      condition: { type: "extension", operator: "is", value: "" },
      action: { type: "move", destination: "" },
    };
    setRules([...rules, newRule]);
    setEditingRule(newRule.id);
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const toggleRule = (id: string) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const updateRule = (id: string, updates: Partial<OrganizeRule>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const getOperators = (type: string) => {
    switch (type) {
      case "extension":
        return extensionOperators;
      case "size":
        return sizeOperators;
      case "date":
        return dateOperators;
      case "name":
        return nameOperators;
      default:
        return extensionOperators;
    }
  };

  const getPlaceholder = (type: string) => {
    switch (type) {
      case "extension":
        return ".jpg, .png, .gif";
      case "size":
        return "100MB";
      case "date":
        return "30일";
      case "name":
        return "프로젝트";
      default:
        return "";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-h-[85vh] glass rounded-2xl border border-border z-50 flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">정리 규칙 설정</h2>
                  <p className="text-xs text-muted-foreground">
                    자동 정리 시 적용될 규칙을 설정하세요
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

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              {/* Quick Folders */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  빠른 폴더 분류
                </h3>
                <div className="grid grid-cols-6 gap-2">
                  {defaultFolders.map((folder) => (
                    <button
                      key={folder.id}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${folder.color}20` }}
                      >
                        <folder.icon
                          className="w-5 h-5"
                          style={{ color: folder.color }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {folder.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rules List */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">
                    사용자 정의 규칙
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {rules.filter((r) => r.enabled).length}개 활성화
                  </span>
                </div>

                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <motion.div
                      key={rule.id}
                      className={`p-4 rounded-xl border transition-all ${
                        rule.enabled
                          ? "bg-card border-border"
                          : "bg-muted/30 border-border/50 opacity-60"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <div className="flex items-center gap-3">
                        {/* Drag Handle */}
                        <div className="cursor-grab text-muted-foreground hover:text-foreground">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            rule.enabled ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <motion.div
                            className="w-4 h-4 bg-foreground rounded-full"
                            animate={{ x: rule.enabled ? 22 : 2 }}
                          />
                        </button>

                        {/* Rule Info */}
                        <div className="flex-1">
                          {editingRule === rule.id ? (
                            <input
                              type="text"
                              value={rule.name}
                              onChange={(e) =>
                                updateRule(rule.id, { name: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              onBlur={() => setEditingRule(null)}
                              autoFocus
                            />
                          ) : (
                            <p
                              className="text-sm font-medium text-foreground cursor-pointer hover:text-primary"
                              onClick={() => setEditingRule(rule.id)}
                            >
                              {rule.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {conditionTypes.find((c) => c.id === rule.condition.type)?.label}{" "}
                            {getOperators(rule.condition.type).find(
                              (o) => o.id === rule.condition.operator
                            )?.label}{" "}
                            "{rule.condition.value}" → {rule.action.destination}
                          </p>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() =>
                            setEditingRule(
                              editingRule === rule.id ? null : rule.id
                            )
                          }
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        >
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              editingRule === rule.id ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded Editor */}
                      <AnimatePresence>
                        {editingRule === rule.id && (
                          <motion.div
                            className="mt-4 pt-4 border-t border-border space-y-4"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            {/* Condition */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                조건
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={rule.condition.type}
                                  onChange={(e) =>
                                    updateRule(rule.id, {
                                      condition: {
                                        ...rule.condition,
                                        type: e.target.value as OrganizeRule["condition"]["type"],
                                        operator: getOperators(e.target.value)[0].id,
                                      },
                                    })
                                  }
                                  className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  {conditionTypes.map((ct) => (
                                    <option key={ct.id} value={ct.id}>
                                      {ct.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={rule.condition.operator}
                                  onChange={(e) =>
                                    updateRule(rule.id, {
                                      condition: {
                                        ...rule.condition,
                                        operator: e.target.value,
                                      },
                                    })
                                  }
                                  className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  {getOperators(rule.condition.type).map((op) => (
                                    <option key={op.id} value={op.id}>
                                      {op.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={rule.condition.value}
                                  onChange={(e) =>
                                    updateRule(rule.id, {
                                      condition: {
                                        ...rule.condition,
                                        value: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={getPlaceholder(rule.condition.type)}
                                  className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>

                            {/* Action */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                작업
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={rule.action.type}
                                  onChange={(e) =>
                                    updateRule(rule.id, {
                                      action: {
                                        ...rule.action,
                                        type: e.target.value as OrganizeRule["action"]["type"],
                                      },
                                    })
                                  }
                                  className="w-32 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="move">폴더로 이동</option>
                                  <option value="rename">이름 변경</option>
                                  <option value="tag">태그 추가</option>
                                </select>
                                <div className="flex-1 relative">
                                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <input
                                    type="text"
                                    value={rule.action.destination}
                                    onChange={(e) =>
                                      updateRule(rule.id, {
                                        action: {
                                          ...rule.action,
                                          destination: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="대상 폴더 이름"
                                    className="w-full pl-10 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {/* Add New Rule */}
                  <motion.button
                    onClick={addNewRule}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-sm font-medium">새 규칙 추가</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                취소
              </button>
              <motion.button
                onClick={() => {
                  onSave(rules);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Save className="w-4 h-4" />
                <span>규칙 저장</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
