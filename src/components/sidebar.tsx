"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CleanupScope, StorageStats } from "@/lib/jobs";
import { formatAge, formatBytes } from "@/lib/format";

interface Action {
  scope: CleanupScope;
  label: string;
  count: (s: StorageStats) => number;
  danger?: boolean;
}

const ACTIONS: Action[] = [
  { scope: "failed", label: "Clear failed", count: (s) => s.failed },
  { scope: "canceled", label: "Clear canceled", count: (s) => s.canceled },
  { scope: "completed", label: "Clear finished", count: (s) => s.completed },
  { scope: "old", label: "Clear old", count: (s) => s.old },
  { scope: "all", label: "Clear everything", count: (s) => s.totalJobs, danger: true },
];

const NAV = [
  { href: "/", label: "Single video" },
  { href: "/playlist", label: "Playlist" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [busy, setBusy] = useState<CleanupScope | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/cleanup", { cache: "no-store" });
      if (res.ok) setStats((await res.json()) as StorageStats);
    } catch {
      /* keep last known stats */
    }
  }, []);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      if (active) await loadStats();
    };
    void tick();
    const id = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [loadStats]);

  async function runCleanup(scope: CleanupScope) {
    setBusy(scope);
    setMessage(null);
    try {
      const res = await fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = (await res.json()) as { removed: number; freedBytes: number };
      setMessage(
        data.removed === 0
          ? "Nothing to clear."
          : `Freed ${formatBytes(data.freedBytes)} across ${data.removed} item${
              data.removed === 1 ? "" : "s"
            }.`,
      );
      await loadStats();
    } catch {
      setMessage("Cleanup failed.");
    } finally {
      setBusy(null);
    }
  }

  const oldAge = stats ? formatAge(stats.oldAgeMs) : "1h";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-white/10 bg-white/[0.02] p-5 md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r">
      <div>
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-sm font-semibold tracking-tight text-white">
            YouTube Downloader
          </span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
          Storage
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-2xl font-semibold text-white">
            {stats ? formatBytes(stats.bytesOnDisk) : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {stats
              ? `${stats.totalJobs} job${stats.totalJobs === 1 ? "" : "s"} · ${stats.active} active`
              : "on disk"}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {ACTIONS.map((action) => {
          const count = stats ? action.count(stats) : 0;
          const disabled = busy !== null || count === 0;
          return (
            <button
              key={action.scope}
              onClick={() => runCleanup(action.scope)}
              disabled={disabled}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                action.danger
                  ? "border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10"
                  : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.07]"
              }`}
            >
              <span className="font-medium">
                {action.label}
                {action.scope === "old" && (
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    &gt; {oldAge}
                  </span>
                )}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  action.danger ? "bg-red-500/15" : "bg-white/10"
                }`}
              >
                {busy === action.scope ? "…" : count}
              </span>
            </button>
          );
        })}
      </nav>

      {message && (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
          {message}
        </p>
      )}

      <p className="mt-auto text-[11px] leading-relaxed text-zinc-600">
        Failed and canceled downloads are removed automatically. Finished MP3s stay
        until you clear them.
      </p>
    </aside>
  );
}
