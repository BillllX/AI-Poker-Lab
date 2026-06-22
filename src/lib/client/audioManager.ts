"use client";

import { withBasePath } from "./basePath";

export type TableSoundName =
  | "allin"
  | "bet"
  | "blind"
  | "call"
  | "check"
  | "deal"
  | "fold"
  | "myAgentDeciding"
  | "raise"
  | "win"
  | "yourTurn";

export type SoundState = {
  enabled: boolean;
  unlocked: boolean;
};

type SoundListener = (state: SoundState) => void;
type QueuedSound = {
  minIntervalMs: number;
  sound: TableSoundName;
  volume: number;
};

const soundPreferenceKey = "texas-poker-sound-enabled";
/** Warm a small set on unlock; everything else loads on first play. */
const essentialSounds: TableSoundName[] = ["check", "deal", "win"];
const soundPaths: Record<TableSoundName, string> = {
  allin: withBasePath("/audio/actions/all-in.wav"),
  bet: withBasePath("/audio/actions/bet.wav"),
  blind: withBasePath("/audio/actions/blind.wav"),
  call: withBasePath("/audio/actions/call.wav"),
  check: withBasePath("/audio/actions/check.wav"),
  deal: withBasePath("/audio/table/deal.wav"),
  fold: withBasePath("/audio/actions/fold.wav"),
  myAgentDeciding: withBasePath("/audio/table/your-turn.wav"),
  raise: withBasePath("/audio/actions/raise.wav"),
  win: withBasePath("/audio/table/win.wav"),
  yourTurn: withBasePath("/audio/table/your-turn.wav"),
};

class AudioManager {
  private enabled = true;
  private initialized = false;
  private listeners = new Set<SoundListener>();
  private unlocked = false;
  private audioContext?: AudioContext;
  private audioBuffers = new Map<TableSoundName, AudioBuffer>();
  private bufferLoads = new Map<TableSoundName, Promise<AudioBuffer | undefined>>();
  private fallbackBuffers = new Map<TableSoundName, HTMLAudioElement[]>();
  private soundQueue: QueuedSound[] = [];
  private queueRunning = false;
  private lastPlayedAt = new Map<TableSoundName, number>();

  getState(): SoundState {
    this.ensureInitialized();
    return { enabled: this.enabled, unlocked: this.unlocked };
  }

  subscribe(listener: SoundListener) {
    this.ensureInitialized();
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async unlock() {
    this.ensureInitialized();
    this.enabled = true;
    this.savePreference();

    try {
      const context = this.ensureAudioContext();
      if (context) {
        await context.resume();
        this.playUnlockTick(context);
        this.unlocked = context.state === "running";
        void this.preloadEssentials();
      } else {
        const audio = this.cloneFallbackAudio("check");
        audio.preload = "auto";
        audio.volume = 0.01;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        this.unlocked = true;
      }
    } catch {
      this.unlocked = false;
    }

    this.emit();
    return this.unlocked;
  }

  setEnabled(enabled: boolean) {
    this.ensureInitialized();
    this.enabled = enabled;
    this.savePreference();
    this.emit();
  }

  toggleMuted() {
    this.setEnabled(!this.enabled);
  }

  play(sound: TableSoundName, { volume = 0.72, minIntervalMs = 80 }: { volume?: number; minIntervalMs?: number } = {}) {
    this.ensureInitialized();
    if (!this.enabled || !this.unlocked) {
      return;
    }

    const now = Date.now();
    if (now - (this.lastPlayedAt.get(sound) ?? 0) < minIntervalMs) {
      return;
    }
    this.lastPlayedAt.set(sound, now);

    this.soundQueue.push({ minIntervalMs, sound, volume });
    void this.drainQueue();
  }

  /** @deprecated Prefer lazy play(); kept for compatibility — warms essentials only. */
  preload() {
    this.preloadEssentials();
  }

  preloadEssentials() {
    this.ensureInitialized();
    if (!this.unlocked) {
      return;
    }

    for (const sound of essentialSounds) {
      void this.loadBuffer(sound);
    }
  }

  private async drainQueue() {
    if (this.queueRunning) {
      return;
    }

    this.queueRunning = true;
    try {
      while (this.soundQueue.length > 0) {
        const item = this.soundQueue.shift();
        if (!item || !this.enabled || !this.unlocked) {
          continue;
        }

        await this.playNow(item.sound, item.volume);
        await delay(Math.max(70, Math.min(180, item.minIntervalMs)));
      }
    } finally {
      this.queueRunning = false;
    }
  }

  private async playNow(sound: TableSoundName, volume: number) {
    try {
      const context = this.ensureAudioContext();
      if (context) {
        if (context.state !== "running") {
          await context.resume();
        }
        const buffer = await this.loadBuffer(sound);
        if (!buffer) {
          return;
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        gain.gain.value = volume;
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(context.destination);
        source.start();
        this.unlocked = true;
        return;
      }

      const audio = this.cloneFallbackAudio(sound);
      audio.preload = "auto";
      audio.volume = volume;
      audio.currentTime = 0;
      await audio.play();
    } catch {
      this.unlocked = false;
      this.emit();
    }
  }

  private ensureAudioContext() {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }

    this.audioContext = new AudioContextConstructor();
    return this.audioContext;
  }

  private playUnlockTick(context: AudioContext) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    oscillator.frequency.value = 440;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.02);
  }

  private async loadBuffer(sound: TableSoundName) {
    const bufferKey = sharedBufferKey(sound);
    const existing = this.audioBuffers.get(bufferKey);
    if (existing) {
      return existing;
    }

    const existingLoad = this.bufferLoads.get(bufferKey);
    if (existingLoad) {
      return existingLoad;
    }

    const load = this.fetchAndDecode(bufferKey);
    this.bufferLoads.set(bufferKey, load);
    return load;
  }

  private async fetchAndDecode(sound: TableSoundName) {
    const context = this.ensureAudioContext();
    if (!context) {
      return undefined;
    }

    try {
      const response = await fetch(soundPaths[sound]);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(sound, audioBuffer);
      return audioBuffer;
    } catch {
      return undefined;
    }
  }

  private cloneFallbackAudio(sound: TableSoundName) {
    const pool = this.fallbackPoolFor(sound);
    const reusable = pool.find((audio) => audio.paused || audio.ended);
    if (reusable) {
      return reusable;
    }

    const next = new Audio(soundPaths[sound]);
    next.preload = "none";
    pool.push(next);
    return next;
  }

  private fallbackPoolFor(sound: TableSoundName) {
    const existing = this.fallbackBuffers.get(sound);
    if (existing) {
      return existing;
    }

    const pool: HTMLAudioElement[] = [];
    this.fallbackBuffers.set(sound, pool);
    return pool;
  }

  private ensureInitialized() {
    if (this.initialized || typeof window === "undefined") {
      return;
    }
    this.initialized = true;
    this.enabled = window.localStorage.getItem(soundPreferenceKey) !== "false";
  }

  private savePreference() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(soundPreferenceKey, String(this.enabled));
    }
  }

  private emit() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const audioManager = new AudioManager();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** myAgentDeciding shares the your-turn clip — avoid duplicate decode/fetch. */
function sharedBufferKey(sound: TableSoundName): TableSoundName {
  return sound === "myAgentDeciding" ? "yourTurn" : sound;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
