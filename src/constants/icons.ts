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
  Home,
  Monitor,
  Download,
  FileImage,
} from 'lucide-react';

/**
 * Icon mappings
 * Centralized icon definitions used across the application
 */

/**
 * Category icons
 */
export const CATEGORY_ICONS: Record<FileCategory, typeof Image> = {
  images: Image,
  documents: FileText,
  videos: Video,
  music: Music,
  archives: Archive,
  installers: Package,
  code: Code,
  others: File,
};

/**
 * File type icons (for FileCard compatibility)
 */
export const FILE_TYPE_ICONS = {
  image: { icon: Image, colorClass: 'file-image', bgClass: 'bg-[hsl(340,82%,52%)]/15' },
  document: { icon: FileText, colorClass: 'file-document', bgClass: 'bg-[hsl(207,90%,54%)]/15' },
  video: { icon: Video, colorClass: 'file-video', bgClass: 'bg-[hsl(270,70%,55%)]/15' },
  audio: { icon: Music, colorClass: 'file-audio', bgClass: 'bg-[hsl(160,84%,39%)]/15' },
  archive: { icon: Archive, colorClass: 'file-archive', bgClass: 'bg-[hsl(35,92%,50%)]/15' },
  code: { icon: Code, colorClass: 'file-code', bgClass: 'bg-[hsl(180,70%,45%)]/15' },
  other: { icon: File, colorClass: 'text-muted-foreground', bgClass: 'bg-muted/50' },
};

/**
 * Quick access folder icons
 */
export const QUICK_ACCESS_ICONS: Record<string, typeof Home> = {
  '홈': Home,
  '바탕화면': Monitor,
  '문서': FileText,
  '다운로드': Download,
  '사진': FileImage,
  '동영상': Video,
  '음악': Music,
};

/**
 * Map FileCategory to file type string (for FileCard compatibility)
 */
export const CATEGORY_TO_FILE_TYPE: Record<FileCategory, keyof typeof FILE_TYPE_ICONS> = {
  images: 'image',
  documents: 'document',
  videos: 'video',
  music: 'audio',
  archives: 'archive',
  installers: 'archive',
  code: 'code',
  others: 'other',
};
