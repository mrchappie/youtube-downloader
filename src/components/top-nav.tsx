"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, useI18n } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

const NAV = [
  { href: "/", labelKey: "nav.single" },
  { href: "/playlist", labelKey: "nav.playlist" },
  { href: "/settings", labelKey: "nav.settings" },
];

const THEMES: Theme[] = ["system", "light", "dark"];

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#dc2626" />
      <path d="M32 13v24" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M22 29l10 10 10-10"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 49h26" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function ThemeIcon({ name }: { name: Theme }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4",
  };
  if (name === "system") {
    return (
      <svg {...common}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (name === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            YouTube Downloader
          </span>
        </Link>

        <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            {THEMES.map((value) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-label={t(`theme.${value}`)}
                title={t(`theme.${value}`)}
                className={`rounded-md p-1.5 transition ${
                  theme === value
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <ThemeIcon name={value} />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            {LOCALES.map((item) => (
              <button
                key={item.value}
                onClick={() => setLocale(item.value)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
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
      </div>
    </header>
  );
}
