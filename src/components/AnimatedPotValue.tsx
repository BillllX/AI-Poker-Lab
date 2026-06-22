"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./AnimatedPotValue.module.css";

type AnimatedPotValueProps = {
  className?: string;
  value: number;
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export const AnimatedPotValue = memo(function AnimatedPotValue({ className, value }: AnimatedPotValueProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [display, setDisplay] = useState(value);
  const [pulse, setPulse] = useState(false);
  const previousRef = useRef(value);

  useEffect(() => {
    if (reducedMotion || value === previousRef.current) {
      return;
    }

    const from = previousRef.current;
    const to = value;
    previousRef.current = value;
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
  }, [reducedMotion, value]);

  const shown = reducedMotion ? value : display;

  return (
    <span
      aria-live="polite"
      className={[styles.potValue, !reducedMotion && pulse ? styles.potPulse : "", className].filter(Boolean).join(" ")}
    >
      {shown.toLocaleString()}
    </span>
  );
});
