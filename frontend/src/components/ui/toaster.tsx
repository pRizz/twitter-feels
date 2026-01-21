// Toast notification container - renders stacked notifications
import { useToast, type Toast } from '@/hooks/useToast';

const typeStyles: Record<Toast['type'], { bg: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-green-500/10 border-green-500/20',
    text: 'text-green-500',
    icon: '\u2713', // checkmark
  },
  error: {
    bg: 'bg-destructive/10 border-destructive/20',
    text: 'text-destructive',
    icon: '\u2717', // x mark
  },
  warning: {
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    text: 'text-yellow-500',
    icon: '\u26A0', // warning triangle
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-500',
    icon: '\u2139', // info circle
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  index: number;
}

function ToastItem({ toast, onDismiss, index }: ToastItemProps) {
  const style = typeStyles[toast.type];

  return (
    <div
      data-testid={`toast-${toast.id}`}
      data-toast-index={index}
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${style.bg} ${style.text}
        animate-in slide-in-from-right-full fade-in duration-300
        min-w-[300px] max-w-[400px]
      `}
      style={{
        // Each toast is positioned below the previous one with proper spacing
        marginBottom: '8px',
      }}
    >
      <span className="text-lg flex-shrink-0">{style.icon}</span>
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="toast-container"
      className="fixed top-4 right-4 z-[9999] flex flex-col pointer-events-none"
      style={{
        // Ensure toasts don't overlap by using flex column layout
        gap: '0px', // Gap is handled by margin in ToastItem
      }}
    >
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={dismiss} index={index} />
        </div>
      ))}
    </div>
  );
}
