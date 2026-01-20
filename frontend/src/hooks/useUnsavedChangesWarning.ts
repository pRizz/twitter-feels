// Hook to warn users about unsaved changes when navigating away
import { useCallback, useEffect, useState, useRef } from 'react';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  message?: string;
}

interface UseUnsavedChangesWarningReturn {
  showWarning: boolean;
  pendingHref: string | null;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

/**
 * Hook that warns users about unsaved changes when navigating away.
 * Works with BrowserRouter by intercepting link clicks globally.
 *
 * Usage:
 * 1. Pass isDirty to indicate if form has unsaved changes
 * 2. Show ConfirmDialog when showWarning is true
 * 3. Call confirmNavigation or cancelNavigation based on user choice
 */
export function useUnsavedChangesWarning({
  isDirty,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesWarningOptions): UseUnsavedChangesWarningReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync with isDirty state
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Handle browser refresh/close with beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we still need to set returnValue
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [message]);

  // Intercept click events on anchor tags
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only intercept if form is dirty
      if (!isDirtyRef.current) return;

      // Find if the clicked element (or its parent) is an anchor
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');

      // Only intercept internal navigation (not external links)
      if (!href || href.startsWith('http') || href.startsWith('//')) return;

      // Prevent the default navigation
      e.preventDefault();
      e.stopPropagation();

      // Store pending href and show warning
      setPendingHref(href);
      setShowWarning(true);
    };

    // Use capture phase to intercept before React Router handles the click
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  const confirmNavigation = useCallback(() => {
    setShowWarning(false);
    if (pendingHref) {
      // Navigate to the pending URL
      window.location.href = pendingHref;
    }
    setPendingHref(null);
  }, [pendingHref]);

  const cancelNavigation = useCallback(() => {
    setShowWarning(false);
    setPendingHref(null);
  }, []);

  return {
    showWarning,
    pendingHref,
    confirmNavigation,
    cancelNavigation,
  };
}
