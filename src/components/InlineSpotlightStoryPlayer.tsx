"use client";

import React, { useEffect, useState, useRef } from "react";
import { SpotlightStory } from "@/lib/spotlights";
import { RocketIcon, UserIcon, SparklesIcon, MapPinIcon } from "./Icons";

interface InlineSpotlightStoryPlayerProps {
  spotlights: SpotlightStory[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function InlineSpotlightStoryPlayer({
  spotlights,
  currentIndex,
  onClose,
  onNavigate,
}: InlineSpotlightStoryPlayerProps) {
  const story = spotlights[currentIndex];
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setProgress(0);
    const duration = story?.media_type === "video" ? 25000 : 8000;
    const intervalTime = 100;
    const increment = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          if (currentIndex < spotlights.length - 1) {
            onNavigate(currentIndex + 1);
          } else {
            onClose();
          }
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, spotlights.length, story?.media_type]);

  if (!story) return null;

  return (
    <div className="inline-story-player-container">
      {/* TIMER PROGRESS BAR AT TOP */}
      <div className="inline-story-progress-wrapper">
        {spotlights.map((s, idx) => (
          <div key={s.id} className="inline-story-progress-track">
            <div
              className="inline-story-progress-fill"
              style={{
                width:
                  idx < currentIndex
                    ? "100%"
                    : idx === currentIndex
                    ? `${progress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div className="inline-story-header">
        <div className="inline-story-author">
          {story.logo_url ? (
            <img src={story.logo_url} alt={story.name} className="inline-story-avatar" />
          ) : (
            <div className="inline-story-initials" style={{ background: story.color }}>
              {story.initials}
            </div>
          )}
          <div>
            <h3>{story.name}</h3>
            <span className="inline-story-location" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <MapPinIcon size={12} /> {story.city}, India
            </span>
          </div>
        </div>
        <button type="button" className="inline-story-close-btn" onClick={onClose} title="Close Story">
          ✕
        </button>
      </div>

      {/* MEDIA AD DISPLAY (IMAGE OR VIDEO < 1 MIN) */}
      <div className="inline-story-media-box">
        {story.media_type === "video" && story.media_url ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            loop
            muted
            playsInline
            className="inline-story-media"
          />
        ) : story.media_url ? (
          <img src={story.media_url} alt={story.name} className="inline-story-media" />
        ) : (
          <div className="inline-story-fallback-media" style={{ background: story.color + "22" }}>
            <span className="inline-story-fallback-initials" style={{ background: story.color }}>
              {story.initials}
            </span>
          </div>
        )}

        {/* BOTTOM OVERLAY INFO */}
        <div className="inline-story-overlay-content">
          <div className="inline-story-badge">
            {story.type === "startup" ? <RocketIcon size={12} /> : <UserIcon size={12} />}
            <span>24H SPOTLIGHT AD</span>
          </div>

          <p className="inline-story-pitch-text">&ldquo;{story.tagline}&rdquo;</p>

          {story.website_url && (
            <a
              href={
                story.website_url.startsWith("http")
                  ? story.website_url
                  : `https://${story.website_url}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-story-cta-btn"
            >
              Visit Website <SparklesIcon size={14} />
            </a>
          )}
        </div>

        {/* TAP NAVIGATION CONTROLS */}
        <div
          className="inline-story-tap-left"
          onClick={() => currentIndex > 0 && onNavigate(currentIndex - 1)}
        />
        <div
          className="inline-story-tap-right"
          onClick={() =>
            currentIndex < spotlights.length - 1 ? onNavigate(currentIndex + 1) : onClose()
          }
        />
      </div>
    </div>
  );
}
