"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { JobStatus, PublicJob } from "@/lib/types";

const STATUS_META: Record<JobStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-zinc-500/15 text-zinc-400" },
  resolving: { label: "Resolving", className: "bg-sky-500/15 text-sky-400" },
  downloading: { label: "Downloading", className: "bg-indigo-500/15 text-indigo-400" },
  converting: { label: "Converting", className: "bg-amber-500/15 text-amber-400" },
  completed: { label: "Ready", className: "bg-emerald-500/15 text-emerald-400" },
  error: { label: "Failed", className: "bg-red-500/15 text-red-400" },
  canceled: { label: "Canceled", className: "bg-zinc-500/15 text-zinc-500" },
};

const ACTIVE: JobStatus[] = ["queued", "resolving", "downloading", "converting"];

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSpeed(bps: number | null): string {
  if (!bps) return "";
  return `${formatBytes(bps)}/s`;
}

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs: PublicJob[] };
        if (active) setJobs(data.jobs);
      } catch {
        /* transient network error, keep polling */
      }
    };
    void tick();
    const id = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = (await res.json()) as { job?: PublicJob; error?: string };
      if (!res.ok || !data.job) {
        setError(data.error ?? "Something went wrong");
      } else {
        setJobs((prev) => [data.job as PublicJob, ...prev]);
        setUrl("");
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelJob(id: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "canceled" as JobStatus } : j)),
    );
    await fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          MP3 extraction
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          YouTube <span className="text-red-500">Downloader</span>
        </h1>
        <p className="mt-3 text-base text-zinc-400">
          Paste a YouTube link and get a clean MP3, with live progress.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          spellCheck={false}
          className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-red-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-red-500/20"
        />
        <button
          type="submit"
          disabled={submitting || url.trim().length === 0}
          className="h-12 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Starting..." : "Download MP3"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="mt-10 space-y-3">
        {jobs.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
            No downloads yet. Paste a link above to get started.
          </p>
        )}

        {jobs.map((job) => {
          const meta = STATUS_META[job.status];
          const isActive = ACTIVE.includes(job.status);
          return (
            <article
              key={job.id}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="relative hidden h-[67px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-zinc-800 sm:block">
                {job.thumbnail ? (
                  <Image
                    src={job.thumbnail}
                    alt=""
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                    MP3
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {job.title ?? job.url}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {job.uploader ?? "YouTube"} · {formatDuration(job.durationSec)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </div>

                {isActive && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
                      <span>
                        {job.status === "converting"
                          ? "Converting to MP3..."
                          : `${job.progress}%${
                              job.totalBytes
                                ? ` · ${formatBytes(job.downloadedBytes)} / ${formatBytes(job.totalBytes)}`
                                : ""
                            }`}
                      </span>
                      <span>{formatSpeed(job.speedBps)}</span>
                    </div>
                  </div>
                )}

                {job.status === "error" && job.error && (
                  <p className="mt-2 line-clamp-2 text-xs text-red-400">{job.error}</p>
                )}

                <div className="mt-3 flex gap-2">
                  {job.status === "completed" && (
                    <a
                      href={`/api/jobs/${job.id}/file`}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Download MP3
                    </a>
                  )}
                  {isActive && (
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
