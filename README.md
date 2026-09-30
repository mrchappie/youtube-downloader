# YouTube Downloader

A Next.js web app that downloads YouTube videos as MP3 files, with live progress.

Two pages: **Single video** (default) and **Playlist**. Paste a URL, watch the
progress bars, then download the finished MP3s.

## Features

- Single YouTube URL → MP3 (audio extraction + transcoding)
- Separate Playlist page; each video becomes its own job, grouped in the UI
- Playlist batches: download a `From`–`To` range (default 1–100), then click
  **Download next** for the following batch
- Range safety: warns above 200 items and hard-caps a batch at 500
- Queue with a concurrency cap (3 downloads at once, rest wait their turn)
- Live progress bar (percent, downloaded/total, speed)
- Retry failed downloads individually, or all at once per page
- Cancel a single download or an entire playlist
- Per-playlist or singles-only ZIP download
- Audio options on a Settings page: MP3 quality (V0 / 320 / 256 / 192 / 128 kbps),
  ID3 metadata, and embedded thumbnail
- Settings page shows the bundled yt-dlp and ffmpeg versions, with a manual
  update check (updates are never applied automatically)
- English and Romanian UI, switchable from the top bar (saved in the browser)
- Light / dark theme following your system by default, with a manual override
- Storage sidebar to clear failed/canceled/finished/old files
- Input validation (YouTube URLs only)

## Stack

- **Next.js 16** (App Router) — UI and API in one app
- **TypeScript** + **Tailwind CSS v4**
- **yt-dlp** for extracting media, bundled via [`youtube-dl-exec`](https://www.npmjs.com/package/youtube-dl-exec)
- **ffmpeg** for MP3 conversion, bundled via [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static)

No system-level `yt-dlp`/`ffmpeg` install is required — both binaries come from npm.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build && npm start   # production
npm run lint                 # eslint
```

## How it works

1. `POST /api/jobs` takes a `mode` (`single` or `playlist`), an optional
   `start`/`end` range, and `options` (audio quality, metadata, thumbnail).
   Playlist URLs are enumerated with `yt-dlp --flat-playlist` and one queued
   job is created per video in the range.
2. A scheduler runs at most 3 jobs at once; the rest stay `queued`.
3. yt-dlp prints machine-readable progress lines; the server parses them into job state.
4. The UI polls `GET /api/jobs` (every 1s), grouping playlist items.
5. When done, `GET /api/jobs/:id/file` streams the MP3.

Audio options are stored in the browser and sent with each request; the server
stores them on the job, so retries reproduce the same output.

Downloaded files are written to the OS temp directory (`<tmp>/ytdl-web/<jobId>/`), not the repo.

## API

| Method   | Route                   | Description                          |
| -------- | ----------------------- | ------------------------------------ |
| `GET`    | `/api/jobs`             | List jobs                            |
| `POST`   | `/api/jobs`             | Create job(s): `{ url, mode?, start?, end?, options? }` |
| `GET`    | `/api/jobs/:id`         | Get one job                          |
| `DELETE` | `/api/jobs/:id`         | Cancel a job                         |
| `POST`   | `/api/jobs/:id/retry`   | Retry a failed/canceled job          |
| `GET`    | `/api/jobs/:id/file`    | Download the finished MP3           |
| `DELETE` | `/api/playlists/:id`    | Cancel every active job in a playlist |
| `GET`    | `/api/download-all`     | ZIP of finished MP3s (`?kind=singles\|playlists` or `?playlist=<id>`) |
| `GET`    | `/api/ytdlp`            | Bundled yt-dlp and ffmpeg versions   |
| `GET`    | `/api/ytdlp/check`      | Compare yt-dlp with the latest release (read-only) |
| `GET`    | `/api/cleanup`          | Storage stats (counts + bytes on disk) |
| `POST`   | `/api/cleanup`          | Clear files `{ "scope": "failed" \| "canceled" \| "completed" \| "old" \| "all" }` |

## Storage management

The sidebar shows live disk usage and buttons to clear files:

- **Clear failed** — errored jobs
- **Clear canceled** — canceled jobs
- **Clear finished** — completed MP3s
- **Clear old** — jobs older than 1 hour
- **Clear everything** — all non-active jobs

Active downloads are never cleared. Failed and canceled downloads have their partial
files removed automatically, so only fully downloadable MP3s occupy disk.


## Roadmap

- [ ] Video (MP4) support
- [ ] Playlist preview with item selection
- [ ] Persist jobs (SQLite) instead of in-memory
- [ ] SSE/WebSocket progress instead of polling
