import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
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
  ChevronDown,
  ChevronRight,
  Sparkles,
  Save,
  Loader2,
  Package,
  File,
  Settings2,
  Layers,
  Eye,
  Play,
} from "lucide-react";
import { rulesApi, isTauri } from "@/lib/tauri-api";
import type { Rule, Condition, DefaultRule, FileCategory } from "@/lib/types";
import { CATEGORY_INFO } from "@/lib/types";
import FolderPickerInput from "./RuleManagement/FolderPickerInput";
import ConfirmDialog from "./RuleManagement/ConfirmDialog";

interface OrganizeRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (rules: Rule[]) => void;
  onPreview?: () => void;
  sourcePath?: string;
}

type TabType = "default" | "custom";

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
  { id: "matches", label: "정규식" },
];

// Map condition types between frontend and backend
const conditionFieldMap: Record<string, Condition["field"]> = {
  extension: "extension",
  size: "size",
  date: "modifiedDate",
  name: "name",
};

const conditionFieldReverseMap: Record<string, string> = {
  extension: "extension",
  size: "size",
  modifiedDate: "date",
  createdDate: "date",
  name: "name",
};

const operatorMap: Record<string, Condition["operator"]> = {
  is: "equals",
  contains: "contains",
  startsWith: "startsWith",
  endsWith: "endsWith",
  gt: "greaterThan",
  lt: "lessThan",
  eq: "equals",
  within: "lessThan",
  before: "lessThan",
  after: "greaterThan",
  matches: "matches",
};

const operatorReverseMap: Record<string, string> = {
  equals: "is",
  contains: "contains",
  startsWith: "startsWith",
  endsWith: "endsWith",
  greaterThan: "gt",
  lessThan: "lt",
  matches: "matches",
};

// Category icons
const categoryIcons: Record<FileCategory, typeof Image> = {
  images: Image,
  documents: FileText,
  videos: Video,
  music: Music,
  archives: Archive,
  installers: Package,
  code: Code,
  others: File,
};

// UI Rule type for local state management
interface UIRule {
  id: string;
  dbId?: number;
  name: string;
  enabled: boolean;
  priority: number;
  condition: {
    type: "extension" | "size" | "date" | "name";
    operator: string;
    value: string;
  };
  action: {
    type: "move" | "copy" | "rename" | "delete";
    destination: string;
  };
}

// Convert backend Rule to UI Rule
const toUIRule = (rule: Rule): UIRule => {
  const firstCondition = rule.conditions[0] || {
    field: "name",
    operator: "contains",
    value: "",
  };
  return {
    id: String(rule.id || Date.now()),
    dbId: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    condition: {
      type: (conditionFieldReverseMap[firstCondition.field] ||
        "name") as UIRule["condition"]["type"],
      operator: operatorReverseMap[firstCondition.operator] || "contains",
      value: firstCondition.value,
    },
    action: {
      type: rule.actionType as UIRule["action"]["type"],
      destination: rule.actionDestination || "",
    },
  };
};

// Convert UI Rule to backend Rule
const toBackendRule = (uiRule: UIRule, priority: number): Rule => ({
  id: uiRule.dbId,
  name: uiRule.name,
  priority,
  enabled: uiRule.enabled,
  conditions: [
    {
      field: conditionFieldMap[uiRule.condition.type] || "name",
      operator: operatorMap[uiRule.condition.operator] || "contains",
      value: uiRule.condition.value,
    },
  ],
  conditionLogic: "AND",
  actionType: uiRule.action.type,
  actionDestination: uiRule.action.destination,
  createDateSubfolder: false,
});

// Draggable Custom Rule Item Component
function CustomRuleItem({
  rule,
  index,
  editingRule,
  setEditingRule,
  toggleRule,
  updateRule,
  confirmDeleteRule,
  getOperators,
  getPlaceholder,
  conditionTypes,
}: {
  rule: UIRule;
  index: number;
  editingRule: string | null;
  setEditingRule: (id: string | null) => void;
  toggleRule: (id: string) => void;
  updateRule: (id: string, updates: Partial<UIRule>) => void;
  confirmDeleteRule: (id: string) => void;
  getOperators: (type: string) => { id: string; label: string }[];
  getPlaceholder: (type: string) => string;
  conditionTypes: { id: string; label: string; icon: typeof FileText }[];
}) {
  const dragControls = useDragControls();
  const isEditing = editingRule === rule.id;

  return (
    <Reorder.Item
      key={rule.id}
      value={rule}
      dragListener={false}
      dragControls={dragControls}
      className={`p-4 rounded-xl border transition-all ${
        rule.enabled
          ? "bg-card border-border"
          : "bg-muted/30 border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle - Only this element triggers drag */}
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Priority Badge */}
        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
          {index + 1}
        </span>

        {/* Toggle */}
        <button
          onClick={() => toggleRule(rule.id)}
          className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
            rule.enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <motion.div
            className="w-4 h-4 bg-foreground rounded-full"
            animate={{ x: rule.enabled ? 22 : 2 }}
          />
        </button>

        {/* Rule Info */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={rule.name}
            onChange={(e) =>
              updateRule(rule.id, { name: e.target.value })
            }
            className="w-full px-2 py-1 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="규칙 이름"
          />
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {
              conditionTypes.find(
                (c) => c.id === rule.condition.type
              )?.label
            }{" "}
            {
              getOperators(rule.condition.type).find(
                (o) => o.id === rule.condition.operator
              )?.label
            }{" "}
            "{rule.condition.value}" → {rule.action.destination}
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={() =>
            setEditingRule(
              isEditing ? null : rule.id
            )
          }
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isEditing ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          onClick={() => confirmDeleteRule(rule.id)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Editor */}
      <AnimatePresence>
        {isEditing && (
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
                        type: e.target
                          .value as UIRule["condition"]["type"],
                        operator: getOperators(e.target.value)[0]
                          .id,
                      },
                    })
                  }
                  className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
                  className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {getOperators(rule.condition.type).map(
                    (op) => (
                      <option key={op.id} value={op.id}>
                        {op.label}
                      </option>
                    )
                  )}
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
                  placeholder={getPlaceholder(
                    rule.condition.type
                  )}
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
                        type: e.target
                          .value as UIRule["action"]["type"],
                      },
                    })
                  }
                  className="w-32 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="move">폴더로 이동</option>
                  <option value="copy">폴더로 복사</option>
                  <option value="delete">삭제</option>
                </select>
                <div className="flex-1">
                  <FolderPickerInput
                    value={rule.action.destination}
                    onChange={(path) =>
                      updateRule(rule.id, {
                        action: {
                          ...rule.action,
                          destination: path,
                        },
                      })
                    }
                    placeholder="대상 폴더 경로"
                    disabled={rule.action.type === "delete"}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// Draggable Default Rule Item Component
function DefaultRuleItem({
  rule,
  index,
  isExpanded,
  setExpandedDefaultRule,
  toggleDefaultRule,
  updateDefaultRule,
}: {
  rule: DefaultRule;
  index: number;
  isExpanded: boolean;
  setExpandedDefaultRule: (id: number | null) => void;
  toggleDefaultRule: (id: number) => void;
  updateDefaultRule: (id: number, updates: Partial<DefaultRule>) => void;
}) {
  const dragControls = useDragControls();
  const category = rule.category as FileCategory;
  const Icon = categoryIcons[category] || File;
  const info = CATEGORY_INFO[category];

  return (
    <Reorder.Item
      key={rule.id}
      value={rule}
      dragListener={false}
      dragControls={dragControls}
      className={`rounded-xl border transition-all ${
        rule.enabled
          ? "bg-card border-border"
          : "bg-muted/30 border-border/50 opacity-60"
      }`}
    >
      {/* Rule Header */}
      <div className="flex items-center gap-3 p-4">
        {/* Drag Handle - Only this element triggers drag */}
        <div
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Priority Badge */}
        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
          {index + 1}
        </span>

        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${info?.color || "hsl(220, 10%, 50%)"}20`,
          }}
        >
          <Icon
            className="w-5 h-5"
            style={{
              color: info?.color || "hsl(220, 10%, 50%)",
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">
            {info?.label || category}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            → {rule.destination || `${info?.label || category} 폴더`}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => toggleDefaultRule(rule.id)}
          className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
            rule.enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <motion.div
            className="w-4 h-4 bg-foreground rounded-full"
            animate={{ x: rule.enabled ? 22 : 2 }}
          />
        </button>

        {/* Expand Button */}
        <button
          onClick={() =>
            setExpandedDefaultRule(isExpanded ? null : rule.id)
          }
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>
      </div>

      {/* Expanded Settings */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border mt-0 pt-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  대상 폴더
                </label>
                <FolderPickerInput
                  value={rule.destination}
                  onChange={(path) =>
                    updateDefaultRule(rule.id, {
                      destination: path,
                    })
                  }
                  placeholder={`${info?.label || category} 폴더 경로`}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`date-subfolder-${rule.id}`}
                  checked={rule.createDateSubfolder}
                  onChange={(e) =>
                    updateDefaultRule(rule.id, {
                      createDateSubfolder: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <label
                  htmlFor={`date-subfolder-${rule.id}`}
                  className="text-sm text-muted-foreground"
                >
                  날짜별 하위폴더 생성
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

export default function OrganizeRulesModal({
  isOpen,
  onClose,
  onSave,
  onPreview,
  sourcePath,
}: OrganizeRulesModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("default");
  const [defaultRules, setDefaultRules] = useState<DefaultRule[]>([]);
  const [customRules, setCustomRules] = useState<UIRule[]>([]);
  const [expandedDefaultRule, setExpandedDefaultRule] = useState<number | null>(
    null
  );
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    ruleId: string | null;
  }>({ open: false, ruleId: null });

  // Load rules from database when modal opens
  useEffect(() => {
    const loadRules = async () => {
      if (!isOpen) return;

      setLoading(true);
      try {
        const [dbDefaultRules, dbCustomRules] = await Promise.all([
          rulesApi.getDefaultRules(),
          rulesApi.getRules(),
        ]);
        setDefaultRules(dbDefaultRules);
        setCustomRules(dbCustomRules.map(toUIRule));
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error("Failed to load rules:", err);
        setDefaultRules([]);
        setCustomRules([]);
      } finally {
        setLoading(false);
      }
    };

    loadRules();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const addNewRule = () => {
    const newRule: UIRule = {
      id: `${Date.now()}`,
      name: "새 규칙",
      enabled: true,
      priority: customRules.length,
      condition: { type: "extension", operator: "is", value: "" },
      action: { type: "move", destination: "" },
    };
    setCustomRules([...customRules, newRule]);
    setEditingRule(newRule.id);
    setHasUnsavedChanges(true);
  };

  const confirmDeleteRule = (id: string) => {
    setDeleteConfirm({ open: true, ruleId: id });
  };

  const deleteRule = async () => {
    const id = deleteConfirm.ruleId;
    if (!id) return;

    const rule = customRules.find((r) => r.id === id);
    if (rule?.dbId && isTauri()) {
      try {
        await rulesApi.deleteRule(rule.dbId);
      } catch (err) {
        console.error("Failed to delete rule:", err);
      }
    }
    setCustomRules(customRules.filter((r) => r.id !== id));
    setDeleteConfirm({ open: false, ruleId: null });
    setHasUnsavedChanges(true);
  };

  const toggleRule = (id: string) => {
    setCustomRules(
      customRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    setHasUnsavedChanges(true);
  };

  const updateRule = (id: string, updates: Partial<UIRule>) => {
    setCustomRules(
      customRules.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    setHasUnsavedChanges(true);
  };

  const toggleDefaultRule = (id: number) => {
    setDefaultRules(
      defaultRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    setHasUnsavedChanges(true);
  };

  const updateDefaultRule = (id: number, updates: Partial<DefaultRule>) => {
    setDefaultRules(
      defaultRules.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save default rules with priority based on order
      for (let i = 0; i < defaultRules.length; i++) {
        await rulesApi.saveDefaultRule({ ...defaultRules[i], priority: i });
      }

      // Save custom rules with priority based on order
      const savedRules: Rule[] = [];
      for (let i = 0; i < customRules.length; i++) {
        const backendRule = toBackendRule(customRules[i], i);
        const saved = await rulesApi.saveRule(backendRule);
        savedRules.push(saved);
      }

      setHasUnsavedChanges(false);
      onSave?.(savedRules);
      onClose();
    } catch (err) {
      console.error("Failed to save rules:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = (newOrder: UIRule[]) => {
    setCustomRules(newOrder);
    setHasUnsavedChanges(true);
  };

  const handleDefaultRulesReorder = (newOrder: DefaultRule[]) => {
    setDefaultRules(newOrder);
    setHasUnsavedChanges(true);
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

  const enabledDefaultCount = defaultRules.filter((r) => r.enabled).length;
  const enabledCustomCount = customRules.filter((r) => r.enabled).length;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-x-4 top-[5vh] mx-auto max-w-[750px] max-h-[90vh] glass rounded-2xl border border-border z-50 flex flex-col overflow-hidden"
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
                    <h2 className="font-semibold text-foreground">
                      정리 규칙 설정
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      파일 정리 시 적용될 규칙을 설정하세요
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("default")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === "default"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>기본 규칙</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === "default"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {enabledDefaultCount}/{defaultRules.length}
                  </span>
                  {activeTab === "default" && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      layoutId="tabIndicator"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("custom")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === "custom"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  <span>사용자 규칙</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === "custom"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {enabledCustomCount}/{customRules.length}
                  </span>
                  {activeTab === "custom" && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      layoutId="tabIndicator"
                    />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-5">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : activeTab === "default" ? (
                  /* Default Rules Tab */
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground mb-4">
                      드래그하여 우선순위를 변경할 수 있습니다. 상위 규칙이 먼저 적용됩니다.
                      사용자 규칙이 기본 규칙보다 우선 적용됩니다.
                    </p>

                    <Reorder.Group
                      axis="y"
                      values={defaultRules}
                      onReorder={handleDefaultRulesReorder}
                      className="space-y-3"
                    >
                      {defaultRules.map((rule, index) => (
                        <DefaultRuleItem
                          key={rule.id}
                          rule={rule}
                          index={index}
                          isExpanded={expandedDefaultRule === rule.id}
                          setExpandedDefaultRule={setExpandedDefaultRule}
                          toggleDefaultRule={toggleDefaultRule}
                          updateDefaultRule={updateDefaultRule}
                        />
                      ))}
                    </Reorder.Group>
                  </div>
                ) : (
                  /* Custom Rules Tab */
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground mb-4">
                      드래그하여 우선순위를 변경할 수 있습니다. 상위 규칙이 먼저
                      적용됩니다.
                    </p>

                    <Reorder.Group
                      axis="y"
                      values={customRules}
                      onReorder={handleReorder}
                      className="space-y-3"
                    >
                      {customRules.map((rule, index) => (
                        <CustomRuleItem
                          key={rule.id}
                          rule={rule}
                          index={index}
                          editingRule={editingRule}
                          setEditingRule={setEditingRule}
                          toggleRule={toggleRule}
                          updateRule={updateRule}
                          confirmDeleteRule={confirmDeleteRule}
                          getOperators={getOperators}
                          getPlaceholder={getPlaceholder}
                          conditionTypes={conditionTypes}
                        />
                      ))}
                    </Reorder.Group>

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
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-5 border-t border-border">
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <span className="text-xs text-amber-500">
                      저장되지 않은 변경사항이 있습니다
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    취소
                  </motion.button>
                  {onPreview && (
                    <motion.button
                      onClick={onPreview}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Eye className="w-4 h-4" />
                      <span>미리보기</span>
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50"
                    whileHover={{ scale: saving ? 1 : 1.02 }}
                    whileTap={{ scale: saving ? 1 : 0.98 }}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{saving ? "저장 중..." : "규칙 저장"}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Close Confirmation Dialog */}
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="변경사항 저장 안 함"
        description="저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?"
        confirmLabel="닫기"
        cancelLabel="계속 편집"
        variant="destructive"
        onConfirm={() => {
          setShowCloseConfirm(false);
          setHasUnsavedChanges(false);
          onClose();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="규칙 삭제"
        description="이 규칙을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="destructive"
        onConfirm={deleteRule}
      />
    </>
  );
}
