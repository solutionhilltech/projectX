"use client";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fade-in-up"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-[var(--destructive)]/10" : "bg-[var(--primary)]/10"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`w-5 h-5 ${danger ? "text-[var(--destructive)]" : "text-[var(--primary)]"}`}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div className="space-y-1 pt-1">
            <h3 id="confirm-dialog-title" className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs font-medium rounded-full transition duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white text-xs font-medium rounded-full transition duration-150 cursor-pointer active:scale-95 ${
              danger
                ? "bg-[var(--destructive)] hover:bg-[var(--destructive)]/90"
                : "bg-[var(--primary)] hover:bg-[var(--primary-focus)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
