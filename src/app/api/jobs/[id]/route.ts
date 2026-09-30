import { cancelJob, getJob } from "@/lib/jobs";
import { toPublicJob } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json({ job: toPublicJob(job) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!cancelJob(id)) {
    return Response.json({ error: "Job cannot be canceled" }, { status: 404 });
  }
  const job = getJob(id);
  return Response.json({ job: job ? toPublicJob(job) : null });
}
