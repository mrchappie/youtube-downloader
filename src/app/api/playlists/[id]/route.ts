import { cancelPlaylist } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const canceled = cancelPlaylist(id);
  return Response.json({ canceled });
}
