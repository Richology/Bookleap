"use client";

import { useRef, useState } from "react";

interface FacetItem {
  title: string;
  detail: string;
}

const ANGLE_STEP = 60;
const RADIUS = 340;
const CARD_W = 290;

export function FacetCarousel({
  items,
  visible,
}: {
  items: FacetItem[];
  visible: boolean;
}) {
  const N = items.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const startXRef = useRef(0);
  const movedRef = useRef(false);

  const goNext = () => {
    setActiveIndex((i) => (i + 1) % N);
    setRotation((r) => r - ANGLE_STEP);
  };
  const goPrev = () => {
    setActiveIndex((i) => (i - 1 + N) % N);
    setRotation((r) => r + ANGLE_STEP);
  };
  const goTo = (target: number) => {
    const curr = activeIndex;
    if (target === curr) return;
    let diff = target - curr;
    if (diff > N / 2) diff -= N;
    if (diff < -N / 2) diff += N;
    setActiveIndex(target);
    setRotation((r) => r - diff * ANGLE_STEP);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    movedRef.current = false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 40) {
      movedRef.current = true;
      if (dx > 0) goPrev();
      else goNext();
    }
  };

  const containerRotation = rotation;

  return (
    <>
      <div
        className="no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-3 md:hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(18px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {items.map((item, i) => (
          <article
            key={item.title}
            className={`min-w-[78vw] snap-center rounded-[18px] px-5 py-5 ${
              i === 2 ? "archive-callout" : "bg-[var(--paper)]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-sm bg-[rgba(58,111,82,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                {item.title}
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              {item.detail}
            </p>
            <div className="mt-6 h-px w-10 bg-[rgba(58,111,82,0.22)]" />
          </article>
        ))}
      </div>

      <div
        className="relative mx-auto hidden w-full max-w-[960px] select-none md:block"
        style={{
          perspective: "1200px",
          height: 240,
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "scale(0.96)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `rotateY(${containerRotation}deg)`,
          transition: "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {items.map((item, i) => {
          const cardAngle = i * ANGLE_STEP;
          const raw = ((cardAngle + containerRotation) % 360 + 3600) % 360;
          const fromFront = raw > 180 ? 360 - raw : raw;
          const cardOpacity = Math.max(0, 1 - fromFront / 130);
          const isFront = fromFront < 15;

          return (
            <div
              key={item.title}
              className="absolute"
              style={{
                width: CARD_W,
                left: -CARD_W / 2,
                top: -100,
                transform: `rotateY(${cardAngle}deg) translateZ(${RADIUS}px)`,
                opacity: cardOpacity,
                filter:
                  fromFront > 20
                    ? `blur(${Math.min(2.5, fromFront / 50)}px)`
                    : "none",
                transition: "opacity 0.4s, filter 0.4s",
                cursor: isFront ? "default" : "pointer",
                pointerEvents: cardOpacity < 0.05 ? "none" : "auto",
              }}
              onClick={() => {
                if (!isFront && !movedRef.current) goTo(i);
              }}
            >
              <div
                className={`h-full rounded-[22px] px-5 py-5 ${
                  i === 2 ? "archive-callout" : "bg-[var(--paper)]"
                }`}
                style={{
                  boxShadow: isFront
                    ? "0 8px 32px rgba(47,51,51,0.1)"
                    : "0 2px 12px rgba(47,51,51,0.06)",
                  transition: "box-shadow 0.4s",
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-sm bg-[rgba(58,111,82,0.12)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                    {item.title}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  {item.detail}
                </p>
                <div className="mt-6 h-px w-10 bg-[rgba(58,111,82,0.22)]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Left / Right arrows */}
      <button
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[var(--paper)] p-2.5 shadow-md transition-all hover:scale-105 hover:shadow-lg md:left-4"
        onClick={goPrev}
        aria-label="上一张"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[var(--paper)] p-2.5 shadow-md transition-all hover:scale-105 hover:shadow-lg md:right-4"
        onClick={goNext}
        aria-label="下一张"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 20 : 6,
              backgroundColor:
                i === activeIndex ? "var(--accent)" : "var(--surface-high)",
            }}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {/* Side fades */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-20"
        style={{
          background:
            "linear-gradient(90deg, var(--surface-low) 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-20"
        style={{
          background:
            "linear-gradient(270deg, var(--surface-low) 0%, transparent 100%)",
        }}
      />
      </div>
    </>
  );
}
