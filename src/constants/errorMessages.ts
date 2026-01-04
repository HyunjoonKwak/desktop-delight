/**
 * Error messages
 * Centralized user-friendly error messages
 */

export interface ErrorMessage {
  title: string;
  description: string;
  action?: string;
  actionHandler?: () => void;
}

/**
 * Error message templates
 */
export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  PERMISSION_DENIED: {
    title: '권한이 필요합니다',
    description: '이 폴더에 접근하려면 권한이 필요합니다. 시스템 설정에서 권한을 확인해주세요.',
    action: '권한 설정 열기',
  },
  
  DISK_FULL: {
    title: '저장 공간 부족',
    description: '디스크에 공간이 부족합니다. 불필요한 파일을 삭제하거나 다른 위치를 선택해주세요.',
    action: '큰 파일 찾기',
  },
  
  FILE_IN_USE: {
    title: '파일이 사용 중입니다',
    description: '다른 프로그램에서 이 파일을 사용하고 있습니다. 파일을 닫고 다시 시도해주세요.',
    action: '다시 시도',
  },
  
  FILE_NOT_FOUND: {
    title: '파일을 찾을 수 없습니다',
    description: '파일이 이동되었거나 삭제되었을 수 있습니다. 파일 목록을 새로고침해주세요.',
    action: '새로고침',
  },
  
  NETWORK_ERROR: {
    title: '네트워크 오류',
    description: '네트워크 연결을 확인하고 다시 시도해주세요.',
    action: '다시 시도',
  },
  
  OPERATION_CANCELLED: {
    title: '작업이 취소되었습니다',
    description: '사용자가 작업을 취소했습니다.',
  },
  
  INVALID_PATH: {
    title: '잘못된 경로',
    description: '입력한 경로가 올바르지 않습니다. 경로를 확인하고 다시 시도해주세요.',
  },
  
  READ_ONLY_FILE: {
    title: '읽기 전용 파일',
    description: '이 파일은 읽기 전용이므로 수정할 수 없습니다.',
  },
  
  DIRECTORY_NOT_EMPTY: {
    title: '폴더가 비어있지 않습니다',
    description: '폴더 안에 파일이 있습니다. 먼저 파일을 삭제하거나 이동해주세요.',
  },
  
  NAME_CONFLICT: {
    title: '이름 충돌',
    description: '같은 이름의 파일이 이미 존재합니다. 다른 이름을 사용하거나 덮어쓰기를 선택해주세요.',
  },
  
  UNKNOWN_ERROR: {
    title: '알 수 없는 오류',
    description: '예상하지 못한 오류가 발생했습니다. 다시 시도해주세요.',
    action: '다시 시도',
  },
  
  SCAN_FAILED: {
    title: '파일 스캔 실패',
    description: '파일 목록을 불러오는 중 오류가 발생했습니다.',
    action: '다시 시도',
  },
  
  ORGANIZE_FAILED: {
    title: '파일 정리 실패',
    description: '파일 정리 중 오류가 발생했습니다. 일부 파일이 정리되지 않았을 수 있습니다.',
    action: '히스토리 확인',
  },
  
  RENAME_FAILED: {
    title: '이름 변경 실패',
    description: '파일 이름 변경 중 오류가 발생했습니다.',
    action: '다시 시도',
  },
  
  DELETE_FAILED: {
    title: '삭제 실패',
    description: '파일 삭제 중 오류가 발생했습니다.',
    action: '다시 시도',
  },
  
  MOVE_FAILED: {
    title: '이동 실패',
    description: '파일 이동 중 오류가 발생했습니다.',
    action: '다시 시도',
  },
  
  COPY_FAILED: {
    title: '복사 실패',
    description: '파일 복사 중 오류가 발생했습니다.',
    action: '다시 시도',
  },
};

/**
 * Parse Rust error strings to user-friendly messages
 */
export function parseRustError(errorString: string): string {
  const lowerError = errorString.toLowerCase();
  
  if (lowerError.includes('permission denied') || lowerError.includes('operation not permitted')) {
    return 'PERMISSION_DENIED';
  }
  
  if (lowerError.includes('no space left') || lowerError.includes('disk full')) {
    return 'DISK_FULL';
  }
  
  if (lowerError.includes('file is in use') || lowerError.includes('being used by another process')) {
    return 'FILE_IN_USE';
  }
  
  if (lowerError.includes('not found') || lowerError.includes('no such file')) {
    return 'FILE_NOT_FOUND';
  }
  
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return 'NETWORK_ERROR';
  }
  
  if (lowerError.includes('cancelled') || lowerError.includes('canceled')) {
    return 'OPERATION_CANCELLED';
  }
  
  if (lowerError.includes('invalid path') || lowerError.includes('invalid filename')) {
    return 'INVALID_PATH';
  }
  
  if (lowerError.includes('read-only') || lowerError.includes('readonly')) {
    return 'READ_ONLY_FILE';
  }
  
  if (lowerError.includes('directory not empty')) {
    return 'DIRECTORY_NOT_EMPTY';
  }
  
  if (lowerError.includes('already exists') || lowerError.includes('file exists')) {
    return 'NAME_CONFLICT';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Get error message by error type or error object
 */
export function getErrorMessage(error: unknown): ErrorMessage {
  if (typeof error === 'string') {
    const errorType = parseRustError(error);
    return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  if (error instanceof Error) {
    const errorType = parseRustError(error.message);
    return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
