"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./AnimatedPotValue.module.css";

type AnimatedPotValueProps = {
  announce?: boolean;
  className?: string;
  value: number;
};

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export const AnimatedPotValue = memo(function AnimatedPotValue({ announce = true, className, value }: AnimatedPotValueProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [display, setDisplay] = useState(safeValue);
  const [pulse, setPulse] = useState(false);
  const previousRef = useRef(safeValue);

  useEffect(() => {
    if (reducedMotion || safeValue === previousRef.current) {
      return;
    }

    const from = previousRef.current;
    const to = safeValue;
    previousRef.current = safeValue;
    setPulse(true);

    const start = performance.now();
    const durationMs = 420;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }

      setDisplay(to);
      window.setTimeout(() => setPulse(false), 180);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, safeValue]);

  const shown = reducedMotion ? safeValue : display;

  return (
    <span
      aria-live={announce ? "polite" : undefined}
      className={[styles.potValue, !reducedMotion && pulse ? styles.potPulse : "", className].filter(Boolean).join(" ")}
    >
      {shown.toLocaleString()}
    </span>
  );
});
