"use client";

import { useEffect, useRef, useState } from "react";
import { media } from "@/content/home";

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

// Silent tour video with minimal controls: play/pause and full screen only.
// Fills its parent: the parent decides the height (aspect ratio on mobile,
// matched to the photo grid on desktop).
export function TourVideo({ poster }: { poster: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  // Nothing video-related loads until the block is close to the screen.
  const [near, setNear] = useState(false);

  useEffect(() => {
    setCanFullscreen(
      !!document.fullscreenEnabled ||
        !!(document.createElement("video") as FullscreenVideo).webkitEnterFullscreen,
    );
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function fullscreen() {
    const frame = frameRef.current;
    const v = videoRef.current as FullscreenVideo | null;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (frame?.requestFullscreen) {
      frame.requestFullscreen().catch(() => {});
    } else {
      v?.webkitEnterFullscreen?.(); // iOS Safari
    }
  }

  const btn =
    "grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70";

  return (
    <div ref={frameRef} className="relative h-full w-full bg-black/30">
      {near && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full cursor-pointer object-cover"
          muted
          playsInline
          preload="none"
          poster={poster}
          aria-label={media.techSpace.videoLabel}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        >
          <source src={media.techSpace.video} type="video/mp4" />
        </video>
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? media.techSpace.pauseLabel : media.techSpace.playLabel}
          className={btn}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            {playing ? (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            ) : (
              <path d="M8 5.5v13l11-6.5z" />
            )}
          </svg>
        </button>
        {canFullscreen && (
          <button
            type="button"
            onClick={fullscreen}
            aria-label={media.techSpace.fullscreenLabel}
            className={btn}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
