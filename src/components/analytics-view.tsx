import type { Business } from "@/lib/types";

function countBy(items: Business[], key: (b: Business) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const b of items) {
    const k = key(b);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{label}</p>
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  colorClass = "bg-[var(--primary)]",
}: {
  label: string;
  count: number;
  total: number;
  colorClass?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--foreground)] font-medium capitalize">{label}</span>
        <span className="text-[var(--muted-foreground)]">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--secondary)] overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Aggregates over already-fetched saved businesses — no extra API call. */
export function AnalyticsView({ businesses }: { businesses: Business[] }) {
  const total = businesses.length;

  if (total === 0) {
    return (
      <div className="text-center py-24 text-sm text-[var(--muted-foreground)]">
        No saved businesses yet — run a search from the Scout tab to start collecting data.
      </div>
    );
  }

  const withWebsite = businesses.filter((b) => !!b.website).length;
  const redesignsDone = businesses.filter((b) => b.redesign_status === "done").length;
  const whatsappSent = businesses.filter((b) => b.whatsapp_status === "sent").length;

  const redesignCounts = countBy(businesses, (b) => (b.redesign_status ?? "not started").replace("_", " "));
  const whatsappCounts = countBy(businesses, (b) => (b.whatsapp_status ?? "not started").replace("_", " "));
  const queryCounts = countBy(businesses, (b) => b.query ?? "unknown").slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Saved businesses" value={total} />
        <StatTile label="With a website" value={withWebsite} />
        <StatTile label="Redesigns done" value={redesignsDone} />
        <StatTile label="Sent on WhatsApp" value={whatsappSent} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Redesign pipeline</h3>
          {redesignCounts.map(([label, count]) => (
            <BarRow key={label} label={label} count={count} total={total} />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">WhatsApp delivery</h3>
          {whatsappCounts.map(([label, count]) => (
            <BarRow key={label} label={label} count={count} total={total} colorClass="bg-emerald-500" />
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Top search queries</h3>
        {queryCounts.map(([label, count]) => (
          <BarRow key={label} label={label} count={count} total={total} colorClass="bg-[#7c5cff]" />
        ))}
      </div>
    </div>
  );
}
