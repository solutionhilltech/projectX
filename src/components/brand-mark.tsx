export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-full bg-[#2997ff] flex items-center justify-center shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4 text-black"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.59 14.37a6 6 0 0 1-8.22-.07m0 0a8.3 8.3 0 0 0-2.28-2.28m7.22 7.22v3.75m0-3.75a1.5 1.5 0 0 1-3 0M3.75 3v1.5m0 0v3.75m0-3.75h3.75M20.25 3v1.5m0 0v3.75m0-3.75h-3.75M3 20.25v-1.5m0 0v-3.75m0 3.75h3.75m13.5 0v-1.5m0 0v-3.75m0 3.75h-3.75"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <h1
          className={`text-[17px] font-semibold tracking-tight flex items-center gap-2 ${dark ? "text-white" : "text-[var(--foreground)]"}`}
        >
          Project X
          <span className="text-[11px] font-normal text-[#2997ff] bg-white/10 px-2 py-0.5 rounded-full">
            Scout Agent
          </span>
        </h1>
        <p className={`text-[11px] ${dark ? "text-[#cccccc]" : "text-[var(--muted-foreground)]"}`}>
          Autonomous business extraction agent
        </p>
      </div>
    </div>
  );
}
