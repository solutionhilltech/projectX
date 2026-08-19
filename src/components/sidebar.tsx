"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { BackendStatus } from "@/lib/types";

export type DashboardView = "scout" | "data" | "analytics" | "settings";

const SETTINGS_ICON = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </>
);

const NAV_ITEMS: { id: DashboardView; label: string; icon: ReactNode }[] = [
  {
    id: "scout",
    label: "Scout",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    ),
  },
  {
    id: "data",
    label: "Data",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: SETTINGS_ICON,
  },
];

const LOGOUT_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H3"
  />
);

function StatusRow({ ok, label, okText, badText }: { ok: boolean; label: string; okText: string; badText: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
      <span className="text-[#999]">{label}</span>
      <span className="text-white font-medium ml-auto">{ok ? okText : badText}</span>
    </div>
  );
}

export function Sidebar({
  activeView,
  onChangeView,
  status,
  brand,
}: {
  activeView: DashboardView;
  onChangeView: (view: DashboardView) => void;
  status: BackendStatus | null;
  brand: ReactNode;
}) {
  const router = useRouter();

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-[var(--nav)] px-4 py-5 z-40">
        <div className="mb-8 px-1">{brand}</div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 cursor-pointer ${
                activeView === item.id
                  ? "bg-white/10 text-white"
                  : "text-[#999] hover:text-white hover:bg-white/5"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4.5 h-4.5">
                {item.icon}
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {status && (
          <div className="space-y-2 mb-4 px-1">
            <StatusRow
              label="Database"
              ok={status.database.connected}
              okText="MongoDB"
              badText="Offline"
            />
            <StatusRow
              label="OpenRouter"
              ok={status.config.openrouter_api_key_configured}
              okText="Connected"
              badText="Missing"
            />
          </div>
        )}

        <div className="flex flex-col gap-1 pt-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#999] hover:text-white hover:bg-white/5 transition duration-150 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4.5 h-4.5">
              {LOGOUT_ICON}
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar — sidebar collapses to icon-only nav */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-[var(--nav)] px-4 py-3 flex items-center justify-between">
        {brand}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              aria-label={item.label}
              className={`p-2 rounded-full transition duration-150 cursor-pointer ${
                activeView === item.id ? "bg-white/20 text-white" : "bg-white/5 text-[#999]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4.5 h-4.5">
                {item.icon}
              </svg>
            </button>
          ))}
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="p-2 bg-white/5 hover:bg-white/20 text-[#999] hover:text-white rounded-full transition duration-150 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4.5 h-4.5">
              {LOGOUT_ICON}
            </svg>
          </button>
        </div>
      </header>
    </>
  );
}
