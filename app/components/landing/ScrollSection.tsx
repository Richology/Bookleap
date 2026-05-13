"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        willChange: "opacity, transform",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 520ms ease, transform 520ms ease",
      }}
    >
      {children}
    </div>
  );
}
