import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import {
  BASE_ARGS,
  FFMPEG_DIR,
  PROGRESS_PREFIX,
  PROGRESS_TEMPLATE,
  YTDLP_PATH,
  fetchMetadata,
} from "./ytdlp";
import type { Job } from "./types";

const MAX_JOBS = 50;
export const OLD_AGE_MS = 60 * 60 * 1000;

const ACTIVE_STATUSES = new Set<Job["status"]>([
  "queued",
  "resolving",
  "downloading",
  "converting",
]);

export function isActive(job: Job): boolean {
  return ACTIVE_STATUSES.has(job.status);
}

interface JobStore {
  jobs: Map<string, Job>;
  procs: Map<string, ChildProcess>;
}

const globalStore = globalThis as unknown as { __ytdlStore?: JobStore };
const store: JobStore =
  globalStore.__ytdlStore ??
  (globalStore.__ytdlStore = { jobs: new Map(), procs: new Map() });

function jobDir(id: string): string {
  return path.join(os.tmpdir(), "ytdl-web", id);
}

export function newJob(url: string): Job {
  const now = Date.now();
  const job: Job = {
    id: crypto.randomUUID(),
    url,
    status: "queued",
    title: null,
    uploader: null,
    durationSec: null,
    thumbnail: null,
    progress: 0,
    downloadedBytes: 0,
    totalBytes: null,
    speedBps: null,
    etaSec: null,
    filePath: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  store.jobs.set(job.id, job);
  prune();
  void run(job).catch(() => {
    /* run() handles its own errors */
  });
  return job;
}

export function getJob(id: string): Job | undefined {
  return store.jobs.get(id);
}

export function listJobs(): Job[] {
  return [...store.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function cancelJob(id: string): boolean {
  const job = store.jobs.get(id);
  if (!job) return false;
  if (job.status === "completed" || job.status === "error") return false;
  const proc = store.procs.get(id);
  if (proc?.pid) killTree(proc.pid);
  job.status = "canceled";
  job.updatedAt = Date.now();
  return true;
}

function killTree(pid: number): void {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
  }
}

function toNumber(value: string): number | null {
  if (!value || value === "NA") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function run(job: Job): Promise<void> {
  job.status = "resolving";
  job.updatedAt = Date.now();

  try {
    const meta = await fetchMetadata(job.url);
    job.title = meta.title;
    job.uploader = meta.uploader;
    job.durationSec = meta.durationSec;
    job.thumbnail = meta.thumbnail;
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : "Failed to resolve video";
    job.updatedAt = Date.now();
    return;
  }

  const afterMeta = getJob(job.id);
  if (!afterMeta || afterMeta.status === "canceled") return;

  const dir = jobDir(job.id);
  await mkdir(dir, { recursive: true });
  const outputTemplate = path.join(dir, "audio.%(ext)s");

  const args = [
    ...BASE_ARGS,
    "--newline",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    ...(FFMPEG_DIR ? ["--ffmpeg-location", FFMPEG_DIR] : []),
    "--progress-template",
    PROGRESS_TEMPLATE,
    "-o",
    outputTemplate,
    "--",
    job.url,
  ];

  await new Promise<void>((resolve) => {
    const child = spawn(/* turbopackIgnore: true */ YTDLP_PATH, args, {
      windowsHide: true,
    });
    store.procs.set(job.id, child);
    job.status = "downloading";
    job.updatedAt = Date.now();

    let log = "";
    const onLine = (raw: string) => {
      const line = raw.trim();
      if (!line) return;
      log = `${log}\n${line}`.slice(-4000);

      if (line.startsWith(PROGRESS_PREFIX)) {
        const parts = line.slice(PROGRESS_PREFIX.length).split("|");
        const downloaded = toNumber(parts[0]);
        const total = toNumber(parts[1]) ?? toNumber(parts[2]);
        job.downloadedBytes = downloaded ?? job.downloadedBytes;
        job.totalBytes = total ?? job.totalBytes;
        job.speedBps = toNumber(parts[3]);
        job.etaSec = toNumber(parts[4]);
        if (job.totalBytes && job.downloadedBytes) {
          job.progress = Math.min(
            100,
            Math.round((job.downloadedBytes / job.totalBytes) * 100),
          );
        }
        if (job.status !== "downloading") job.status = "downloading";
        job.updatedAt = Date.now();
        return;
      }

      if (line.startsWith("[ExtractAudio]")) {
        job.status = "converting";
        job.progress = 100;
        job.updatedAt = Date.now();
      }
    };

    let buffer = "";
    const consume = (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) onLine(line);
    };
    child.stdout.on("data", consume);
    child.stderr.on("data", consume);

    child.on("error", (err) => {
      job.status = "error";
      job.error = err.message;
      job.updatedAt = Date.now();
      store.procs.delete(job.id);
      void rm(dir, { recursive: true, force: true }).catch(() => {});
      resolve();
    });

    child.on("close", (code) => {
      store.procs.delete(job.id);
      if (buffer.trim()) onLine(buffer);

      if (job.status === "canceled") {
        void rm(dir, { recursive: true, force: true }).catch(() => {});
        resolve();
        return;
      }

      if (code === 0) {
        const filePath = path.join(dir, "audio.mp3");
        stat(filePath)
          .then(() => {
            job.filePath = filePath;
            job.status = "completed";
            job.progress = 100;
            job.speedBps = null;
            job.etaSec = null;
            job.updatedAt = Date.now();
          })
          .catch(() => {
            job.status = "error";
            job.error = "Conversion finished but no MP3 was produced";
            job.updatedAt = Date.now();
            void rm(dir, { recursive: true, force: true }).catch(() => {});
          })
          .finally(resolve);
        return;
      }

      job.status = "error";
      job.error = lastErrorLine(log) ?? `yt-dlp exited with code ${code}`;
      job.updatedAt = Date.now();
      void rm(dir, { recursive: true, force: true }).catch(() => {});
      resolve();
    });
  });
}

function lastErrorLine(log: string): string | null {
  const lines = log
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith(PROGRESS_PREFIX));
  const errorLine = [...lines].reverse().find((l) => /error/i.test(l));
  return (errorLine ?? lines.at(-1)) ?? null;
}

function prune(): void {
  const all = listJobs();
  if (all.length <= MAX_JOBS) return;
  for (const stale of all.slice(MAX_JOBS)) {
    if (stale.status === "downloading" || stale.status === "converting") continue;
    store.jobs.delete(stale.id);
    void rm(jobDir(stale.id), { recursive: true, force: true }).catch(() => {});
  }
}

async function dirSize(dir: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await dirSize(full);
    } else {
      try {
        total += (await stat(full)).size;
      } catch {
        /* file vanished mid-scan */
      }
    }
  }
  return total;
}

async function removeJobFiles(job: Job): Promise<number> {
  const dir = jobDir(job.id);
  const size = await dirSize(dir);
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  return size;
}

export interface StorageStats {
  totalJobs: number;
  failed: number;
  completed: number;
  old: number;
  active: number;
  bytesOnDisk: number;
  oldAgeMs: number;
}

export async function storageStats(): Promise<StorageStats> {
  const all = listJobs();
  const now = Date.now();
  let bytesOnDisk = 0;
  let failed = 0;
  let completed = 0;
  let old = 0;
  let active = 0;

  for (const job of all) {
    if (isActive(job)) active += 1;
    if (job.status === "error") failed += 1;
    if (job.status === "completed") completed += 1;
    if (!isActive(job) && now - job.createdAt > OLD_AGE_MS) old += 1;
    bytesOnDisk += await dirSize(jobDir(job.id));
  }

  return {
    totalJobs: all.length,
    failed,
    completed,
    old,
    active,
    bytesOnDisk,
    oldAgeMs: OLD_AGE_MS,
  };
}

export type CleanupScope = "failed" | "completed" | "old" | "all";

export interface CleanupResult {
  scope: CleanupScope;
  removed: number;
  freedBytes: number;
}

export async function cleanup(scope: CleanupScope): Promise<CleanupResult> {
  const now = Date.now();
  const targets = listJobs().filter((job) => {
    if (isActive(job)) return false;
    switch (scope) {
      case "failed":
        return job.status === "error" || job.status === "canceled";
      case "completed":
        return job.status === "completed";
      case "old":
        return now - job.createdAt > OLD_AGE_MS;
      case "all":
        return true;
    }
  });

  let freedBytes = 0;
  for (const job of targets) {
    freedBytes += await removeJobFiles(job);
    store.jobs.delete(job.id);
  }

  return { scope, removed: targets.length, freedBytes };
}
