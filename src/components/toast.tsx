"use client";

export type ToastType = "success" | "info" | "error";
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const TOAST_STYLES: Record<ToastType, { iconBg: string; iconColor: string; icon: React.ReactNode }> = {
  success: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />,
  },
  error: {
    iconBg: "bg-[var(--destructive)]/10",
    iconColor: "text-[var(--destructive)]",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  },
  info: {
    iconBg: "bg-[var(--primary)]/10",
    iconColor: "text-[var(--primary)]",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />,
  },
};

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className="animate-toast-in pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)]"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.iconBg}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 ${style.iconColor}`}
                aria-hidden="true"
              >
                {style.icon}
              </svg>
            </div>
            <div className="text-xs font-medium flex-1 text-[var(--foreground)] leading-relaxed pt-1">{toast.message}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 -m-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
