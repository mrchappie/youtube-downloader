"use client";

import { useEffect, useState } from "react";
import { AUDIO_QUALITIES, type AudioQuality } from "@/lib/audio-options";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

interface Deps {
  ytdlp: string | null;
  ffmpeg: string | null;
}

interface UpdateInfo {
  current: string | null;
  latest: string | null;
  updateAvailable: boolean;
  url: string;
  error?: string;
}

const QUALITY_LABELS: Record<AudioQuality, string | null> = {
  v0: null,
  "320": "320 kbps",
  "256": "256 kbps",
  "192": "192 kbps",
  "128": "128 kbps",
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-hover"
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-track"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function DepRow({ label, value }: { label: string; value: string | null }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <span className="font-mono text-xs text-muted-2">
        {value ?? t("settings.deps.unknown")}
      </span>
    </div>
  );
}

export default function SettingsPanel() {
  const { t } = useI18n();
  const { options, update, reset } = useSettings();
  const [deps, setDeps] = useState<Deps | null>(null);
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/ytdlp", { cache: "no-store" });
        if (res.ok && active) setDeps((await res.json()) as Deps);
      } catch {
        /* leave versions as unknown */
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function checkForUpdates() {
    setChecking(true);
    try {
      const res = await fetch("/api/ytdlp/check", { cache: "no-store" });
      const data = (await res.json()) as UpdateInfo;
      setInfo(data);
    } catch {
      setInfo({
        current: deps?.ytdlp ?? null,
        latest: null,
        updateAvailable: false,
        url: "https://github.com/yt-dlp/yt-dlp/releases",
        error: "failed",
      });
    } finally {
      setChecking(false);
    }
  }

  let checkMessage: string | null = null;
  if (info) {
    if (info.updateAvailable) {
      checkMessage = t("settings.check.available", {
        latest: info.latest ?? "",
        current: info.current ?? "",
      });
    } else if (info.latest && info.current === info.latest) {
      checkMessage = t("settings.check.latest", { version: info.current ?? "" });
    } else {
      checkMessage = t("settings.check.failed");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("settings.title")}
        </h1>
        <p className="mt-3 text-base text-muted">{t("settings.subtitle")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted">
          {t("settings.audio.heading")}
        </h2>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-2">
            {t("settings.quality.label")}
          </p>
          <div className="flex flex-wrap gap-2">
            {AUDIO_QUALITIES.map((quality) => {
              const selected = options.quality === quality;
              return (
                <button
                  key={quality}
                  onClick={() => update({ quality })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-border bg-card text-muted hover:bg-hover hover:text-foreground"
                  }`}
                >
                  {quality === "v0"
                    ? t("settings.quality.v0")
                    : QUALITY_LABELS[quality]}
                </button>
              );
            })}
          </div>
        </div>

        <Toggle
          checked={options.addMetadata}
          onChange={(value) => update({ addMetadata: value })}
          label={t("settings.metadata.label")}
        />
        <Toggle
          checked={options.embedThumbnail}
          onChange={(value) => update({ embedThumbnail: value })}
          label={t("settings.thumbnail.label")}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-2">{t("settings.hint")}</p>
          <button
            onClick={reset}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-hover hover:text-foreground"
          >
            {t("settings.reset")}
          </button>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-sm font-medium text-muted">
          {t("settings.deps.heading")}
        </h2>

        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <DepRow label={t("settings.deps.ytdlp")} value={deps?.ytdlp ?? null} />
          <DepRow label={t("settings.deps.ffmpeg")} value={deps?.ffmpeg ?? null} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={checkForUpdates}
            disabled={checking}
            className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
          >
            {checking ? t("settings.check.checking") : t("settings.check.button")}
          </button>
          {info && (
            <a
              href={info.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-muted underline transition hover:text-foreground"
            >
              {t("settings.check.link")}
            </a>
          )}
        </div>

        {checkMessage && <p className="text-xs text-muted">{checkMessage}</p>}
        <p className="text-xs text-muted-2">{t("settings.check.hint")}</p>
      </section>
    </div>
  );
}
