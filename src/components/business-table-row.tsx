"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RedesignModal } from "@/components/redesign-modal";
import { useBusinessActions } from "@/hooks/use-business-actions";
import type { Business } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  in_progress: "text-amber-500",
  pending: "text-indigo-400",
  done: "text-emerald-500",
  failed: "text-rose-500",
  sent: "text-emerald-500",
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-[var(--muted-foreground)]/60">—</span>;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOR[status] ?? "text-[var(--muted-foreground)]"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  title,
  className = "",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-full bg-[var(--secondary)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--muted-foreground)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function BusinessTableRow({
  business,
  isSaved,
  onSave,
  onDelete,
  showToast,
}: {
  business: Business;
  isSaved: boolean;
  onSave?: (business: Business) => void;
  onDelete?: (business: Business) => void;
  showToast: (message: string, type?: "success" | "info" | "error") => void;
}) {
  const {
    status,
    whatsappStatus,
    isTriggering,
    isSendingWhatsapp,
    handleRedesignTrigger,
    handleSendWhatsapp,
    isRedesignModalOpen,
    setIsRedesignModalOpen,
    openRedesignModal,
    modalBusiness,
  } = useBusinessActions(business, showToast);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleConfirmDelete() {
    setConfirmingDelete(false);
    onDelete?.(business);
  }

  return (
    <>
      <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--secondary)]/50 transition-colors">
        <td className="px-3 py-2.5 max-w-[220px]">
          <p className="text-xs font-semibold text-[var(--foreground)] truncate">{business.name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">{business.category}</p>
        </td>
        <td className="px-3 py-2.5 text-xs text-[var(--foreground)] whitespace-nowrap">
          {business.phone_number || <span className="text-[var(--muted-foreground)]/60">—</span>}
        </td>
        <td className="px-3 py-2.5 text-xs">
          {business.website ? (
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
              Visit site
            </a>
          ) : (
            <span className="text-[var(--muted-foreground)]/60">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-xs text-[var(--muted-foreground)] max-w-[240px] truncate">{business.address}</td>
        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
          {business.rating !== null ? (
            <span className="text-[var(--foreground)]">
              ★ {business.rating.toFixed(1)} <span className="text-[var(--muted-foreground)]">({business.review_count ?? 0})</span>
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)]/60">—</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge status={status} />
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge status={whatsappStatus} />
        </td>
        <td className="px-3 py-2.5 text-[11px] text-[var(--muted-foreground)] whitespace-nowrap">
          {business.queried_at ? new Date(business.queried_at).toLocaleDateString() : "—"}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            {!isSaved ? (
              <button
                onClick={() => onSave?.(business)}
                className="text-[11px] px-3 py-1 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-focus)] text-white font-medium cursor-pointer"
              >
                Save
              </button>
            ) : (
              <>
                {business.website && (
                  <ActionButton
                    onClick={status === "done" ? openRedesignModal : handleRedesignTrigger}
                    disabled={isTriggering || status === "in_progress"}
                    title={status === "done" ? "View redesign" : "Run redesign"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                      />
                    </svg>
                  </ActionButton>
                )}
                {status === "done" && business.phone_number && (
                  <ActionButton
                    onClick={handleSendWhatsapp}
                    disabled={isSendingWhatsapp}
                    title={whatsappStatus === "sent" ? "Resend on WhatsApp" : "Send on WhatsApp"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5"
                      />
                    </svg>
                  </ActionButton>
                )}
                <ActionButton onClick={() => setConfirmingDelete(true)} title="Delete" className="hover:!bg-[var(--destructive)]/10 hover:!text-[var(--destructive)] hover:!border-[var(--destructive)]/30">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </ActionButton>
              </>
            )}
          </div>
        </td>
      </tr>

      {isRedesignModalOpen && (
        <RedesignModal business={modalBusiness} onClose={() => setIsRedesignModalOpen(false)} />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete business?"
          message={`"${business.name}" will be removed from the database. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
