export type JobStatus =
  | "queued"
  | "resolving"
  | "downloading"
  | "converting"
  | "completed"
  | "error"
  | "canceled";

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  title: string | null;
  uploader: string | null;
  durationSec: number | null;
  thumbnail: string | null;
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speedBps: number | null;
  etaSec: number | null;
  filePath: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PublicJob {
  id: string;
  url: string;
  status: JobStatus;
  title: string | null;
  uploader: string | null;
  durationSec: number | null;
  thumbnail: string | null;
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speedBps: number | null;
  etaSec: number | null;
  hasFile: boolean;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export function toPublicJob(job: Job): PublicJob {
  return {
    id: job.id,
    url: job.url,
    status: job.status,
    title: job.title,
    uploader: job.uploader,
    durationSec: job.durationSec,
    thumbnail: job.thumbnail,
    progress: job.progress,
    downloadedBytes: job.downloadedBytes,
    totalBytes: job.totalBytes,
    speedBps: job.speedBps,
    etaSec: job.etaSec,
    hasFile: job.status === "completed" && job.filePath !== null,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
