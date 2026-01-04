import { getErrorMessage, type ErrorMessage } from '@/constants/errorMessages';

/**
 * Toast function type (from useToast hook)
 */
export interface ToastFunction {
  (props: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
    action?: React.ReactNode;
  }): void;
}

/**
 * Handle errors with user-friendly messages
 * 
 * This function centralizes error handling by:
 * 1. Parsing the error (from Rust backend or JavaScript)
 * 2. Getting user-friendly message from errorMessages
 * 3. Displaying toast notification
 * 4. Optionally executing action handler
 * 
 * @param error - Error object, string, or unknown
 * @param toast - Toast function from useToast hook
 * @param options - Optional configuration
 */
export function handleError(
  error: unknown,
  toast: ToastFunction,
  options?: {
    title?: string;
    description?: string;
    onActionClick?: () => void;
  }
): void {
  const errorMsg = getErrorMessage(error);

  // Log for debugging (can be removed in production)
  console.error('[handleError]', error);

  // Show toast with user-friendly message
  toast({
    title: options?.title || errorMsg.title,
    description: options?.description || errorMsg.description,
    variant: 'destructive',
  });
}

/**
 * Handle success messages
 */
export function handleSuccess(
  toast: ToastFunction,
  options: {
    title: string;
    description?: string;
  }
): void {
  toast({
    title: options.title,
    description: options.description,
    variant: 'default',
  });
}

/**
 * Create a retry-enabled error handler
 * 
 * @param error - Error object
 * @param toast - Toast function
 * @param retryFn - Function to call on retry
 */
export function handleErrorWithRetry(
  error: unknown,
  toast: ToastFunction,
  retryFn: () => void | Promise<void>
): void {
  handleError(error, toast, {
    onActionClick: () => {
      void (async () => {
        try {
          await Promise.resolve(retryFn());
        } catch (retryError) {
          handleError(retryError, toast);
        }
      })();
    },
  });
}
