"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

const COVER_COUNT = 222;
const SHELF_COUNT = 10;
const EMPTY_SHELF_DURATION = 700;
const ARRIVAL_DURATION = 2350;
const DISPLAY_DURATION = 750;
const CLEAR_DURATION = 2200;

const coverIndices = Array.from({ length: COVER_COUNT }, (_, index) => index + 1);
const shelfRows = Array.from({ length: SHELF_COUNT }, (_, shelfIndex) =>
  coverIndices.slice(
    Math.floor((shelfIndex * COVER_COUNT) / SHELF_COUNT),
    Math.floor(((shelfIndex + 1) * COVER_COUNT) / SHELF_COUNT),
  ),
);

function coverPath(index: number) {
  return `/library-covers/${String(index).padStart(3, "0")}.jpg`;
}

function disappearanceDelay(index: number) {
  return Math.round((((index * 71) % COVER_COUNT) / (COVER_COUNT - 1)) * 1540);
}

function appearanceDelay(index: number) {
  return Math.round((((index * 47) % COVER_COUNT) / (COVER_COUNT - 1)) * 1850);
}

type LibraryArrivalProps = {
  onTitleReveal: () => void;
  onComplete: () => void;
};

export function LibraryArrival({ onTitleReveal, onComplete }: LibraryArrivalProps) {
  const [phase, setPhase] = useState<"loading" | "empty" | "arriving" | "clearing" | "complete">("loading");
  const revealedRef = useRef(false);
  const completeRef = useRef(false);

  const revealHome = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    onTitleReveal();
  }, [onTitleReveal]);

  const finish = useCallback(() => {
    if (completeRef.current) return;
    completeRef.current = true;
    revealHome();
    onComplete();
    setPhase("complete");
  }, [onComplete, revealHome]);

  useEffect(() => {
    let cancelled = false;
    const preloaded = coverIndices.map((coverIndex) => new window.Image());
    let loadedCount = 0;

    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount === preloaded.length && !cancelled) setPhase("empty");
    };

    preloaded.forEach((image, index) => {
      image.onload = markLoaded;
      image.onerror = markLoaded;
      image.src = coverPath(index + 1);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionTimer = window.setTimeout(finish, 0);
      return () => window.clearTimeout(reducedMotionTimer);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [finish]);

  useEffect(() => {
    if (phase !== "empty") return;
    const arrivalTimer = window.setTimeout(() => setPhase("arriving"), EMPTY_SHELF_DURATION);
    return () => window.clearTimeout(arrivalTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "arriving") return;

    const clearTimer = window.setTimeout(() => {
      revealHome();
      setPhase("clearing");
    }, ARRIVAL_DURATION + DISPLAY_DURATION);

    return () => window.clearTimeout(clearTimer);
  }, [phase, revealHome]);

  useEffect(() => {
    if (phase !== "clearing") return;
    const completeTimer = window.setTimeout(finish, CLEAR_DURATION);
    return () => window.clearTimeout(completeTimer);
  }, [finish, phase]);

  if (phase === "complete") return null;

  return (
    <section
      className={`library-arrival library-arrival--${phase}`}
      aria-label={phase === "loading" ? "正在准备书架" : "进入首页动画"}
    >
      <div className="library-arrival__halo" aria-hidden="true" />
      <div className="library-arrival__wall" aria-hidden="true">
        {shelfRows.map((shelfBooks, shelfIndex) => {
          return (
            <div className="library-arrival__shelf" key={shelfIndex}>
              <div
                className="library-arrival__books"
                style={{ gridTemplateColumns: `repeat(${shelfBooks.length}, minmax(0, 1fr))` }}
              >
                {shelfBooks.map((coverIndex) => {
                  const tilt = ((coverIndex * 13) % 5) - 2;
                  const lift = ((coverIndex * 7) % 4) - 1;
                  const bookStyle = {
                    transform: `translateY(${lift}px) rotate(${tilt * 0.42}deg)`,
                    "--library-appear-delay": `${appearanceDelay(coverIndex)}ms`,
                    "--library-disappear-delay": `${disappearanceDelay(coverIndex)}ms`,
                  } as CSSProperties;

                  return (
                    <div className="library-arrival__book" key={coverIndex} style={bookStyle}>
                      <img src={coverPath(coverIndex)} alt="" />
                    </div>
                  );
                })}
              </div>
              <div className="library-arrival__shelf-edge" />
            </div>
          );
        })}
      </div>

      <button type="button" className="library-arrival__skip" onClick={finish}>
        跳过
      </button>
    </section>
  );
}
