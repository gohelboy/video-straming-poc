import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const API = "http://localhost:8000";
const QUALITY_OPTIONS = ["1080p", "720p", "480p"];

function getPlaylistUrl(video, quality) {
  return `/hls/${video.lessonId}/${quality}/playlist.m3u8`;
}

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [quality, setQuality] = useState("1080p");
  const [message, setMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/videos`)
      .then((res) => res.json())
      .then((data) => setVideos(data.videos));
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setMessage("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [selectedVideo]);

  function destroyHls() {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }

  function loadStream(fullUrl, resumeAt = 0, autoPlay = false) {
    const video = videoRef.current;
    if (!video) return;

    destroyHls();

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(fullUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (resumeAt > 0) {
          video.currentTime = resumeAt;
        }
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });
    } else {
      video.src = fullUrl;
      video.onloadedmetadata = () => {
        if (resumeAt > 0) {
          video.currentTime = resumeAt;
        }
        if (autoPlay) {
          video.play().catch(console.error);
        }
      };
    }
  }

  function handlePlay() {
    if (!selectedVideo) return;

    const fullUrl = `${API}${getPlaylistUrl(selectedVideo, quality)}`;
    setIsPlaying(true);
    setMessage(`Loading ${quality}...`);
    loadStream(fullUrl, 0, true);
  }

  function handleSelectVideo(video) {
    setSelectedVideo(video);
    setQuality(video.qualities.includes("1080p") ? "1080p" : video.qualities[0]);
    setMessage("Video selected. Pick quality and click Play.");
  }

  function handleQualityChange(newQuality) {
    if (!selectedVideo || newQuality === quality) return;

    const video = videoRef.current;
    const resumeAt = video?.currentTime || 0;
    const wasPlaying = isPlaying;

    setQuality(newQuality);

    if (wasPlaying) {
      const fullUrl = `${API}${getPlaylistUrl(selectedVideo, newQuality)}`;
      setMessage(`Switching to ${newQuality}...`);
      loadStream(fullUrl, resumeAt, true);
      setMessage(`Playing in ${newQuality}`);
    } else {
      setMessage(`Quality set to ${newQuality}. Click Play.`);
    }
  }

  return (
    <div className="page">
      <h1>Video Streaming (Learning POC)</h1>
      <p className="subtitle">
        Upload via backend → pick video → change quality while playing
      </p>

      <section className="box">
        <h2>Step 1 — Pick a video</h2>
        {videos.length === 0 ? (
          <p>No videos found. Upload one to the backend first.</p>
        ) : (
          <div className="video-buttons">
            {videos.map((video, index) => (
              <button
                key={video.lessonId}
                type="button"
                className={
                  selectedVideo?.lessonId === video.lessonId ? "selected" : ""
                }
                onClick={() => handleSelectVideo(video)}
              >
                Video {index + 1}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="box">
        <h2>Step 2 — Pick quality</h2>
        {!selectedVideo ? (
          <p className="hint">Select a video first.</p>
        ) : (
          <div className="video-buttons">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={!selectedVideo.qualities.includes(option)}
                className={quality === option ? "selected" : ""}
                onClick={() => handleQualityChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="box">
        <h2>Step 3 — Play</h2>

        {!selectedVideo ? (
          <p className="hint">Select a video first.</p>
        ) : (
          <div className="player">
            <video ref={videoRef} controls={isPlaying} preload="none" />

            {!isPlaying && (
              <button type="button" className="play-btn" onClick={handlePlay}>
                ▶ Play
              </button>
            )}
          </div>
        )}

        {message && <p className="status">{message}</p>}
      </section>
    </div>
  );
}

export default App;
