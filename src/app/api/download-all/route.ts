import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { listCompletedFiles, type CompletedFile } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeBase(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|\r\n]+/g, "_").trim();
  return cleaned || "audio";
}

function uniqueName(title: string, used: Set<string>): string {
  const base = safeBase(title);
  let name = `${base}.mp3`;
  let n = 1;
  while (used.has(name.toLowerCase())) {
    name = `${base} (${n++}).mp3`;
  }
  used.add(name.toLowerCase());
  return name;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get("playlist") ?? undefined;
  const kindParam = searchParams.get("kind");
  const kind =
    kindParam === "singles" || kindParam === "playlists" ? kindParam : "all";

  const candidates = listCompletedFiles(
    playlistId ? { playlistId } : { kind },
  );

  const existing: CompletedFile[] = [];
  for (const file of candidates) {
    try {
      await stat(file.filePath);
      existing.push(file);
    } catch {
      /* file was cleared; skip it */
    }
  }

  if (existing.length === 0) {
    return Response.json(
      { error: "No completed downloads to archive" },
      { status: 409 },
    );
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", () => {
    /* surfaced through the response stream; nothing else to do */
  });

  const used = new Set<string>();
  for (const file of existing) {
    archive.append(createReadStream(file.filePath), {
      name: uniqueName(file.title, used),
    });
  }

  void archive.finalize();

  const stream = Readable.toWeb(archive) as unknown as ReadableStream;

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="youtube-downloads-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
