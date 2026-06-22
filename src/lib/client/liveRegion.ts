export function liveRegionProps(kind: "status" | "alert") {
  return kind === "alert"
    ? ({ "aria-live": "assertive", role: "alert" } as const)
    : ({ "aria-live": "polite", role: "status" } as const);
}
