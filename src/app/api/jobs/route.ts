import { newJob, newPlaylistJobs, listJobs } from "@/lib/jobs";
import { fetchPlaylist, isPlaylistUrl, normalizeYouTubeUrl } from "@/lib/ytdlp";
import { PLAYLIST_DEFAULT_SIZE, PLAYLIST_MAX_SIZE } from "@/lib/playlist";
import { toPublicJob } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "auto" | "single" | "playlist";

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET() {
  return Response.json({ jobs: listJobs().map(toPublicJob) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const record = (
    typeof body === "object" && body !== null ? body : {}
  ) as Record<string, unknown>;
  const url = String(record.url ?? "");
  const mode: Mode =
    record.mode === "playlist" || record.mode === "single"
      ? record.mode
      : "auto";

  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) {
    return Response.json(
      { error: "Please provide a valid YouTube URL" },
      { status: 400 },
    );
  }

  const wantsPlaylist =
    mode === "playlist" || (mode === "auto" && isPlaylistUrl(normalized));

  if (wantsPlaylist) {
    if (!isPlaylistUrl(normalized)) {
      return Response.json(
        { error: "That is not a playlist URL" },
        { status: 400 },
      );
    }

    const start = clampInt(record.start, 1, 1, 1_000_000);
    const end = clampInt(
      record.end,
      start + PLAYLIST_DEFAULT_SIZE - 1,
      start,
      1_000_000,
    );
    const size = end - start + 1;
    if (size > PLAYLIST_MAX_SIZE) {
      return Response.json(
        {
          error: `Range too large: ${size} items requested, max ${PLAYLIST_MAX_SIZE} per batch`,
        },
        { status: 400 },
      );
    }

    try {
      const meta = await fetchPlaylist(normalized, { start, end });
      const { playlist, jobs } = newPlaylistJobs(meta);
      return Response.json(
        { playlist, jobs: jobs.map(toPublicJob) },
        { status: 201 },
      );
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Failed to read playlist" },
        { status: 502 },
      );
    }
  }

  const job = newJob(normalized);
  return Response.json({ job: toPublicJob(job) }, { status: 201 });
}
