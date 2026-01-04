import type { FileCategory } from '@/lib/types';
import {
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Code,
  File,
  Package,
} from 'lucide-react';

/**
 * Category configuration
 * Centralized category definitions used across the application
 */

export interface CategoryConfig {
  id: FileCategory;
  label: string;
  icon: typeof Image;
  color: string;
  extensions: string[];
  folder: string;
  enabled: boolean;
}

/**
 * All category configurations
 */
export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'images',
    label: '이미지',
    icon: Image,
    color: 'hsl(340, 82%, 52%)',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.heic'],
    folder: '이미지',
    enabled: true,
  },
  {
    id: 'documents',
    label: '문서',
    icon: FileText,
    color: 'hsl(207, 90%, 54%)',
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.hwp'],
    folder: '문서',
    enabled: true,
  },
  {
    id: 'videos',
    label: '동영상',
    icon: Video,
    color: 'hsl(270, 70%, 55%)',
    extensions: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm'],
    folder: '동영상',
    enabled: true,
  },
  {
    id: 'music',
    label: '음악',
    icon: Music,
    color: 'hsl(160, 84%, 39%)',
    extensions: ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma'],
    folder: '음악',
    enabled: true,
  },
  {
    id: 'archives',
    label: '압축파일',
    icon: Archive,
    color: 'hsl(35, 92%, 50%)',
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
    folder: '압축파일',
    enabled: true,
  },
  {
    id: 'installers',
    label: '설치파일',
    icon: Package,
    color: 'hsl(280, 70%, 50%)',
    extensions: ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app'],
    folder: '설치파일',
    enabled: true,
  },
  {
    id: 'code',
    label: '코드',
    icon: Code,
    color: 'hsl(200, 70%, 50%)',
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.html', '.css', '.json', '.xml', '.yml', '.md'],
    folder: '코드',
    enabled: true,
  },
  {
    id: 'others',
    label: '기타',
    icon: File,
    color: 'hsl(220, 10%, 50%)',
    extensions: [],
    folder: '기타',
    enabled: true,
  },
];

/**
 * Get category by ID
 */
export function getCategoryById(id: FileCategory): CategoryConfig | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Get category by file extension
 */
export function getCategoryByExtension(extension: string): CategoryConfig {
  const lowerExt = extension.toLowerCase();
  
  for (const category of CATEGORIES) {
    if (category.extensions.includes(lowerExt)) {
      return category;
    }
  }
  
  // Default to 'others' if not found
  return CATEGORIES.find((cat) => cat.id === 'others')!;
}

/**
 * Get all extensions for a category
 */
export function getExtensionsByCategory(categoryId: FileCategory): string[] {
  const category = getCategoryById(categoryId);
  return category?.extensions || [];
}

/**
 * Category colors map (for backward compatibility)
 */
export const CATEGORY_COLORS: Record<FileCategory, string> = {
  images: 'hsl(340, 82%, 52%)',
  documents: 'hsl(207, 90%, 54%)',
  videos: 'hsl(270, 70%, 55%)',
  music: 'hsl(160, 84%, 39%)',
  archives: 'hsl(35, 92%, 50%)',
  installers: 'hsl(280, 70%, 50%)',
  code: 'hsl(200, 70%, 50%)',
  others: 'hsl(220, 10%, 50%)',
};

/**
 * Category labels map (for backward compatibility)
 */
export const CATEGORY_LABELS: Record<FileCategory, string> = {
  images: '이미지',
  documents: '문서',
  videos: '동영상',
  music: '음악',
  archives: '압축파일',
  installers: '설치파일',
  code: '코드',
  others: '기타',
};
