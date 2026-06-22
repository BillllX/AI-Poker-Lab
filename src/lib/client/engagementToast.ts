export type EngagementToastKind = "bust" | "coaching" | "points" | "rank" | "settled";

export type EngagementToast = {
  expiresMs: number;
  id: string;
  kind: EngagementToastKind;
  message: string;
};

const storageKey = "texas-poker-engagement-toasts";
const toastEvent = "texas-poker-engagement-toast";
const maxVisibleToasts = 4;

function stableToastId(kind: EngagementToastKind, message: string) {
  let hash = 0;
  for (let index = 0; index < message.length; index += 1) {
    hash = (hash * 31 + message.charCodeAt(index)) >>> 0;
  }
  return `auto-${kind}-${hash.toString(36)}`;
}

function readStoredToasts(): EngagementToast[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as EngagementToast[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredToasts(toasts: EngagementToast[]) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(storageKey, JSON.stringify(toasts));
}

function compactToasts(toasts: EngagementToast[]) {
  const byKey = new Map<string, EngagementToast>();
  for (const toast of toasts) {
    byKey.set(`${toast.kind}:${toast.message}`, toast);
  }
  return [...byKey.values()].slice(-maxVisibleToasts);
}

export function pushEngagementToast(input: Omit<EngagementToast, "id"> & { id?: string }) {
  if (typeof window === "undefined") {
    return;
  }
  const toast: EngagementToast = {
    ...input,
    id: input.id ?? stableToastId(input.kind, input.message),
  };
  const nextToasts = compactToasts([...readStoredToasts().filter((item) => item.id !== toast.id), toast]);
  writeStoredToasts(nextToasts);
  window.dispatchEvent(new CustomEvent(toastEvent, { detail: toast }));
}

export function drainStoredToasts(): EngagementToast[] {
  const toasts = compactToasts(readStoredToasts());
  writeStoredToasts([]);
  return toasts;
}

export function engagementToastEventName() {
  return toastEvent;
}
