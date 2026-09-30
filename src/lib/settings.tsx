"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_AUDIO_OPTIONS,
  sanitizeAudioOptions,
  type AudioOptions,
} from "./audio-options";

const STORAGE_KEY = "ytdl.audio";
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  return readRaw();
}

function getServerSnapshot(): string {
  return "";
}

interface SettingsValue {
  options: AudioOptions;
  setOptions: (options: AudioOptions) => void;
  update: (patch: Partial<AudioOptions>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const options = useMemo<AudioOptions>(() => {
    if (!raw) return DEFAULT_AUDIO_OPTIONS;
    try {
      return sanitizeAudioOptions(JSON.parse(raw));
    } catch {
      return DEFAULT_AUDIO_OPTIONS;
    }
  }, [raw]);

  const value = useMemo<SettingsValue>(
    () => ({
      options,
      setOptions: (next: AudioOptions) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        emit();
      },
      update: (patch: Partial<AudioOptions>) => {
        const next = { ...options, ...patch };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        emit();
      },
      reset: () => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* storage unavailable */
        }
        emit();
      },
    }),
    [options],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
