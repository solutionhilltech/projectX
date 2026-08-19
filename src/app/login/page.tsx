"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PIPELINE_STEPS } from "@/lib/pipeline-content";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[var(--background)]">
      {/* Left — brand / product story */}
      <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-[var(--nav)] px-14 py-14 text-white">
        <div
          className="animate-orb absolute -top-28 -left-28 w-[28rem] h-[28rem] rounded-full opacity-50"
          style={{
            background: "radial-gradient(circle, #0071e3, transparent 70%)",
            filter: "blur(90px)",
          }}
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
        <div
          className="animate-orb absolute bottom-1/4 left-1/4 w-56 h-56 rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, #ff6ad5, transparent 70%)",
            filter: "blur(90px)",
            animationDelay: "-9s",
            animationDuration: "16s",
          }}
        />

        <div className="relative animate-login-in">
          <BrandMark dark />
        </div>

        <div className="relative space-y-8 max-w-md">
          <h2
            className="animate-login-in text-[34px] leading-[1.15] font-semibold tracking-tight"
            style={{ animationDelay: "0.08s" }}
          >
            Find the business.
            <br />
            Ship the redesign.
            <br />
            Land the client.
          </h2>
          <p
            className="animate-login-in text-[15px] text-[#cccccc] leading-relaxed"
            style={{ animationDelay: "0.16s" }}
          >
            One agent runs the entire pipeline — scouting local businesses, redesigning
            their site with AI, and delivering it over WhatsApp — so every lead in your
            dashboard already comes with a pitch attached.
          </p>
        </div>

        <div className="relative space-y-5">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="animate-login-in flex items-start gap-3.5"
              style={{ animationDelay: `${0.24 + i * 0.08}s` }}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-[#2997ff]"
                  aria-hidden="true"
                >
                  {step.icon}
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="text-[12.5px] text-[#a3a3a3] leading-snug mt-0.5">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — auth */}
      <div className="flex flex-col items-center justify-center p-6 gap-4">
        <form
          onSubmit={handleSubmit}
          className="animate-login-in w-full max-w-sm space-y-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)]"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="space-y-1 text-center md:text-left">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to home
            </Link>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Welcome back</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Sign in to open your dashboard</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="username" className="block text-xs text-[var(--muted-foreground)] font-semibold">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[var(--background)] px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-sm transition duration-150 focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs text-[var(--muted-foreground)] font-semibold">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--background)] px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-sm transition duration-150 focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
            />
          </div>

          {error && (
            <p role="alert" className="text-[var(--destructive)] text-xs">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 text-white text-sm font-medium rounded-full transition duration-200 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-[0_8px_20px_-6px_rgba(0,102,204,0.5)]"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-focus))" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
