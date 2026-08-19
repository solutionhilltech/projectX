import { BrandMark } from "@/components/brand-mark";
import { LandingHero } from "@/components/landing-hero";
import { MagneticButton } from "@/components/magnetic-button";
import { SmoothScroll } from "@/components/smooth-scroll";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[var(--background)]">
        <header className="sticky top-0 z-40 w-full bg-[var(--nav)] px-6 py-3 flex items-center justify-between">
          <BrandMark dark />
          <MagneticButton
            href="/login"
            className="inline-block px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-full"
          >
            Sign in
          </MagneticButton>
        </header>

        <LandingHero />

        <footer className="border-t border-[var(--border)] px-6 py-8 text-center bg-[var(--background)]">
          <p className="text-xs text-[var(--muted-foreground)]">Project X — Scout Agent</p>
        </footer>
      </div>
    </SmoothScroll>
  );
}
