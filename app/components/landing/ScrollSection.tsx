"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps any section with scroll-driven fade-in / fade-out.
 * - Enter: opacity 0→1 + translateY 40px→0 as section enters viewport from bottom
 * - Exit: opacity 1→0 as section exits viewport at top
 * Uses direct DOM style manipulation (no React re-renders on scroll).
 */
export function ScrollSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const fadeIn = vh * 0.32;
      const fadeOut = vh * 0.28;

      const enterT = Math.min(1, Math.max(0, (vh - rect.top) / fadeIn));
      const exitT = Math.min(1, Math.max(0, rect.bottom / fadeOut));
      const opacity = Math.min(enterT, exitT);
      const translateY = (1 - enterT) * 40;

      el.style.opacity = String(opacity);
      el.style.transform = `translateY(${translateY}px)`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}
