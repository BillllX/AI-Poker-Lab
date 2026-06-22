const STORAGE_KEY = "texas-poker-coach-dock-collapsed";
const CHANGE_EVENT = "texas-poker-coach-dock-collapse-changed";

export function readCoachDockCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function writeCoachDockCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function coachDockCollapseEventName() {
  return CHANGE_EVENT;
}

export function subscribeCoachDockCollapse(onStoreChange: () => void) {
  function handleChange() {
    onStoreChange();
  }

  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
