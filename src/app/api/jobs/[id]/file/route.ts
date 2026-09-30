import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeName(title: string | null): string {
  const base = (title ?? "audio").replace(/[\\/:*?"<>|\r\n]+/g, "_").trim();
  return `${base || "audio"}.mp3`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "completed" || !job.filePath) {
    return Response.json({ error: "File not ready" }, { status: 409 });
  }

  let size: number;
  try {
    size = (await stat(job.filePath)).size;
  } catch {
    return Response.json({ error: "File no longer available" }, { status: 410 });
  }

  const stream = Readable.toWeb(
    createReadStream(job.filePath),
  ) as unknown as ReadableStream;

  const name = safeName(job.title);
  return new Response(stream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="audio.mp3"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
