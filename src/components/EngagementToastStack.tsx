"use client";

import { useEffect, useState } from "react";
import {
  drainStoredToasts,
  engagementToastEventName,
  type EngagementToast,
} from "@/lib/client/engagementToast";
import { liveRegionProps } from "@/lib/client/liveRegion";
import styles from "./EngagementToastStack.module.css";

export function EngagementToastStack() {
  const [toasts, setToasts] = useState<EngagementToast[]>([]);

  useEffect(() => {
    function appendToast(toast: EngagementToast) {
      setToasts((current) => [...current.filter((item) => item.id !== toast.id), toast].slice(-4));
    }

    for (const toast of drainStoredToasts()) {
      appendToast(toast);
    }

    function handleToast(event: Event) {
      const detail = (event as CustomEvent<EngagementToast>).detail;
      if (detail) {
        appendToast(detail);
      }
    }

    window.addEventListener(engagementToastEventName(), handleToast as EventListener);
    return () => window.removeEventListener(engagementToastEventName(), handleToast as EventListener);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.expiresMs),
    );

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.stack}>
      {toasts.map((toast) => (
        <div className={`${styles.toast} ${styles[toast.kind]}`} key={toast.id} {...liveRegionProps("status")}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
