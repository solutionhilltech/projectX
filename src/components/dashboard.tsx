"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AgentConsole } from "@/components/agent-console";
import { AnalyticsView } from "@/components/analytics-view";
import { BusinessGrid } from "@/components/business-grid";
import { ScoutForm } from "@/components/scout-form";
import { SettingsView } from "@/components/settings-view";
import { Sidebar, type DashboardView } from "@/components/sidebar";
import { ToastContainer, type ToastItem, type ToastType } from "@/components/toast";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { deleteBusiness, fetchBusinesses, fetchStatus } from "@/lib/api";
import type { BackendStatus, Business, SettingsForm } from "@/lib/types";

type DataTab = "with_website" | "no_website" | "scouted";

const VIEWS: DashboardView[] = ["scout", "data", "analytics", "settings"];
const TABS: DataTab[] = ["with_website", "no_website", "scouted"];

/** Swallows the abort that a cancelled effect triggers; logs anything real. */
function ignoreAbort(context: string) {
  return (err: unknown) => {
    if (err instanceof DOMException && err.name === "AbortError") return;
    console.error(`${context}:`, err);
  };
}

/** API keys are never echoed back into the form — blanks mean "keep current". */
function settingsFormFor(status: BackendStatus | null): SettingsForm {
  if (!status) {
    return {
      openrouter_api_key: "",
      search_provider: "google",
      google_places_api_key: "",
      serper_api_key: "",
      whatsapp_access_token: "",
      whatsapp_phone_number_id: "",
      stitch_refresh_token: "",
    };
  }
  return {
    openrouter_api_key: "",
    search_provider: status.config.search_provider,
    google_places_api_key: "",
    serper_api_key: "",
    whatsapp_access_token: "",
    whatsapp_phone_number_id: "",
    stitch_refresh_token: "",
  };
}

export function Dashboard({ brand }: { brand: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [savedBusinesses, setSavedBusinesses] = useState<Business[]>([]);
  const [scoutedBusinesses, setScoutedBusinesses] = useState<Business[]>([]);
  const [activeTab, setActiveTabState] = useState<DataTab>(() => {
    const t = searchParams.get("tab");
    return TABS.includes(t as DataTab) ? (t as DataTab) : "with_website";
  });
  const [activeView, setActiveViewState] = useState<DashboardView>(() => {
    const v = searchParams.get("view");
    return VIEWS.includes(v as DashboardView) ? (v as DashboardView) : "scout";
  });
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** Keeps the active view/tab in the URL (?view=&tab=) so a refresh lands back on the same one. */
  const syncUrl = useCallback((patch: { view?: DashboardView; tab?: DataTab }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.view) params.set("view", patch.view);
    if (patch.tab) params.set("tab", patch.tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setActiveView = useCallback((view: DashboardView) => {
    setActiveViewState(view);
    syncUrl({ view });
  }, [syncUrl]);

  const setActiveTab = useCallback((tab: DataTab) => {
    setActiveTabState(tab);
    syncUrl({ tab });
  }, [syncUrl]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchStatus());
    } catch (e) {
      console.error("Error fetching backend status:", e);
    }
  }, []);

  const loadBusinesses = useCallback(async () => {
    try {
      setSavedBusinesses(await fetchBusinesses());
    } catch (e) {
      console.error("Error fetching businesses:", e);
    }
  }, []);

  // Initial load from the backend. Both requests are independent, so they run
  // in parallel and each survives the other failing.
  useEffect(() => {
    const controller = new AbortController();

    void fetchStatus(controller.signal)
      .then(setStatus)
      .catch(ignoreAbort("Error fetching backend status"));

    void fetchBusinesses(controller.signal)
      .then(setSavedBusinesses)
      .catch(ignoreAbort("Error fetching businesses"));

    return () => controller.abort();
  }, []);

  const addBusiness = useCallback((business: Business & { autoSaved?: boolean }) => {
    if (business.autoSaved) {
      setSavedBusinesses((prev) => {
        const alreadyExists = prev.some((b) => b.place_id === business.place_id);
        if (!alreadyExists) return [business, ...prev];
        return prev;
      });
      showToast(
        `Auto-saved "${business.name}" (${business.website ? "has website" : "no website"}, phone & location verified)`,
        "success"
      );
    }

    setScoutedBusinesses((prev) => {
      const alreadyExists = prev.some((b) => b.place_id === business.place_id);
      if (!alreadyExists) {
        if (!business.autoSaved) {
          showToast(`Discovered "${business.name}"`, "info");
        }
        return [business, ...prev];
      }
      return prev;
    });
  }, [showToast]);

  const handleSaveBusiness = useCallback(async (business: Business) => {
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save business");

      showToast(`Added "${business.name}" to database`, "success");
      await loadBusinesses();
    } catch (err) {
      console.error(err);
      showToast(`Failed to save: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [loadBusinesses, showToast]);

  const handleDeleteBusiness = useCallback(async (business: Business) => {
    const previous = savedBusinesses;
    setSavedBusinesses((prev) => prev.filter((b) => b.place_id !== business.place_id));
    try {
      await deleteBusiness(business.place_id);
      showToast(`Deleted "${business.name}"`, "success");
    } catch (err) {
      console.error(err);
      setSavedBusinesses(previous);
      showToast(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }, [savedBusinesses, showToast]);

  const savedWithWebsite = useMemo(() => savedBusinesses.filter((b) => !!b.website), [savedBusinesses]);
  const savedWithoutWebsite = useMemo(() => savedBusinesses.filter((b) => !b.website), [savedBusinesses]);

  const { logs, searching, start, stop } = useAgentStream({
    onBusinessSaved: addBusiness,
    onComplete: useCallback(async () => {
      await loadBusinesses();
      setActiveView("data");
    }, [loadBusinesses, setActiveView]),
  });

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    setScoutedBusinesses([]);
    setActiveTab("scouted");
    start(query);
  };

  const showConsole = searching || logs.length > 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased md:pl-60">
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
        status={status}
        brand={brand}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8 flex flex-col gap-5">
        {activeView === "scout" && (
          <>
            <ScoutForm
              query={query}
              onQueryChange={setQuery}
              searching={searching}
              onStart={handleStart}
              onStop={stop}
            />
            {showConsole && <AgentConsole logs={logs} searching={searching} />}
          </>
        )}

        {activeView === "data" && (
          <>
            <div className="flex gap-1 bg-[var(--secondary)] border border-[var(--border)] rounded-full p-1 w-fit">
              {(
                [
                  { id: "with_website" as const, label: "With Website", count: savedWithWebsite.length },
                  { id: "no_website" as const, label: "No Website", count: savedWithoutWebsite.length },
                  { id: "scouted" as const, label: "Scouted", count: scoutedBusinesses.length },
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <BusinessGrid
              businesses={
                activeTab === "with_website"
                  ? savedWithWebsite
                  : activeTab === "no_website"
                    ? savedWithoutWebsite
                    : scoutedBusinesses
              }
              savedBusinesses={savedBusinesses}
              onSaveBusiness={handleSaveBusiness}
              onDeleteBusiness={handleDeleteBusiness}
              showToast={showToast}
            />
          </>
        )}

        {activeView === "analytics" && <AnalyticsView businesses={savedBusinesses} />}

        {activeView === "settings" && (
          <SettingsView
            initialForm={settingsFormFor(status)}
            status={status}
            onSaved={async () => {
              await loadStatus();
              showToast("Settings saved", "success");
            }}
          />
        )}
      </main>

      <footer className="md:hidden glass-panel border-t border-[var(--border)] py-2.5 px-4 text-[11px] text-[var(--muted-foreground)] flex items-center justify-between mt-auto">
        <span>Project X Business Scout 1.0</span>
        {status && (
          <span className="flex items-center" title={status.database.error ?? undefined}>
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.database.connected ? "bg-emerald-600" : "bg-red-600"}`}
            />
            {status.database.connected ? "MongoDB Online" : "MongoDB Offline"}
          </span>
        )}
      </footer>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
