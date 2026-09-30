"use client";

import Image from "next/image";
import type { PublicJob } from "@/lib/types";
import { STATUS_META, isActiveStatus } from "@/lib/job-status";
import { formatBytes, formatDuration, formatSpeed } from "@/lib/format";

export default function JobRow({
  job,
  onCancel,
  onRetry,
}: {
  job: PublicJob;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const meta = STATUS_META[job.status];
  const active = isActiveStatus(job.status);
  const canRetry = job.status === "error" || job.status === "canceled";

  return (
    <article className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
              {job.playlistIndex !== null && (
                <span className="mr-1 text-zinc-500">{job.playlistIndex}.</span>
              )}
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

        {active && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
              <span>
                {job.status === "queued"
                  ? "Waiting for a free slot..."
                  : job.status === "converting"
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
          {canRetry && (
            <button
              onClick={() => onRetry(job.id)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Retry
            </button>
          )}
          {active && (
            <button
              onClick={() => onCancel(job.id)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
