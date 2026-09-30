import { newJob, newPlaylistJobs, listJobs } from "@/lib/jobs";
import {
  fetchPlaylist,
  isPlaylistUrl,
  normalizeYouTubeUrl,
} from "@/lib/ytdlp";
import { toPublicJob } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const url =
    typeof body === "object" && body !== null && "url" in body
      ? String((body as { url: unknown }).url ?? "")
      : "";

  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) {
    return Response.json(
      { error: "Please provide a valid YouTube video URL" },
      { status: 400 },
    );
  }

  if (isPlaylistUrl(normalized)) {
    try {
      const meta = await fetchPlaylist(normalized);
      const { playlist, jobs } = newPlaylistJobs(meta);
      return Response.json(
        { playlist, jobs: jobs.map(toPublicJob) },
        { status: 201 },
      );
    } catch (err) {
      return Response.json(
        {
          error:
            err instanceof Error ? err.message : "Failed to read playlist",
        },
        { status: 502 },
      );
    }
  }

  const job = newJob(normalized);
  return Response.json({ job: toPublicJob(job) }, { status: 201 });
}
