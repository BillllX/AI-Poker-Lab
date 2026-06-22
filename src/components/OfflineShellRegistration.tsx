"use client";

import { useEffect } from "react";
import { getBasePath } from "@/lib/client/basePath";

/** Register optional offline navigation shell (production-only by default). */
export function OfflineShellRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const disabled = process.env.NEXT_PUBLIC_OFFLINE_SHELL_SW === "0";
    const enabledInProd = process.env.NODE_ENV === "production";
    if (disabled || !enabledInProd) {
      return;
    }

    const basePath = getBasePath();
    const scriptUrl = `${basePath}/sw-offline-shell.js`;
    const scope = `${basePath}/`.replace(/\/{2,}/g, "/");

    let cancelled = false;

    void navigator.serviceWorker.register(scriptUrl, { scope }).catch(() => {
      if (!cancelled) {
        // Optional enhancement — ignore registration failures (HTTP, unsupported scope).
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
