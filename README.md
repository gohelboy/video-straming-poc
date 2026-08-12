# Video Streaming POC (Backend)

A learning project for **HLS video streaming** with Node.js, Express, and FFmpeg.

Upload a video → backend converts it into HLS chunks at **1080p**, **720p**, and **480p** → serve playlists and segments over HTTP.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) installed and available in your PATH

Check FFmpeg:

```bash
ffmpeg -version
```

## Setup

```bash
cd backend
npm install
```

## Run

```bash
npm start
```

Server runs at **http://localhost:8000**

## How it works

```
Upload video (POST /upload)
        ↓
FFmpeg creates 3 quality versions
        ↓
Each quality is split into ~5s .ts segments
        ↓
playlist.m3u8 indexes the segments
        ↓
Player fetches playlist + segments (GET /hls/...)
```

### Output folder structure

```
backend/uploads/lessons/{lessonId}/
  1080p/
    playlist.m3u8
    segment_000.ts
    segment_001.ts
  720p/
    playlist.m3u8
    segment_000.ts
  480p/
    playlist.m3u8
    segment_000.ts
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/upload` | Upload and process a video |
| `GET` | `/videos` | List all processed videos |
| `GET` | `/hls/:lessonId/:quality/:file` | Serve playlist or segment |

### Upload a video

Using curl:

```bash
curl -X POST http://localhost:8000/upload -F "file=@your-video.mp4"
```

Example response:

```json
{
  "message": "Video chunked successfully at 1080p, 720p, and 480p",
  "lessonId": "abc-123",
  "qualities": ["1080p", "720p", "480p"],
  "playlistUrl": "/hls/abc-123/1080p/playlist.m3u8"
}
```

### List videos

```bash
curl http://localhost:8000/videos
```

### Stream a playlist

```bash
curl http://localhost:8000/hls/{lessonId}/1080p/playlist.m3u8
```

## Project structure

```
backend/
  index.js              # Express server + API routes
  middleware/multer.js  # File upload handling
  utils/chunkVideo.js   # FFmpeg HLS chunking logic
  uploads/              # Processed videos (gitignored)
```

## Notes

- `uploads/` is not pushed to Git (video files are large and local-only)
- CORS is enabled for `http://localhost:3000` (for a separate frontend player)
- Each quality uses `-force_key_frames` so segments are cut at ~5 second intervals

## Tech stack

- **Express** — HTTP server
- **Multer** — file uploads
- **FFmpeg** — video transcoding + HLS segmentation
- **HLS** — HTTP Live Streaming (`.m3u8` + `.ts` chunks)
