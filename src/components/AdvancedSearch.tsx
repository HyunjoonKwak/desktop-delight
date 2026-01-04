import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FileCategory } from '@/lib/types';

export interface AdvancedSearchFilters {
  /** Minimum file size in bytes */
  minSize?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Start date for file modification */
  dateFrom?: Date;
  /** End date for file modification */
  dateTo?: Date;
  /** Selected categories to filter */
  categories: FileCategory[];
  /** Selected file extensions */
  extensions: string[];
}

interface AdvancedSearchProps {
  /** Current filter values */
  filters: AdvancedSearchFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  /** Available file extensions in the current file list */
  availableExtensions: string[];
}

const CATEGORY_OPTIONS: { value: FileCategory; label: string }[] = [
  { value: 'images', label: '이미지' },
  { value: 'documents', label: '문서' },
  { value: 'videos', label: '동영상' },
  { value: 'music', label: '음악' },
  { value: 'archives', label: '압축파일' },
  { value: 'installers', label: '설치파일' },
  { value: 'code', label: '코드' },
  { value: 'others', label: '기타' },
];

const FILE_SIZE_PRESETS = [
  { label: '< 1MB', max: 1024 * 1024 },
  { label: '1-10MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: '10-100MB', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { label: '> 100MB', min: 100 * 1024 * 1024 },
];

/**
 * Advanced search panel with expandable filters
 */
export function AdvancedSearch({
  filters,
  onFiltersChange,
  availableExtensions,
}: AdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = 
    filters.minSize !== undefined ||
    filters.maxSize !== undefined ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    filters.categories.length > 0 ||
    filters.extensions.length > 0;

  const toggleCategory = (category: FileCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleExtension = (extension: string) => {
    const newExtensions = filters.extensions.includes(extension)
      ? filters.extensions.filter(e => e !== extension)
      : [...filters.extensions, extension];
    
    onFiltersChange({ ...filters, extensions: newExtensions });
  };

  const setSizePreset = (preset: typeof FILE_SIZE_PRESETS[0]) => {
    onFiltersChange({
      ...filters,
      minSize: preset.min,
      maxSize: preset.max,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      extensions: [],
    });
  };

  return (
    <div className="mb-4">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          고급 검색
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {[
                filters.categories.length,
                filters.extensions.length,
                filters.minSize !== undefined || filters.maxSize !== undefined ? 1 : 0,
                filters.dateFrom !== undefined || filters.dateTo !== undefined ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border space-y-6">
              {/* Categories Filter */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  파일 종류
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={filters.categories.includes(option.value) ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/80 transition-colors"
                      onClick={() => toggleCategory(option.value)}
                    >
                      {option.label}
                      {filters.categories.includes(option.value) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* File Size Filter */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  파일 크기
                </Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {FILE_SIZE_PRESETS.map((preset, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/80 transition-colors"
                      onClick={() => setSizePreset(preset)}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      최소 크기 (MB)
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minSize ? (filters.minSize / (1024 * 1024)).toFixed(2) : ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : undefined;
                        onFiltersChange({ ...filters, minSize: value });
                      }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      최대 크기 (MB)
                    </Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.maxSize ? (filters.maxSize / (1024 * 1024)).toFixed(2) : ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : undefined;
                        onFiltersChange({ ...filters, maxSize: value });
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  수정 날짜
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      시작 날짜
                    </Label>
                    <Input
                      type="date"
                      value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const value = e.target.value ? new Date(e.target.value) : undefined;
                        onFiltersChange({ ...filters, dateFrom: value });
                      }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      종료 날짜
                    </Label>
                    <Input
                      type="date"
                      value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const value = e.target.value ? new Date(e.target.value) : undefined;
                        onFiltersChange({ ...filters, dateTo: value });
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Extensions Filter */}
              {availableExtensions.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    확장자
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableExtensions.slice(0, 12).map((ext) => (
                      <Badge
                        key={ext}
                        variant={filters.extensions.includes(ext) ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/80 transition-colors font-mono text-xs"
                        onClick={() => toggleExtension(ext)}
                      >
                        {ext}
                        {filters.extensions.includes(ext) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                    {availableExtensions.length > 12 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        +{availableExtensions.length - 12}개 더
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Clear Button */}
              {hasActiveFilters && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4 mr-2" />
                    모든 필터 지우기
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
