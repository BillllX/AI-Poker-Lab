"use client";

import { useEffect, useState } from "react";
import { audioManager, type SoundState } from "@/lib/client/audioManager";
import styles from "./SoundToggle.module.css";

export function SoundToggle({ className }: { className?: string }) {
  const [soundState, setSoundState] = useState<SoundState>(() => ({ enabled: true, unlocked: false }));

  useEffect(() => audioManager.subscribe(setSoundState), []);

  async function handleClick() {
    if (!soundState.unlocked) {
      await audioManager.unlock();
      return;
    }

    audioManager.toggleMuted();
  }

  const muted = !soundState.enabled;
  const locked = !soundState.unlocked;
  const label = locked ? "Enable sound" : muted ? "Unmute sound" : "Mute sound";

  return (
    <button
      aria-label={label}
      className={`${styles.soundToggle} ${locked ? styles.locked : ""} ${muted ? styles.muted : ""} ${className ?? ""}`}
      onClick={() => void handleClick()}
      title={label}
      type="button"
    >
      <SpeakerIcon muted={muted || locked} />
      {locked ? <span className={styles.unlockDot} aria-hidden="true" /> : null}
    </button>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path
        d="M4 9.25v5.5h3.2L12 18.5v-13L7.2 9.25H4Z"
        fill="currentColor"
      />
      {muted ? (
        <>
          <path d="m16.2 9.2 4.1 4.1M20.3 9.2l-4.1 4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M15.2 8.2a5 5 0 0 1 0 7.6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <path d="M17.8 5.6a8.6 8.6 0 0 1 0 12.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
