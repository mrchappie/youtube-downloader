import { checkYtdlpLatest } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await checkYtdlpLatest());
}
