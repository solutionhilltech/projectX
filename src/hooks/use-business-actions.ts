"use client";

import { useState } from "react";
import type { Business } from "@/lib/types";

/** Redesign-trigger / WhatsApp-send / redesign-preview state, shared by the card and table views. */
export function useBusinessActions(
  business: Business,
  showToast: (message: string, type?: "success" | "info" | "error") => void
) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [status, setStatus] = useState<string | undefined>(business.redesign_status);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<string | undefined>(business.whatsapp_status);
  const [isRedesignModalOpen, setIsRedesignModalOpen] = useState(false);
  const [modalBusiness, setModalBusiness] = useState<Business>(business);

  async function handleRedesignTrigger() {
    setIsTriggering(true);
    setStatus("in_progress");
    try {
      const res = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: business.place_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Server error (HTTP ${res.status}): Failed to trigger redesign`);
      }
      setStatus("done");
      showToast("Website redesign completed successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast(`Redesign failed: ${err instanceof Error ? err.message : String(err)}`, "error");
      setStatus("failed");
    } finally {
      setIsTriggering(false);
    }
  }

  async function handleSendWhatsapp() {
    setIsSendingWhatsapp(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: business.place_id }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      if (!res.ok || !result?.ok) {
        throw new Error(result?.error || data.error || `Server error (HTTP ${res.status})`);
      }
      setWhatsappStatus("sent");
      showToast("Redesign sent on WhatsApp!", "success");
    } catch (err) {
      console.error(err);
      showToast(`WhatsApp send failed: ${err instanceof Error ? err.message : String(err)}`, "error");
      setWhatsappStatus("failed");
    } finally {
      setIsSendingWhatsapp(false);
    }
  }

  async function openRedesignModal() {
    setIsRedesignModalOpen(true);
    try {
      const res = await fetch("/api/businesses");
      const data = await res.json();
      const list = data.businesses || data;
      const updated = Array.isArray(list) ? list.find((b: Business) => b.place_id === business.place_id) : null;
      if (updated) setModalBusiness(updated);
    } catch (err) {
      console.error("Failed to load updated redesign status:", err);
    }
  }

  return {
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
  };
}
