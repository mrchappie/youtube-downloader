"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Locale = "en" | "ro";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ro", label: "RO" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.single": "Single video",
  "nav.playlist": "Playlist",
  "lang.label": "Language",

  "sidebar.storage": "Storage",
  "sidebar.onDisk": "on disk",
  "sidebar.active": "active",
  "sidebar.job.one": "job",
  "sidebar.job.other": "jobs",
  "sidebar.footer":
    "Failed and canceled downloads are removed automatically. Finished MP3s stay until you clear them.",
  "action.failed": "Clear failed",
  "action.canceled": "Clear canceled",
  "action.completed": "Clear finished",
  "action.old": "Clear old",
  "action.all": "Clear everything",
  "cleanup.nothing": "Nothing to clear.",
  "cleanup.freed.one": "Freed {size} across 1 item.",
  "cleanup.freed.other": "Freed {size} across {count} items.",
  "cleanup.failed": "Cleanup failed.",

  "single.badge": "Single video",
  "single.titleBefore": "Video to",
  "single.subtitle":
    "Paste a YouTube video link and get a clean MP3, with live progress.",
  "single.playlistHint": "This is a playlist link.",
  "single.playlistHintLink": "Go to the Playlist page",

  "playlist.badge": "Playlist",
  "playlist.titleBefore": "Playlist to",
  "playlist.subtitle":
    "Download a playlist in batches of {size}. Each video gets its own job.",
  "playlist.empty":
    "No playlists yet. Paste a playlist link above to get started.",
  "playlists.heading": "Playlists",

  "form.urlVideo": "https://www.youtube.com/watch?v=...",
  "form.urlPlaylist": "https://www.youtube.com/playlist?list=...",
  "range.from": "From",
  "range.to": "To",
  "range.items.one": "1 item",
  "range.items.other": "{count} items",

  "downloads.heading": "Downloads",
  "action.downloadMp3": "Download MP3",
  "action.starting": "Starting...",
  "action.loading": "Loading...",
  "action.downloadAll": "Download all",
  "action.retryAllFailed": "Retry all failed",
  "action.downloadBatch": "Download batch",
  "action.downloadNext": "Download next",
  "action.retry": "Retry",
  "action.cancel": "Cancel",
  "action.cancelAll": "Cancel all",
  "action.zip": "ZIP",
  "batch.loaded": "Loaded items {start}–{end} of {total}.",
  "batch.end": "Reached the end of the playlist.",

  "warning.tooBig": "Max {max} items per batch. Reduce the range.",
  "warning.heavy":
    "Heads up: downloading {count} videos at once can be heavy and may crash the app. Keep batches under {warn}.",

  "group.loaded": "({count} loaded)",
  "group.done": "{done}/{total} done",
  "group.failed": "{count} failed",
  "group.active": "{count} active",

  "job.queued": "Waiting for a free slot...",
  "job.converting": "Converting to MP3...",
  "status.queued": "Queued",
  "status.resolving": "Resolving",
  "status.downloading": "Downloading",
  "status.converting": "Converting",
  "status.completed": "Ready",
  "status.error": "Failed",
  "status.canceled": "Canceled",

  "empty.single": "No videos yet. Paste a link above to get started.",
  "error.generic": "Something went wrong",
  "error.noServer": "Could not reach the server",
  "error.playlistOnSingle":
    "That looks like a playlist — use the Playlist page.",
  "error.playlistOnly":
    "That is not a playlist URL — use the Single video page.",
  "error.pastePlaylist": "Paste a playlist URL first.",
  "error.invalidRange":
    "Enter a valid range (From must be at least 1 and ≤ To).",
  "error.rangeTooBig": "Max {max} items per batch.",
  "error.playlistFailed": "Failed to read playlist",
};

const ro: Dict = {
  "nav.single": "Video simplu",
  "nav.playlist": "Playlistă",
  "lang.label": "Limbă",

  "sidebar.storage": "Stocare",
  "sidebar.onDisk": "pe disc",
  "sidebar.active": "active",
  "sidebar.job.one": "job",
  "sidebar.job.other": "joburi",
  "sidebar.footer":
    "Descărcările eșuate și anulate sunt eliminate automat. MP3-urile finalizate rămân până le ștergi.",
  "action.failed": "Șterge eșuate",
  "action.canceled": "Șterge anulate",
  "action.completed": "Șterge finalizate",
  "action.old": "Șterge vechi",
  "action.all": "Șterge tot",
  "cleanup.nothing": "Nimic de șters.",
  "cleanup.freed.one": "Eliberat {size} pentru 1 element.",
  "cleanup.freed.other": "Eliberat {size} pentru {count} elemente.",
  "cleanup.failed": "Curățarea a eșuat.",

  "single.badge": "Video simplu",
  "single.titleBefore": "Video în",
  "single.subtitle":
    "Lipește un link de video YouTube și obții un MP3 curat, cu progres în timp real.",
  "single.playlistHint": "Acesta este un link de playlistă.",
  "single.playlistHintLink": "Mergi la pagina Playlistă",

  "playlist.badge": "Playlistă",
  "playlist.titleBefore": "Playlistă în",
  "playlist.subtitle":
    "Descarcă o playlistă în loturi de {size}. Fiecare video devine un job separat.",
  "playlist.empty":
    "Nicio playlistă încă. Lipește un link de playlistă mai sus pentru a începe.",
  "playlists.heading": "Playlisturi",

  "form.urlVideo": "https://www.youtube.com/watch?v=...",
  "form.urlPlaylist": "https://www.youtube.com/playlist?list=...",
  "range.from": "De la",
  "range.to": "Până la",
  "range.items.one": "1 element",
  "range.items.other": "{count} elemente",

  "downloads.heading": "Descărcări",
  "action.downloadMp3": "Descarcă MP3",
  "action.starting": "Se pornește...",
  "action.loading": "Se încarcă...",
  "action.downloadAll": "Descarcă tot",
  "action.retryAllFailed": "Reîncearcă toate eșuate",
  "action.downloadBatch": "Descarcă lotul",
  "action.downloadNext": "Descarcă următoarele",
  "action.retry": "Reîncearcă",
  "action.cancel": "Anulează",
  "action.cancelAll": "Anulează tot",
  "action.zip": "ZIP",
  "batch.loaded": "Încărcate elementele {start}–{end} din {total}.",
  "batch.end": "Ai ajuns la sfârșitul playlistei.",

  "warning.tooBig": "Maxim {max} elemente per lot. Micșorează intervalul.",
  "warning.heavy":
    "Atenție: descărcarea a {count} videoclipuri deodată poate fi solicitantă și poate duce la blocarea aplicației. Păstrează loturile sub {warn}.",

  "group.loaded": "({count} încărcate)",
  "group.done": "{done}/{total} finalizate",
  "group.failed": "{count} eșuate",
  "group.active": "{count} active",

  "job.queued": "Se așteaptă un slot liber...",
  "job.converting": "Se convertește în MP3...",
  "status.queued": "În așteptare",
  "status.resolving": "Se rezolvă",
  "status.downloading": "Se descarcă",
  "status.converting": "Se convertește",
  "status.completed": "Gata",
  "status.error": "Eșuat",
  "status.canceled": "Anulat",

  "empty.single": "Niciun video încă. Lipește un link mai sus pentru a începe.",
  "error.generic": "Ceva a mers greșit",
  "error.noServer": "Serverul nu a putut fi contactat",
  "error.playlistOnSingle":
    "Se pare că este o playlistă — folosește pagina Playlistă.",
  "error.playlistOnly":
    "Acesta nu este un link de playlistă — folosește pagina Video simplu.",
  "error.pastePlaylist": "Lipește mai întâi un link de playlistă.",
  "error.invalidRange":
    "Introdu un interval valid (De la trebuie să fie cel puțin 1 și ≤ Până la).",
  "error.rangeTooBig": "Maxim {max} elemente per lot.",
  "error.playlistFailed": "Nu s-a putut citi playlista.",
};

const DICTS: Record<Locale, Dict> = { en, ro };
const STORAGE_KEY = "ytdl.locale";

const listeners = new Set<() => void>();

function emitLocaleChange(): void {
  for (const listener of listeners) listener();
}

function subscribeLocale(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getLocaleSnapshot(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "ro" ? "ro" : "en";
  } catch {
    return "en";
  }
}

function getServerLocaleSnapshot(): Locale {
  return "en";
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[locale] ?? en;
    return {
      locale,
      setLocale: (next: Locale) => {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* storage unavailable */
        }
        emitLocaleChange();
      },
      t: (key, params) => {
        const template = dict[key] ?? en[key] ?? key;
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (match, name: string) =>
          name in params ? String(params[name]) : match,
        );
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
