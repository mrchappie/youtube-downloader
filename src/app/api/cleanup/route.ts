import { cleanup, storageStats, type CleanupScope } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES: readonly CleanupScope[] = [
  "failed",
  "canceled",
  "completed",
  "old",
  "all",
];

function isScope(value: unknown): value is CleanupScope {
  return typeof value === "string" && (SCOPES as readonly string[]).includes(value);
}

export async function GET() {
  return Response.json(await storageStats());
}

export async function POST(request: Request) {
  let scope: CleanupScope = "all";
  try {
    const body: unknown = await request.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "scope" in body &&
      isScope((body as { scope: unknown }).scope)
    ) {
      scope = (body as { scope: CleanupScope }).scope;
    }
  } catch {
    /* no body: default to clearing everything */
  }

  const result = await cleanup(scope);
  return Response.json(result);
}
