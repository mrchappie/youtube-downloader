# YouTube Downloader

A Next.js web app that downloads YouTube videos as MP3 files, with live progress.

Paste a YouTube URL, watch the progress bar, then download the finished MP3.

## Features

- Single YouTube URL → MP3 (audio extraction + transcoding)
- Live progress bar (percent, downloaded/total, speed)
- Job list with status, thumbnail, title, uploader, duration
- Cancel in-flight downloads
- Download all finished MP3s at once as a ZIP
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

1. `POST /api/jobs` validates the URL and creates an in-memory job, then spawns yt-dlp.
2. yt-dlp prints machine-readable progress lines; the server parses them into job state.
3. The UI polls `GET /api/jobs` (every 1s) and renders progress.
4. When done, `GET /api/jobs/:id/file` streams the MP3.

Downloaded files are written to the OS temp directory (`<tmp>/ytdl-web/<jobId>/`), not the repo.

## API

| Method   | Route                   | Description                          |
| -------- | ----------------------- | ------------------------------------ |
| `GET`    | `/api/jobs`             | List jobs                            |
| `POST`   | `/api/jobs`             | Create a job `{ "url": "..." }`      |
| `GET`    | `/api/jobs/:id`         | Get one job                          |
| `DELETE` | `/api/jobs/:id`         | Cancel a job                         |
| `GET`    | `/api/jobs/:id/file`    | Download the finished MP3           |
| `GET`    | `/api/download-all`     | Download all finished MP3s as a ZIP  |
| `GET`    | `/api/cleanup`          | Storage stats (counts + bytes on disk) |
| `POST`   | `/api/cleanup`          | Clear files `{ "scope": "failed" \| "completed" \| "old" \| "all" }` |

## Storage management

The sidebar shows live disk usage and buttons to clear files:

- **Clear failed** — errored/canceled jobs
- **Clear finished** — completed MP3s
- **Clear old** — jobs older than 1 hour
- **Clear everything** — all non-active jobs

Active downloads are never cleared. Failed and canceled downloads have their partial
files removed automatically, so only fully downloadable MP3s occupy disk.


## Roadmap

- [ ] Format/quality selection (bitrate, video)
- [ ] Playlist support
- [ ] Persist jobs (SQLite) instead of in-memory
- [ ] SSE/WebSocket progress instead of polling
- [ ] Concurrency limit / queue
