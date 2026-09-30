import type { JobStatus } from "./types";

export const STATUS_META: Record<JobStatus, { label: string; className: string }> =
  {
    queued: { label: "Queued", className: "bg-zinc-500/15 text-zinc-400" },
    resolving: { label: "Resolving", className: "bg-sky-500/15 text-sky-400" },
    downloading: {
      label: "Downloading",
      className: "bg-indigo-500/15 text-indigo-400",
    },
    converting: { label: "Converting", className: "bg-amber-500/15 text-amber-400" },
    completed: { label: "Ready", className: "bg-emerald-500/15 text-emerald-400" },
    error: { label: "Failed", className: "bg-red-500/15 text-red-400" },
    canceled: { label: "Canceled", className: "bg-zinc-500/15 text-zinc-500" },
  };

export const ACTIVE_STATUSES: JobStatus[] = [
  "queued",
  "resolving",
  "downloading",
  "converting",
];

export function isActiveStatus(status: JobStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
