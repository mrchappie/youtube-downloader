"use client";

import { useState } from "react";
import { useJobs } from "@/lib/use-jobs";
import {
  PLAYLIST_DEFAULT_SIZE,
  PLAYLIST_MAX_SIZE,
  PLAYLIST_WARN_SIZE,
  looksLikePlaylist,
} from "@/lib/playlist";
import { isActiveStatus } from "@/lib/job-status";
import JobRow from "./job-row";
import type { JobStatus, PublicJob } from "@/lib/types";

interface PlaylistBatch {
  start: number;
  end: number;
  total: number;
}

interface PlaylistGroup {
  id: string;
  title: string;
  jobs: PublicJob[];
}

export default function PlaylistDownloader() {
  const { jobs, setJobs } = useJobs();
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState(String(PLAYLIST_DEFAULT_SIZE));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batch, setBatch] = useState<PlaylistBatch | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const startNum = Number.parseInt(start, 10);
  const endNum = Number.parseInt(end, 10);
  const size =
    Number.isFinite(startNum) && Number.isFinite(endNum) && endNum >= startNum
      ? endNum - startNum + 1
      : 0;
  const tooBig = size > PLAYLIST_MAX_SIZE;
  const warn = size > PLAYLIST_WARN_SIZE && !tooBig;

  async function submitRange(rawStart: number, rawEnd: number) {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a playlist URL first.");
      return;
    }
    if (!looksLikePlaylist(trimmed)) {
      setError("That is not a playlist URL — use the Single video page.");
      return;
    }
    if (
      !Number.isFinite(rawStart) ||
      !Number.isFinite(rawEnd) ||
      rawStart < 1 ||
      rawEnd < rawStart
    ) {
      setError("Enter a valid range (From must be at least 1 and ≤ To).");
      return;
    }
    if (rawEnd - rawStart + 1 > PLAYLIST_MAX_SIZE) {
      setError(`Max ${PLAYLIST_MAX_SIZE} items per batch.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          mode: "playlist",
          start: rawStart,
          end: rawEnd,
        }),
      });
      const data = (await res.json()) as {
        playlist?: PlaylistBatch & { id: string; title: string; itemCount: number };
        jobs?: PublicJob[];
        error?: string;
      };
      if (!res.ok || !data.playlist || !data.jobs) {
        setError(data.error ?? "Failed to read playlist");
      } else {
        setJobs((prev) => [...(data.jobs as PublicJob[]), ...prev]);
        const loaded: PlaylistBatch = {
          start: data.playlist.start,
          end: data.playlist.end,
          total: data.playlist.total,
        };
        setBatch(loaded);
        const batchSize = loaded.end - loaded.start + 1;
        const nextStart = loaded.end + 1;
        setStart(String(nextStart));
        setEnd(String(Math.min(nextStart + batchSize - 1, Math.max(loaded.total, nextStart))));
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submitRange(startNum, endNum);
  }

  function downloadNext() {
    if (!batch) return;
    const batchSize = batch.end - batch.start + 1;
    const nextStart = batch.end + 1;
    if (nextStart > batch.total) return;
    const nextEnd = Math.min(nextStart + batchSize - 1, batch.total);
    setStart(String(nextStart));
    setEnd(String(nextEnd));
    void submitRange(nextStart, nextEnd);
  }

  async function cancelJob(id: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "canceled" as JobStatus } : j)),
    );
    await fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function retryJob(id: string) {
    const res = await fetch(`/api/jobs/${id}/retry`, { method: "POST" }).catch(
      () => null,
    );
    if (res?.ok) {
      const data = (await res.json()) as { job: PublicJob };
      setJobs((prev) => prev.map((j) => (j.id === id ? data.job : j)));
    }
  }

  async function cancelPlaylist(id: string) {
    setJobs((prev) =>
      prev.map((j) =>
        j.playlistId === id && isActiveStatus(j.status)
          ? { ...j, status: "canceled" as JobStatus }
          : j,
      ),
    );
    await fetch(`/api/playlists/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groups: PlaylistGroup[] = [];
  for (const job of jobs) {
    if (!job.playlistId) continue;
    let group = groups.find((g) => g.id === job.playlistId);
    if (!group) {
      group = {
        id: job.playlistId,
        title: job.playlistTitle ?? "Playlist",
        jobs: [],
      };
      groups.push(group);
    }
    group.jobs.push(job);
  }
  for (const group of groups) {
    group.jobs.sort((a, b) => (a.playlistIndex ?? 0) - (b.playlistIndex ?? 0));
  }

  const hasMore = batch ? batch.end < batch.total : false;
  const nextStart = batch ? batch.end + 1 : 0;
  const nextEnd = batch
    ? Math.min(nextStart + (batch.end - batch.start + 1) - 1, batch.total)
    : 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Playlist
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Playlist to <span className="text-red-500">MP3</span>
        </h1>
        <p className="mt-3 text-base text-zinc-400">
          Download a playlist in batches of {PLAYLIST_DEFAULT_SIZE}. Each video gets its
          own job.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/playlist?list=..."
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-red-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-red-500/20"
        />
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            From
            <input
              type="number"
              min={1}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-11 w-24 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-red-500/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            To
            <input
              type="number"
              min={1}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-11 w-24 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-red-500/60"
            />
          </label>
          <span className="pb-3 text-xs text-zinc-500">
            {size > 0 ? `${size} item${size === 1 ? "" : "s"}` : "—"}
          </span>
          <button
            type="submit"
            disabled={submitting || url.trim().length === 0 || tooBig || size <= 0}
            className="ml-auto h-11 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Loading..." : "Download batch"}
          </button>
        </div>
      </form>

      {tooBig && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Max {PLAYLIST_MAX_SIZE} items per batch. Reduce the range.
        </p>
      )}
      {warn && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Heads up: downloading {size} videos at once can be heavy and may crash the
          app. Keep batches under {PLAYLIST_WARN_SIZE}.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {batch && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs text-zinc-400">
            Loaded items {batch.start}–{batch.end} of {batch.total}.
          </p>
          {hasMore ? (
            <button
              onClick={downloadNext}
              disabled={submitting}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-40"
            >
              Download next ({nextStart}–{nextEnd})
            </button>
          ) : (
            <span className="text-xs text-emerald-400">
              Reached the end of the playlist.
            </span>
          )}
        </div>
      )}

      <section className="mt-8 space-y-3">
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
            No playlists yet. Paste a playlist link above to get started.
          </p>
        )}

        {groups.map((group) => {
          const total = group.jobs.length;
          const done = group.jobs.filter((j) => j.status === "completed").length;
          const failed = group.jobs.filter((j) => j.status === "error").length;
          const activeCount = group.jobs.filter((j) =>
            isActiveStatus(j.status),
          ).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const isCollapsed = collapsed.has(group.id);

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    onClick={() => toggleCollapse(group.id)}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    <span className="text-zinc-500">
                      {isCollapsed ? "\u25b6" : "\u25bc"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {group.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {done}/{total} done
                        {failed > 0 ? ` · ${failed} failed` : ""}
                        {activeCount > 0 ? ` · ${activeCount} active` : ""}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    {done > 0 && (
                      <a
                        href={`/api/download-all?playlist=${encodeURIComponent(group.id)}`}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        ZIP ({done})
                      </a>
                    )}
                    {activeCount > 0 && (
                      <button
                        onClick={() => cancelPlaylist(group.id)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
                      >
                        Cancel all
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-3 border-t border-white/10 p-3">
                  {group.jobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onCancel={cancelJob}
                      onRetry={retryJob}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
