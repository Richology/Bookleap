"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

const COVER_COUNT = 222;
const SHELF_COUNT = 10;
const MIN_PREPARE_DURATION = 450;
const MAX_PREPARE_DURATION = 6500;
const SPRITE_COLUMNS = 23;
const SPRITE_ROWS = 10;
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
  const [spriteReady, setSpriteReady] = useState(false);
  const revealedRef = useRef(false);
  const completeRef = useRef(false);
  const startedRef = useRef(false);
  const canStartRef = useRef(false);
  const spriteReadyRef = useRef(false);

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

  const startArrival = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase("empty");
  }, []);

  useEffect(() => {
    const minimumTimer = window.setTimeout(() => {
      canStartRef.current = true;
      if (spriteReadyRef.current) startArrival();
    }, MIN_PREPARE_DURATION);
    const maximumTimer = window.setTimeout(() => {
      if (spriteReadyRef.current) {
        startArrival();
      } else {
        finish();
      }
    }, MAX_PREPARE_DURATION);
    const sprite = new window.Image();

    sprite.onload = () => {
      spriteReadyRef.current = true;
      setSpriteReady(true);
      if (canStartRef.current) startArrival();
    };
    sprite.onerror = finish;
    sprite.fetchPriority = "high";
    sprite.src = "/textures/library-wall-sprite-v2.webp";

    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, [finish, startArrival]);

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
    <>
      <link rel="preload" as="image" href="/textures/library-wall-sprite-v2.webp" fetchPriority="high" />
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
                  const spriteColumn = (coverIndex - 1) % SPRITE_COLUMNS;
                  const spriteRow = Math.floor((coverIndex - 1) / SPRITE_COLUMNS);
                  const bookStyle = {
                    transform: `translateY(${lift}px) rotate(${tilt * 0.42}deg)`,
                    backgroundPosition: `${(spriteColumn / (SPRITE_COLUMNS - 1)) * 100}% ${(spriteRow / (SPRITE_ROWS - 1)) * 100}%`,
                    "--library-appear-delay": `${appearanceDelay(coverIndex)}ms`,
                    "--library-disappear-delay": `${disappearanceDelay(coverIndex)}ms`,
                  } as CSSProperties;

                  return (
                    <div
                      className={`library-arrival__book${spriteReady ? " library-arrival__book--loaded" : ""}`}
                      key={coverIndex}
                      style={bookStyle}
                    />
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
    </>
  );
}
