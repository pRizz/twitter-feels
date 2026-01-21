// Toast notification hook - provides toast functions for displaying notifications
import { useCallback, useSyncExternalStore } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Global store for toast notifications
let toasts: Toast[] = [];
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): Toast[] {
  return toasts;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Counter for unique IDs
let toastIdCounter = 0;

export function addToast(toast: Omit<Toast, 'id'>): string {
  const id = `toast-${++toastIdCounter}-${Date.now()}`;
  const newToast: Toast = { ...toast, id };

  // Add to the beginning of the array (newest first)
  toasts = [newToast, ...toasts];
  notifyListeners();

  // Auto-dismiss after duration (default 5 seconds)
  const duration = toast.duration ?? 5000;
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function clearAllToasts(): void {
  toasts = [];
  notifyListeners();
}

// Hook to access and manage toasts
export function useToast() {
  const currentToasts = useSyncExternalStore(subscribe, getSnapshot);

  const toast = useCallback((message: string, type: Toast['type'] = 'info', duration?: number) => {
    return addToast({ message, type, duration });
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'success', duration });
  }, []);

  const error = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'error', duration });
  }, []);

  const warning = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'warning', duration });
  }, []);

  const info = useCallback((message: string, duration?: number) => {
    return addToast({ message, type: 'info', duration });
  }, []);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  const dismissAll = useCallback(() => {
    clearAllToasts();
  }, []);

  return {
    toasts: currentToasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}
