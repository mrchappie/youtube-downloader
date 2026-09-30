import { getFfmpegVersion, getYtdlpVersion } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [ytdlp, ffmpeg] = await Promise.all([
    getYtdlpVersion(),
    getFfmpegVersion(),
  ]);
  return Response.json({ ytdlp, ffmpeg });
}
