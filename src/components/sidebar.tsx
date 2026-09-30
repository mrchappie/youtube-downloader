"use client";

import { useCallback, useEffect, useState } from "react";
import type { CleanupScope, StorageStats } from "@/lib/jobs";
import { formatAge, formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

interface Action {
  scope: CleanupScope;
  labelKey: string;
  count: (s: StorageStats) => number;
  danger?: boolean;
}

const ACTIONS: Action[] = [
  { scope: "failed", labelKey: "action.failed", count: (s) => s.failed },
  { scope: "canceled", labelKey: "action.canceled", count: (s) => s.canceled },
  { scope: "completed", labelKey: "action.completed", count: (s) => s.completed },
  { scope: "old", labelKey: "action.old", count: (s) => s.old },
  { scope: "all", labelKey: "action.all", count: (s) => s.totalJobs, danger: true },
];

export default function Sidebar() {
  const { t } = useI18n();
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
          ? t("cleanup.nothing")
          : t(data.removed === 1 ? "cleanup.freed.one" : "cleanup.freed.other", {
              size: formatBytes(data.freedBytes),
              count: data.removed,
            }),
      );
      await loadStats();
    } catch {
      setMessage(t("cleanup.failed"));
    } finally {
      setBusy(null);
    }
  }

  const oldAge = stats ? formatAge(stats.oldAgeMs) : "1h";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-border bg-card p-5 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
      <div>
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-2">
          {t("sidebar.storage")}
        </p>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-2xl font-semibold text-foreground">
            {stats ? formatBytes(stats.bytesOnDisk) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-2">
            {stats
              ? `${stats.totalJobs} ${t(
                  stats.totalJobs === 1 ? "sidebar.job.one" : "sidebar.job.other",
                )} · ${stats.active} ${t("sidebar.active")}`
              : t("sidebar.onDisk")}
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
                  ? "border-red-500/30 bg-red-500/5 text-red-600 hover:bg-red-500/10 dark:text-red-300"
                  : "border-border bg-card text-foreground hover:bg-hover"
              }`}
            >
              <span className="font-medium">
                {t(action.labelKey)}
                {action.scope === "old" && (
                  <span className="ml-1 text-xs font-normal text-muted-2">
                    &gt; {oldAge}
                  </span>
                )}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  action.danger ? "bg-red-500/15" : "bg-hover"
                }`}
              >
                {busy === action.scope ? "…" : count}
              </span>
            </button>
          );
        })}
      </nav>

      {message && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted">
          {message}
        </p>
      )}

      <p className="mt-auto text-[11px] leading-relaxed text-muted-2">
        {t("sidebar.footer")}
      </p>
    </aside>
  );
}
