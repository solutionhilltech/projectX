"use client";

import { useMemo, useState } from "react";
import { BusinessTableRow } from "@/components/business-table-row";
import { businessesToCsv, downloadCsv } from "@/lib/csv";
import type { Business, SortBy } from "@/lib/types";

const TABLE_HEADERS = [
  "Business",
  "Phone",
  "Website",
  "Address",
  "Rating",
  "Redesign",
  "WhatsApp",
  "Queried",
  "Actions",
];

function sortBusinesses(a: Business, b: Business, sortBy: SortBy) {
  if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
  if (sortBy === "reviews") return (b.review_count ?? 0) - (a.review_count ?? 0);
  const dateA = a.queried_at ? new Date(a.queried_at).getTime() : 0;
  const dateB = b.queried_at ? new Date(b.queried_at).getTime() : 0;
  return dateB - dateA;
}

/**
 * Filter and sort state lives here rather than in the dashboard, so typing in
 * the filter box doesn't re-render the agent console or the SSE-driven state.
 */
export function BusinessGrid({
  businesses,
  savedBusinesses,
  onSaveBusiness,
  onDeleteBusiness,
  showToast,
}: {
  businesses: Business[];
  savedBusinesses: Business[];
  onSaveBusiness: (business: Business) => void;
  onDeleteBusiness: (business: Business) => void;
  showToast: (message: string, type?: "success" | "info" | "error") => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(businesses.map((b) => b.category)))],
    [businesses]
  );

  const filteredBusinesses = useMemo(() => {
    const needle = filterQuery.toLowerCase();
    return businesses
      .filter((b) => {
        const matchesSearch =
          b.name.toLowerCase().includes(needle) ||
          b.address.toLowerCase().includes(needle) ||
          b.short_description.toLowerCase().includes(needle);
        const matchesCategory =
          filterCategory === "All" || b.category === filterCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => sortBusinesses(a, b, sortBy));
  }, [businesses, filterQuery, filterCategory, sortBy]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display text-[var(--foreground)]">
            Results ({filteredBusinesses.length})
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Businesses found by the scout agent
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
            className="bg-[var(--card)] border border-[var(--border)] text-xs rounded-full px-3.5 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            aria-label="Sort records"
            className="bg-[var(--card)] border border-[var(--border)] text-xs rounded-full px-3.5 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
          >
            <option value="newest">Newest Scraped</option>
            <option value="rating">Highest Rating</option>
            <option value="reviews">Most Reviews</option>
          </select>

          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter results..."
              aria-label="Filter records by text"
              className="bg-[var(--card)] border border-[var(--border)] text-xs rounded-full pl-8 pr-3.5 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] w-36 md:w-44"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.608 10.608Z"
              />
            </svg>
          </div>

          <button
            onClick={() => {
              downloadCsv(`businesses-${new Date().toISOString().slice(0, 10)}.csv`, businessesToCsv(filteredBusinesses));
              showToast(`Exported ${filteredBusinesses.length} business${filteredBusinesses.length === 1 ? "" : "es"} to CSV`, "success");
            }}
            disabled={filteredBusinesses.length === 0}
            className="flex items-center gap-1.5 bg-[var(--secondary)] hover:bg-[var(--border)] border border-[var(--border)] text-xs rounded-full px-3.5 py-2 text-[var(--foreground)] font-medium transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="min-h-64 glass-panel rounded-xl flex flex-col items-center justify-center text-center p-6 border-dashed">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 mb-3 text-[var(--primary)] opacity-50"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
            No results yet
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Run a scout query above to populate results, or adjust filters.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-x-auto">
          <table className="w-full min-w-[880px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.map((biz) => {
                const isSaved = savedBusinesses.some((b) => b.place_id === biz.place_id);
                return (
                  <BusinessTableRow
                    key={biz.place_id}
                    business={biz}
                    isSaved={isSaved}
                    onSave={onSaveBusiness}
                    onDelete={onDeleteBusiness}
                    showToast={showToast}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
