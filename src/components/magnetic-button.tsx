"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";

const MotionLink = motion.create(Link);

/** A CTA that leans slightly toward the cursor — the "magnetic button" agency-site staple. */
export function MagneticButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 250, damping: 18, mass: 0.3 });
  const springY = useSpring(y, { stiffness: 250, damping: 18, mass: 0.3 });

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <MotionLink
      ref={ref}
      href={href}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {children}
    </MotionLink>
  );
}
