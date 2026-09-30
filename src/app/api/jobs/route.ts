import { newJob, listJobs } from "@/lib/jobs";
import { normalizeYouTubeUrl } from "@/lib/ytdlp";
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

  const job = newJob(normalized);
  return Response.json({ job: toPublicJob(job) }, { status: 201 });
}
