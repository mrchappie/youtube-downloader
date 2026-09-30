import { retryJob } from "@/lib/jobs";
import { toPublicJob } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = retryJob(id);
  if (!job) {
    return Response.json({ error: "Job cannot be retried" }, { status: 404 });
  }
  return Response.json({ job: toPublicJob(job) });
}
