import { exec } from "child_process";
import fs from "fs";
import path from "path";

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stderr);
    });
  });
}

const QUALITIES = [
  { name: "1080p", height: 1080, audioBitrate: "192k" },
  { name: "720p", height: 720, audioBitrate: "128k" },
  { name: "480p", height: 480, audioBitrate: "96k" },
];

async function encodeQuality(inputPath, lessonDir, quality) {
  const qualityDir = path.join(lessonDir, quality.name);
  const playlistPath = path.join(qualityDir, "playlist.m3u8");
  const segmentPattern = path.join(qualityDir, "segment_%03d.ts");

  fs.mkdirSync(qualityDir, { recursive: true });

  const command = [
    `ffmpeg -y -i "${inputPath}"`,
    `-vf scale=-2:${quality.height}`,
    "-c:v libx264 -crf 23 -preset medium",
    `-c:a aac -b:a ${quality.audioBitrate}`,
    '-force_key_frames "expr:gte(t,n_forced*5)"',
    "-hls_time 5",
    "-hls_list_size 0",
    `-hls_segment_filename "${segmentPattern}"`,
    `"${playlistPath}"`,
  ].join(" ");

  await runCommand(command);
}

export async function chunkVideo(inputPath, lessonDir) {
  for (const quality of QUALITIES) {
    await encodeQuality(inputPath, lessonDir, quality);
  }

  return QUALITIES.map((q) => q.name);
}

export { QUALITIES };
