"use client";

import { useState } from "react";
import Link from "next/link";
import { useJobs } from "@/lib/use-jobs";
import { looksLikePlaylist } from "@/lib/playlist";
import { useI18n } from "@/lib/i18n";
import JobRow from "./job-row";
import type { JobStatus, PublicJob } from "@/lib/types";

export default function SingleDownloader() {
  const { t } = useI18n();
  const { jobs, setJobs } = useJobs();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const singles = jobs.filter((job) => !job.playlistId);
  const completed = singles.filter((job) => job.status === "completed").length;
  const failed = singles.filter(
    (job) => job.status === "error" || job.status === "canceled",
  ).length;
  const playlistHint = looksLikePlaylist(url);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || submitting) return;
    if (looksLikePlaylist(trimmed)) {
      setError(t("error.playlistOnSingle"));
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
        setError(data.error ?? t("error.generic"));
      } else {
        setJobs((prev) => [data.job as PublicJob, ...prev]);
        setUrl("");
      }
    } catch {
      setError(t("error.noServer"));
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

  async function retryAllFailed() {
    await fetch("/api/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "singles" }),
    }).catch(() => {});
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {t("single.badge")}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("single.titleBefore")} <span className="text-red-500">MP3</span>
        </h1>
        <p className="mt-3 text-base text-muted">{t("single.subtitle")}</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("form.urlVideo")}
          spellCheck={false}
          className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-2 outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20"
        />
        <button
          type="submit"
          disabled={submitting || url.trim().length === 0}
          className="h-12 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? t("action.starting") : t("action.downloadMp3")}
        </button>
      </form>

      {playlistHint && !error && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          {t("single.playlistHint")}{" "}
          <Link href="/playlist" className="font-semibold underline">
            {t("single.playlistHintLink")}
          </Link>
          .
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-10 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted">
          {t("downloads.heading")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={retryAllFailed}
            disabled={failed === 0}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              failed === 0
                ? "cursor-not-allowed border border-border text-muted-2"
                : "border border-border bg-card text-foreground hover:bg-hover"
            }`}
          >
            {t("action.retryAllFailed")}
            {failed > 0 ? ` (${failed})` : ""}
          </button>
          <a
            href="/api/download-all?kind=singles"
            aria-disabled={completed === 0}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              completed === 0
                ? "pointer-events-none border border-border text-muted-2"
                : "bg-foreground text-background hover:opacity-90"
            }`}
          >
            {t("action.downloadAll")}
            {completed > 0 ? ` (${completed})` : ""}
          </a>
        </div>
      </div>

      <section className="space-y-3">
        {singles.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-2">
            {t("empty.single")}
          </p>
        )}
        {singles.map((job) => (
          <JobRow key={job.id} job={job} onCancel={cancelJob} onRetry={retryJob} />
        ))}
      </section>
    </div>
  );
}
