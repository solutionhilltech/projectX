import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--nav)] px-6 text-white">
      <div
        className="animate-orb absolute -top-28 -left-28 w-[28rem] h-[28rem] rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, #0071e3, transparent 70%)", filter: "blur(90px)" }}
      />
      <div
        className="animate-orb absolute bottom-[-8rem] right-[-6rem] w-[30rem] h-[30rem] rounded-full opacity-40"
        style={{
          background: "radial-gradient(circle, #7c5cff, transparent 70%)",
          filter: "blur(90px)",
          animationDelay: "-6s",
          animationDuration: "18s",
        }}
      />
      <div
        className="animate-orb absolute top-1/3 -right-16 w-80 h-80 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, #34c8ff, transparent 70%)",
          filter: "blur(90px)",
          animationDelay: "-3s",
          animationDuration: "10s",
        }}
      />
      <div className="grain-overlay" />

      <div className="relative animate-login-in mb-10">
        <BrandMark dark />
      </div>

      <div className="relative flex flex-col items-center text-center">
        <div className="relative w-32 h-32 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.2}
            stroke="currentColor"
            className="animate-scout-sweep w-32 h-32 text-[#2997ff]/70"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <span className="animate-scout-ping absolute inset-0 rounded-full border border-[#2997ff]/40" />
        </div>

        <h1
          className="animate-login-in text-[96px] leading-none font-semibold tracking-tight bg-clip-text text-transparent"
          style={{
            backgroundImage: "linear-gradient(135deg, #ffffff, #2997ff)",
            animationDelay: "0.08s",
          }}
        >
          404
        </h1>
        <p className="animate-login-in text-lg font-medium mt-2" style={{ animationDelay: "0.14s" }}>
          No lead at this address.
        </p>
        <p
          className="animate-login-in text-sm text-[#a3a3a3] max-w-sm mt-2 leading-relaxed"
          style={{ animationDelay: "0.2s" }}
        >
          The agent scanned this route and came back empty. Whatever you were looking for
          either moved or never existed.
        </p>

        <Link
          href="/"
          className="animate-login-in mt-8 px-5 py-2.5 text-white text-sm font-medium rounded-full transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-[0_8px_20px_-6px_rgba(0,102,204,0.5)]"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-focus))",
            animationDelay: "0.28s",
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
