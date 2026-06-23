const STORAGE_PREFIX = "texas-poker:";

export const USER_STORAGE_SCOPE_CHANGE_EVENT = "texas-poker-user-storage-scope-change";

let currentStorageUserId: string | null = null;

export function setCurrentStorageUserId(userId: string | null): void {
  if (currentStorageUserId === userId) {
    return;
  }
  currentStorageUserId = userId;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USER_STORAGE_SCOPE_CHANGE_EVENT));
  }
}

export function getCurrentStorageUserId(): string | null {
  return currentStorageUserId;
}

function stripStoragePrefix(baseKey: string): string {
  return baseKey.startsWith(STORAGE_PREFIX) ? baseKey.slice(STORAGE_PREFIX.length) : baseKey;
}

export function getUserScopedStorageKey(baseKey: string): string {
  const suffix = stripStoragePrefix(baseKey);
  if (currentStorageUserId) {
    return `${STORAGE_PREFIX}users:${encodeURIComponent(currentStorageUserId)}:${suffix}`;
  }
  return `${STORAGE_PREFIX}guest:${suffix}`;
}
