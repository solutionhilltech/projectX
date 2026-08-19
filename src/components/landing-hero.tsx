"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { MagneticButton } from "@/components/magnetic-button";
import { TiltCard } from "@/components/tilt-card";

const HEADLINE = ["Find the business.", "Ship the redesign.", "Land the client."];

const CONSOLE_PREVIEW: { kind: "log" | "thought" | "saved"; text: string }[] = [
  { kind: "log", text: "Received query: coffee shops in Jaipur" },
  { kind: "thought", text: "No modern site found for 6 of 12 results — prioritizing those." },
  { kind: "saved", text: "Auto-saved Brew & Co. (has website, phone, location)" },
  { kind: "log", text: "Capturing desktop + mobile screenshots for brewandco.in" },
  { kind: "saved", text: "Redesign ready — sent to +91 98••••210 via WhatsApp" },
];

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });

  const orbAY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const orbBY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const orbCY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[var(--nav)] px-6 pt-24 pb-28 md:pt-32 md:pb-36 text-white"
    >
      <div className="grain-overlay" />

      <motion.div
        style={{ y: orbAY }}
        className="absolute -top-28 -left-28 w-[28rem] h-[28rem] rounded-full opacity-50"
      >
        <div
          className="animate-orb w-full h-full rounded-full"
          style={{ background: "radial-gradient(circle, #0071e3, transparent 70%)", filter: "blur(90px)" }}
        />
      </motion.div>
      <motion.div
        style={{ y: orbBY }}
        className="absolute bottom-[-8rem] right-[-6rem] w-[30rem] h-[30rem] rounded-full opacity-40"
      >
        <div
          className="animate-orb w-full h-full rounded-full"
          style={{
            background: "radial-gradient(circle, #7c5cff, transparent 70%)",
            filter: "blur(90px)",
            animationDelay: "-6s",
            animationDuration: "18s",
          }}
        />
      </motion.div>
      <motion.div
        style={{ y: orbCY }}
        className="absolute top-1/3 -right-16 w-80 h-80 rounded-full opacity-30"
      >
        <div
          className="animate-orb w-full h-full rounded-full"
          style={{
            background: "radial-gradient(circle, #34c8ff, transparent 70%)",
            filter: "blur(90px)",
            animationDelay: "-3s",
            animationDuration: "10s",
          }}
        />
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative max-w-3xl mx-auto text-center space-y-6"
      >
        <motion.span
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-block text-[11px] font-medium text-[#2997ff] bg-white/10 px-3 py-1 rounded-full"
        >
          Autonomous outreach agent
        </motion.span>

        <h1 className="text-[clamp(32px,6vw,56px)] leading-[1.1] font-semibold tracking-tight">
          {HEADLINE.map((line, i) => (
            <motion.span
              key={line}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={lineVariants}
              className="block"
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          custom={0.55}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-[15px] md:text-base text-[#cccccc] leading-relaxed max-w-xl mx-auto"
        >
          One agent runs the entire pipeline — scouting local businesses, redesigning
          their site with AI, and delivering it over WhatsApp — so every lead already
          comes with a pitch attached.
        </motion.p>

        <motion.div custom={0.7} initial="hidden" animate="visible" variants={fadeUp} className="pt-2">
          <MagneticButton
            href="/login"
            className="inline-block px-6 py-3 text-white text-sm font-medium rounded-full shadow-[0_8px_20px_-6px_rgba(0,102,204,0.5)] bg-[linear-gradient(135deg,var(--primary),var(--primary-focus))]"
          >
            Sign in to the dashboard
          </MagneticButton>
        </motion.div>
      </motion.div>

      {/* Mock console preview */}
      <motion.div
        custom={0.85}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative max-w-2xl mx-auto mt-16"
        style={{ perspective: 1000 }}
      >
        <TiltCard className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] text-[#888]" style={{ fontFamily: "var(--font-mono)" }}>
              agent-console
            </span>
          </div>
          <div className="p-5 space-y-2.5 text-left" style={{ fontFamily: "var(--font-mono)" }}>
            {CONSOLE_PREVIEW.map((line, i) => (
              <motion.div
                key={i}
                custom={1.0 + i * 0.12}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className={
                  line.kind === "saved"
                    ? "text-[12px] text-emerald-400"
                    : line.kind === "thought"
                      ? "text-[12px] text-[#2997ff] italic"
                      : "text-[12px] text-[#999]"
                }
              >
                {line.kind === "saved" ? "✓ " : line.kind === "thought" ? "· " : "› "}
                {line.text}
              </motion.div>
            ))}
          </div>
        </TiltCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="relative flex justify-center mt-14"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="text-white/40"
          aria-hidden="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
