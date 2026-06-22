export type StreamConnectionStatus = "connecting" | "live" | "recovering";

type ReconnectingEventSourceOptions = {
  baseDelayMs?: number;
  maxDelayMs?: number;
  onOpen?: () => void;
  onRecover?: () => void | Promise<void>;
  onSnapshot: (data: string) => void;
  onStatusChange?: (status: StreamConnectionStatus) => void;
  snapshotEvent?: string;
  url: string;
};

export function connectReconnectingEventSource({
  url,
  onOpen,
  onSnapshot,
  onStatusChange,
  onRecover,
  snapshotEvent = "snapshot",
  baseDelayMs = 1_000,
  maxDelayMs = 30_000,
}: ReconnectingEventSourceOptions) {
  let source: EventSource | null = null;
  let retryAttempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  function backoffMs() {
    const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** retryAttempt);
    const jitter = 0.8 + Math.random() * 0.4;
    return Math.round(exponential * jitter);
  }

  function scheduleReconnect() {
    if (closed) {
      return;
    }
    onStatusChange?.("recovering");
    void onRecover?.();
    const delay = backoffMs();
    retryAttempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      openConnection();
    }, delay);
  }

  function openConnection() {
    if (closed) {
      return;
    }
    source?.close();
    source = new EventSource(url);
    source.addEventListener("open", () => {
      retryAttempt = 0;
      onStatusChange?.("live");
      onOpen?.();
    });
    source.addEventListener(snapshotEvent, (event) => {
      retryAttempt = 0;
      onStatusChange?.("live");
      onSnapshot((event as MessageEvent<string>).data);
    });
    source.onerror = () => {
      source?.close();
      source = null;
      scheduleReconnect();
    };
  }

  onStatusChange?.("connecting");
  openConnection();

  return () => {
    closed = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    source?.close();
  };
}
