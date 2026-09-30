"use client";

import Image from "next/image";
import type { PublicJob } from "@/lib/types";
import { STATUS_CLASS, isActiveStatus } from "@/lib/job-status";
import { formatBytes, formatDuration, formatSpeed } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function JobRow({
  job,
  onCancel,
  onRetry,
}: {
  job: PublicJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const { t } = useI18n();
  const active = isActiveStatus(job.status);
  const canRetry = job.status === "error" || job.status === "canceled";

  return (
    <article className="flex gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="relative hidden h-[67px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-card-strong sm:block">
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
          <div className="flex h-full items-center justify-center text-xs text-muted-2">
            MP3
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {job.playlistIndex !== null && (
                <span className="mr-1 text-muted-2">{job.playlistIndex}.</span>
              )}
              {job.title ?? job.url}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-2">
              {job.uploader ?? "YouTube"} · {formatDuration(job.durationSec)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASS[job.status]}`}
          >
            {t(`status.${job.status}`)}
          </span>
        </div>

        {active && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-2">
              <span>
                {job.status === "queued"
                  ? t("job.queued")
                  : job.status === "converting"
                    ? t("job.converting")
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
          <p className="mt-2 line-clamp-2 text-xs text-red-600 dark:text-red-400">
            {job.error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          {job.status === "completed" && (
            <a
              href={`/api/jobs/${job.id}/file`}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
            >
              {t("action.downloadMp3")}
            </a>
          )}
          {canRetry && (
            <button
              onClick={() => onRetry(job.id)}
              className="rounded-lg bg-hover px-3 py-1.5 text-xs font-semibold text-foreground transition hover:opacity-80"
            >
              {t("action.retry")}
            </button>
          )}
          {active && (
            <button
              onClick={() => onCancel(job.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-hover hover:text-foreground"
            >
              {t("action.cancel")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
