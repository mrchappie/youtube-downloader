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
