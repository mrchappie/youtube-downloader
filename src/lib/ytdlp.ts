import path from "node:path";
import { spawn } from "node:child_process";
import ytdlp from "youtube-dl-exec";
import ffmpegPath from "ffmpeg-static";

const ytdlpConstants = (
  ytdlp as unknown as { constants?: { YOUTUBE_DL_PATH?: string } }
).constants;

export const YTDLP_PATH =
  ytdlpConstants?.YOUTUBE_DL_PATH ??
  path.join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp",
  );

export const FFMPEG_DIR = ffmpegPath ? path.dirname(ffmpegPath) : null;

export const PROGRESS_PREFIX = "PROG|";

export const PROGRESS_TEMPLATE =
  `download:${PROGRESS_PREFIX}` +
  "%(progress.downloaded_bytes)s|" +
  "%(progress.total_bytes)s|" +
  "%(progress.total_bytes_estimate)s|" +
  "%(progress.speed)s|" +
  "%(progress.eta)s";

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function normalizeYouTubeUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;
  return parsed.toString();
}

export function isPlaylistUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/playlist") return true;
    return parsed.searchParams.has("list");
  } catch {
    return false;
  }
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export interface PlaylistEntry {
  id: string;
  index: number;
  title: string;
  durationSec: number | null;
  thumbnail: string | null;
  url: string;
}

export interface PlaylistMeta {
  id: string;
  title: string;
  start: number;
  end: number;
  total: number;
  entries: PlaylistEntry[];
}

export interface PlaylistRange {
  start?: number;
  end?: number;
}

export function fetchPlaylist(
  url: string,
  range: PlaylistRange = {},
): Promise<PlaylistMeta> {
  const start = Math.max(1, Math.floor(range.start ?? 1));
  const end = Math.max(start, Math.floor(range.end ?? start + 99));
  return new Promise((resolve, reject) => {
    const args = [
      "--ignore-config",
      "--no-warnings",
      "--no-color",
      "--flat-playlist",
      "--playlist-start",
      String(start),
      "--playlist-end",
      String(end),
      "--dump-single-json",
      "--",
      url,
    ];
    const child = spawn(/* turbopackIgnore: true */ YTDLP_PATH, args, {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        return;
      }
      try {
        const raw = JSON.parse(stdout) as {
          id?: string;
          title?: string;
          playlist_count?: number;
          entries?: unknown[];
        };
        const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
        const entries: PlaylistEntry[] = [];
        rawEntries.forEach((entry, rawIndex) => {
          if (typeof entry !== "object" || entry === null) return;
          const record = entry as Record<string, unknown>;
          const id = typeof record.id === "string" ? record.id : null;
          if (!id) return;
          entries.push({
            id,
            index: start + rawIndex,
            title:
              typeof record.title === "string" && record.title
                ? record.title
                : `Video ${id}`,
            durationSec:
              typeof record.duration === "number" &&
              Number.isFinite(record.duration)
                ? Math.round(record.duration)
                : null,
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            url: watchUrl(id),
          });
        });
        if (entries.length === 0) {
          reject(new Error("No videos found in that range"));
          return;
        }
        const total =
          typeof raw.playlist_count === "number" && raw.playlist_count > 0
            ? raw.playlist_count
            : start - 1 + entries.length;
        const fallbackId = new URL(url).searchParams.get("list") ?? raw.id;
        resolve({
          id: raw.id ?? fallbackId ?? "playlist",
          title: raw.title ?? "Playlist",
          start,
          end,
          total,
          entries,
        });
      } catch {
        reject(new Error("Could not read playlist metadata"));
      }
    });
  });
}

export interface VideoMeta {
  title: string | null;
  uploader: string | null;
  durationSec: number | null;
  thumbnail: string | null;
}

export const BASE_ARGS = [
  "--ignore-config",
  "--no-playlist",
  "--no-warnings",
  "--no-color",
];

export function fetchMetadata(url: string): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const args = [
      ...BASE_ARGS,
      "--skip-download",
      "--print",
      "%(.{title,uploader,duration,thumbnail})j",
      "--",
      url,
    ];
    const child = spawn(/* turbopackIgnore: true */ YTDLP_PATH, args, {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        return;
      }
      const line = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("{"))
        .pop();
      if (!line) {
        reject(new Error("Could not read video metadata"));
        return;
      }
      try {
        const raw = JSON.parse(line) as {
          title?: string;
          uploader?: string;
          duration?: number;
          thumbnail?: string;
        };
        resolve({
          title: raw.title ?? null,
          uploader: raw.uploader ?? null,
          durationSec:
            typeof raw.duration === "number" && Number.isFinite(raw.duration)
              ? Math.round(raw.duration)
              : null,
          thumbnail: raw.thumbnail ?? null,
        });
      } catch {
        reject(new Error("Could not parse video metadata"));
      }
    });
  });
}
