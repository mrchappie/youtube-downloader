import { retryJobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const record = (
    typeof body === "object" && body !== null ? body : {}
  ) as Record<string, unknown>;

  const kind =
    record.kind === "singles" || record.kind === "playlists"
      ? record.kind
      : "all";
  const playlistId =
    typeof record.playlistId === "string" ? record.playlistId : undefined;

  const retried = retryJobs({ kind, playlistId });
  return Response.json({ retried });
}
