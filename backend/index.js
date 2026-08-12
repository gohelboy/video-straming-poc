import cors from "cors";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import upload from "./middleware/multer.js";
import { chunkVideo, QUALITIES } from "./utils/chunkVideo.js";

const app = express();
const LESSONS_DIR = path.join("uploads", "lessons");
const QUALITY_NAMES = QUALITIES.map((q) => q.name);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "Video streaming POC server is running" });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const lessonId = crypto.randomUUID();
  const lessonDir = path.join(LESSONS_DIR, lessonId);

  try {
    fs.mkdirSync(lessonDir, { recursive: true });

    const qualities = await chunkVideo(req.file.path, lessonDir);

    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      message: "Video chunked successfully at 1080p, 720p, and 480p",
      lessonId,
      qualities,
      playlistUrl: `/hls/${lessonId}/1080p/playlist.m3u8`,
    });
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    console.error(error.message);

    return res.status(500).json({
      message: "Video chunking failed",
      error: error.message,
    });
  }
});

app.get("/hls/:lessonId/:quality/:file", (req, res) => {
  const { lessonId, quality, file } = req.params;
  const filePath = path.join(LESSONS_DIR, lessonId, quality, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  const ext = path.extname(file);
  const contentTypes = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/MP2T",
  };

  res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");

  fs.createReadStream(filePath).pipe(res);
});

app.get("/videos", (req, res) => {
  if (!fs.existsSync(LESSONS_DIR)) {
    return res.json({ videos: [] });
  }

  const videos = fs
    .readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const qualities = QUALITY_NAMES.filter((name) =>
        fs.existsSync(
          path.join(LESSONS_DIR, entry.name, name, "playlist.m3u8"),
        ),
      );

      if (qualities.length === 0) return null;

      return {
        lessonId: entry.name,
        qualities,
      };
    })
    .filter(Boolean);

  res.json({ videos });
});

app.listen(8000, () => {
  console.log("Server is running on http://localhost:8000");
});
