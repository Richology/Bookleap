"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "产品介绍", anchor: "#comparison" },
  { label: "用户评价", anchor: "#testimonials" },
  { label: "常见问题", anchor: "#faq" },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 20
  );

  useEffect(() => {
    let frameId = 0;
    let lastScrolled = window.scrollY > 20;

    const onScroll = () => {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const nextScrolled = window.scrollY > 20;
        if (nextScrolled !== lastScrolled) {
          lastScrolled = nextScrolled;
          setScrolled(nextScrolled);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#faf9f8]/92 backdrop-blur-xl"
          : "bg-[#faf9f8]/82 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-[1540px] items-center justify-between px-6 py-4 md:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="flex items-baseline gap-2 font-editorial text-[1.7rem] font-semibold tracking-tight text-[var(--ink)]"
          >
            书跃 · BookLeap
          </Link>
        </div>

        <div className="flex items-center gap-5 md:gap-8">
          <div className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.anchor}
                href={item.anchor}
                className="font-editorial text-[1.02rem] text-[var(--ink-soft)] transition-colors hover:text-[var(--accent)]"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .querySelector(item.anchor)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
          <Link
            href="/workspace"
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[#faf7f6] transition-all hover:opacity-92 active:scale-[0.97]"
          >
            进入工作台
          </Link>
        </div>
      </div>
    </nav>
  );
}
