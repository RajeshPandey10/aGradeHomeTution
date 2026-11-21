export type AlertKind =
  | "parent-request"
  | "teacher-request"
  | "refund-request"
  | "request-fulfilled";

/**
 * One file per alert type. To use your own sound, replace the file in
 * public/sounds/ (keep the name) or point the path at a new file — any
 * format the browser can decode works (wav, mp3, ogg, m4a).
 * Bump SOUND_VERSION whenever a file changes so browsers don't keep the old one.
 */
const SOUND_VERSION = 2;

export const ALERT_SOUNDS: Record<AlertKind, string> = {
  "parent-request": `/sounds/parent-request.wav?v=${SOUND_VERSION}`,
  "teacher-request": `/sounds/teacher-request.wav?v=${SOUND_VERSION}`,
  "refund-request": `/sounds/refund-request.wav?v=${SOUND_VERSION}`,
  "request-fulfilled": `/sounds/request-fulfilled.wav?v=${SOUND_VERSION}`,
};

// Used only if a sound file fails to load, so an alert is never silent.
const FALLBACK_FREQUENCY: Record<AlertKind, number> = {
  "parent-request": 660,
  "teacher-request": 880,
  "refund-request": 520,
  "request-fulfilled": 1046,
};

let context: AudioContext | null = null;
const buffers = new Map<AlertKind, Promise<AudioBuffer | null>>();

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  return context;
}

function loadBuffer(kind: AlertKind): Promise<AudioBuffer | null> {
  let pending = buffers.get(kind);
  if (!pending) {
    const ctx = getContext();
    pending = ctx
      ? fetch(ALERT_SOUNDS[kind])
          .then((res) => {
            if (!res.ok) throw new Error(`Sound ${kind} failed to load`);
            return res.arrayBuffer();
          })
          .then((data) => ctx.decodeAudioData(data))
          .catch(() => {
            buffers.delete(kind); // retry on the next alert
            return null;
          })
      : Promise.resolve(null);
    buffers.set(kind, pending);
  }
  return pending;
}

/**
 * Browsers keep audio locked until the person interacts with the page. Call
 * this from a click/keypress; after that, alerts can play while the tab is in
 * the background.
 */
export function unlockAudio() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
  (Object.keys(ALERT_SOUNDS) as AlertKind[]).forEach((kind) => void loadBuffer(kind));
}

export function isAudioUnlocked() {
  return context?.state === "running";
}

async function ensureRunning(ctx: AudioContext) {
  if (ctx.state === "running") return true;
  // resume() never settles while audio is still locked, so don't wait on it.
  await Promise.race([
    ctx.resume().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 200)),
  ]);
  return (ctx.state as AudioContextState) === "running";
}

/** Plays the alert's sound. Resolves false when audio is still locked. */
export async function playAlertSound(kind: AlertKind, volume: number): Promise<boolean> {
  const ctx = getContext();
  if (!ctx || !(await ensureRunning(ctx))) return false;

  const output = ctx.createGain();
  output.gain.value = Math.max(0, Math.min(1, volume));
  output.connect(ctx.destination);

  const buffer = await loadBuffer(kind);
  if (buffer) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    source.start();
    return true;
  }

  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = FALLBACK_FREQUENCY[kind];
  envelope.gain.setValueAtTime(0.5, ctx.currentTime);
  envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.6);
  return true;
}
