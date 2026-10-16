"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { media } from "@/content/home";

// How long after the page has loaded the background video begins.
const VIDEO_START_DELAY_MS = 2500;

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

// Background video behind the hero. The poster shows first, and stays when the
// visitor prefers reduced motion or is on a slow / data-saving connection; in
// those cases the video does not load or play until they press Play.
export function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [playing, setPlaying] = useState(false);

  // The video is added only after the page has loaded, so it never competes
  // with the poster image and text for the first paint (LCP).
  useEffect(() => {
    const start = () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      const slow =
        !!conn?.saveData || ["slow-2g", "2g", "3g"].includes(conn?.effectiveType ?? "");
      setAutoplay(!reduced && !slow);
      setMounted(true);
    };
    // Decorative video: start a little after load so the page is interactive first.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const afterLoad = () => {
      timer = setTimeout(start, VIDEO_START_DELAY_MS);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", afterLoad);
    };
  }, []);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }

  return (
    <>
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <Image
          src={media.hero.poster}
          alt={media.hero.posterAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {mounted && media.hero.video && (
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              playing ? "opacity-100" : "opacity-0"
            }`}
            muted
            loop
            playsInline
            autoPlay={autoplay}
            preload={autoplay ? "metadata" : "none"}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={media.hero.video} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-navy/85 to-purple/80 dark:from-dark-bg/90 dark:to-purple-panel/85" />
      </div>

      {mounted && media.hero.video && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? media.hero.pauseLabel : media.hero.playLabel}
          className="absolute bottom-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:bottom-6 sm:right-6"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            {playing ? (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            ) : (
              <path d="M8 5.5v13l11-6.5z" />
            )}
          </svg>
        </button>
      )}
    </>
  );
}
