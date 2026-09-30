import type { JobStatus } from "./types";

export const STATUS_CLASS: Record<JobStatus, string> = {
  queued: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  resolving: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  downloading: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  converting: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
  canceled: "bg-zinc-500/15 text-zinc-500",
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
