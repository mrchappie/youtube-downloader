"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CleanupScope, StorageStats } from "@/lib/jobs";
import { formatAge, formatBytes } from "@/lib/format";
import { LOCALES, useI18n } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

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

const NAV = [
  { href: "/", labelKey: "nav.single" },
  { href: "/playlist", labelKey: "nav.playlist" },
];

const THEMES: { value: Theme; labelKey: string }[] = [
  { value: "system", labelKey: "theme.system" },
  { value: "light", labelKey: "theme.light" },
  { value: "dark", labelKey: "theme.dark" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
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
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-border bg-card p-5 md:sticky md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r">
      <Link href="/" className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          YouTube Downloader
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-hover text-foreground"
                  : "text-muted hover:bg-hover hover:text-foreground"
              }`}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-2">
            {t("lang.label")}
          </span>
          <div className="flex rounded-lg border border-border p-0.5">
            {LOCALES.map((item) => (
              <button
                key={item.value}
                onClick={() => setLocale(item.value)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  locale === item.value
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-2">
            {t("theme.label")}
          </span>
          <div className="flex rounded-lg border border-border p-0.5">
            {THEMES.map((item) => (
              <button
                key={item.value}
                onClick={() => setTheme(item.value)}
                className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                  theme === item.value
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

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
