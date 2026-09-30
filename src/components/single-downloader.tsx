"use client";

import { useState } from "react";
import Link from "next/link";
import { useJobs } from "@/lib/use-jobs";
import { looksLikePlaylist } from "@/lib/playlist";
import JobRow from "./job-row";
import type { JobStatus, PublicJob } from "@/lib/types";

export default function SingleDownloader() {
  const { jobs, setJobs } = useJobs();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const singles = jobs.filter((job) => !job.playlistId);
  const completed = singles.filter((job) => job.status === "completed").length;
  const playlistHint = looksLikePlaylist(url);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    if (looksLikePlaylist(trimmed)) {
      setError("That looks like a playlist — use the Playlist page.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, mode: "single" }),
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

  async function retryJob(id: string) {
    const res = await fetch(`/api/jobs/${id}/retry`, { method: "POST" }).catch(
      () => null,
    );
    if (res?.ok) {
      const data = (await res.json()) as { job: PublicJob };
      setJobs((prev) => prev.map((j) => (j.id === id ? data.job : j)));
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Single video
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Video to <span className="text-red-500">MP3</span>
        </h1>
        <p className="mt-3 text-base text-zinc-400">
          Paste a YouTube video link and get a clean MP3, with live progress.
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

      {playlistHint && !error && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          This is a playlist link.{" "}
          <Link href="/playlist" className="font-semibold underline">
            Go to the Playlist page
          </Link>
          .
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-10 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-zinc-400">Downloads</h2>
        <a
          href="/api/download-all?kind=singles"
          aria-disabled={completed === 0}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            completed === 0
              ? "pointer-events-none border border-white/10 text-zinc-600"
              : "bg-white text-zinc-900 hover:bg-zinc-200"
          }`}
        >
          Download all{completed > 0 ? ` (${completed})` : ""}
        </a>
      </div>

      <section className="space-y-3">
        {singles.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
            No videos yet. Paste a link above to get started.
          </p>
        )}
        {singles.map((job) => (
          <JobRow key={job.id} job={job} onCancel={cancelJob} onRetry={retryJob} />
        ))}
      </section>
    </div>
  );
}
