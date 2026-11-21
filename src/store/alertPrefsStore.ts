import { create } from "zustand";

const STORAGE_KEY = "admin-alert-prefs";

interface AlertPrefs {
  soundEnabled: boolean;
  /** 0–1 */
  volume: number;
}

interface AlertPrefsState extends AlertPrefs {
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

const DEFAULTS: AlertPrefs = { soundEnabled: true, volume: 0.8 };

// Per-browser convenience only: storage can be unavailable (private mode,
// blocked site data), so every access is guarded and defaults apply.
function load(): AlertPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AlertPrefs>;
    return {
      soundEnabled:
        typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : DEFAULTS.soundEnabled,
      volume:
        typeof parsed.volume === "number" && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(prefs: AlertPrefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Not persisted; the setting still applies for this session.
  }
}

export const useAlertPrefs = create<AlertPrefsState>((set, get) => ({
  ...load(),
  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    save({ soundEnabled, volume: get().volume });
  },
  setVolume: (volume) => {
    set({ volume });
    save({ soundEnabled: get().soundEnabled, volume });
  },
}));
