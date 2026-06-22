export type EngagementToastKind = "bust" | "coaching" | "points" | "rank" | "settled";

export type EngagementToast = {
  expiresMs: number;
  id: string;
  kind: EngagementToastKind;
  message: string;
};

const storageKey = "texas-poker-engagement-toasts";
const toastEvent = "texas-poker-engagement-toast";

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

export function pushEngagementToast(input: Omit<EngagementToast, "id"> & { id?: string }) {
  if (typeof window === "undefined") {
    return;
  }
  const toast: EngagementToast = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
  };
  writeStoredToasts([...readStoredToasts(), toast]);
  window.dispatchEvent(new CustomEvent(toastEvent, { detail: toast }));
}

export function drainStoredToasts(): EngagementToast[] {
  const toasts = readStoredToasts();
  writeStoredToasts([]);
  return toasts;
}

export function engagementToastEventName() {
  return toastEvent;
}
