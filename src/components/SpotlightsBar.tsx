"use client";

import React, { useState, useEffect } from "react";
import {
  SpotlightStory,
  calculateSpotlightExpiry,
  isSpotlightActive,
} from "@/lib/spotlights";
import { Listing } from "@/lib/db";
import { PlusIcon, CheckIcon } from "./Icons";

interface SpotlightsBarProps {
  userId: string;
  isSignedIn: boolean;
  onRequireAuth: () => void;
  onSelectSpotlight: (spotlights: SpotlightStory[], index: number) => void;
}

export function SpotlightsBar({
  userId,
  isSignedIn,
  onRequireAuth,
  onSelectSpotlight,
}: SpotlightsBarProps) {
  const [spotlights, setSpotlights] = useState<SpotlightStory[]>([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form state for booking
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customTagline, setCustomTagline] = useState("");
  const [customCity, setCustomCity] = useState("Bengaluru");
  const [customWebsite, setCustomWebsite] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [isUploading, setIsUploading] = useState(false);

  const loadSpotlights = async () => {
    try {
      const res = await fetch('/api/spotlights');
      if (res.ok) {
        const data = await res.json();
        const spotlightList: SpotlightStory[] = Array.isArray(data) ? data : (data.spotlights || []);
        const active = spotlightList.filter(isSpotlightActive).slice(0, 8);
        setSpotlights(active);
      }
    } catch (err) {
      console.error("Failed to load spotlights:", err);
    }
  };

  useEffect(() => {
    loadSpotlights();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadSpotlights();
      }
    }, 60000);

    const handleFocus = () => {
      loadSpotlights();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
      }
    };
  }, []);

  useEffect(() => {
    if (isBookModalOpen && userId) {
      fetch(`/api/listings?owner_id=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => setUserListings(Array.isArray(data) ? data : (data.listings || [])))
        .catch(console.error);
    }
  }, [isBookModalOpen, userId]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25MB limit!");
      return;
    }

    setIsUploading(true);
    const isVid = file.type.startsWith("video/");
    setMediaType(isVid ? "video" : "image");

    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(reader.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read media file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBookSpotlight = async (e: React.FormEvent) => {
    e.preventDefault();

    if (spotlights.length >= 8) {
      alert("All 8 Spotlight slots for today's 24-hour cycle are filled!");
      return;
    }

    let newStory: Partial<SpotlightStory>;

    if (selectedListingId) {
      const target = userListings.find((l) => l.id === selectedListingId);
      if (!target) return;

      newStory = {
        listing_id: target.id,
        name: target.name,
        tagline: target.description || `${target.name} featured on Spotlight`,
        type: target.type as "startup" | "people" | "vc",
        logo_url: target.logo_url,
        media_url: mediaUrl || target.logo_url,
        media_type: mediaType,
        color: target.color || "#10b981",
        initials: target.initials || target.name.substring(0, 2).toUpperCase(),
        city: target.city,
        website_url: target.website,
        user_id: userId,
      };
    } else {
      if (!customName || !customTagline) {
        alert("Please fill in name and tagline.");
        return;
      }

      newStory = {
        name: customName,
        tagline: customTagline,
        type: "startup",
        media_url: mediaUrl,
        media_type: mediaType,
        color: "#10b981",
        initials: customName.substring(0, 2).toUpperCase(),
        city: customCity,
        website_url: customWebsite,
        user_id: userId,
      };
    }

    try {
      const res = await fetch('/api/spotlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStory)
      });
      if (res.ok) {
        const createdStory = await res.json();
        const updated = [createdStory, ...spotlights].slice(0, 8);
        setSpotlights(updated);
        setIsBookModalOpen(false);
        setCustomName("");
        setCustomTagline("");
        setCustomWebsite("");
        setMediaUrl("");
        onSelectSpotlight(updated, 0);
      } else {
        alert("Failed to book spotlight.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to book spotlight.");
    }
  };

  return (
    <div className="spotlights-wrapper">
      <div className="spotlights-header">
        <div className="spotlights-title-group">
          <h3 className="spotlights-heading">Spotlights</h3>
          <span className="spotlights-coming-soon-tag">Coming soon</span>
        </div>
      </div>

      <div className="spotlights-grid">
        {/* ACTIVE STORIES */}
        {spotlights.map((story, index) => (
          <button
            key={story.id}
            type="button"
            className="story-circle-btn"
            onClick={() => onSelectSpotlight(spotlights, index)}
            title={`${story.name} - ${story.tagline}`}
          >
            <div className="story-ring-wrap">
              {story.logo_url ? (
                <img src={story.logo_url} alt={story.name} className="story-avatar-img" loading="lazy" decoding="async" />
              ) : (
                <div className="story-avatar-initials" style={{ background: story.color }}>
                  {story.initials}
                </div>
              )}
            </div>
            <span className="story-name-label">{story.name}</span>
          </button>
        ))}

        {/* REMAINING EMPTY SLOTS (COMING SOON MODE) */}
        {Array.from({ length: 8 - spotlights.length }).map((_, emptyIndex) => (
          <button
            key={`empty_slot_${emptyIndex}`}
            type="button"
            className="story-circle-btn add-spotlight disabled-coming-soon"
            onClick={() => {
              alert("Spotlights feature is coming soon! Stay tuned.");
            }}
            title="Spotlights - Coming Soon"
          >
            <div className="story-ring-wrap add-wrap">
              <PlusIcon size={14} />
            </div>
          </button>
        ))}
      </div>

      {/* BOOK SPOTLIGHT MODAL WITH MEDIA (IMAGE / VIDEO < 1 MIN) UPLOAD */}
      {isBookModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBookModalOpen(false)}>
          <div className="modal-box spotlight-book-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Book a 24-Hour Spotlight Story Ad</h3>
              <button type="button" className="close-btn" onClick={() => setIsBookModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-subtext">
                Spotlight story ads play directly in the left panel when clicked. Upload an image or video (&lt; 1 min).
              </p>

              <form onSubmit={handleBookSpotlight} className="spotlight-form">
                {userListings.length > 0 && (
                  <div className="form-group">
                    <label>SELECT FROM YOUR PROFILES</label>
                    <select
                      value={selectedListingId}
                      onChange={(e) => {
                        setSelectedListingId(e.target.value);
                        if (e.target.value) {
                          const l = userListings.find((item) => item.id === e.target.value);
                          if (l) {
                            setCustomName(l.name);
                            setCustomTagline(l.description || "");
                            setCustomCity(l.city);
                            setCustomWebsite(l.website || "");
                            if (l.logo_url) {
                              setMediaUrl(l.logo_url);
                              setMediaType("image");
                            }
                          }
                        }
                      }}
                    >
                      <option value="">-- Or enter custom spotlight details below --</option>
                      {userListings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>UPLOAD STORY CONTENT (IMAGE OR VIDEO &lt; 1 MIN)</label>
                  <label className="file-pill-label">
                    <span>
                      {isUploading ? (
                        "Processing media..."
                      ) : mediaUrl ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <CheckIcon size={13} /> Media Attached
                        </span>
                      ) : (
                        "Choose Image or Video file..."
                      )}
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={handleMediaUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {mediaUrl && (
                    <div className="media-preview-container">
                      {mediaType === "video" ? (
                        <video src={mediaUrl} controls className="media-preview" style={{ maxHeight: "160px" }} />
                      ) : (
                        <img src={mediaUrl} alt="Preview" className="media-preview" style={{ maxHeight: "160px" }} />
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>NAME / STARTUP TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zepto AI"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>1-LINE SPOTLIGHT PITCH *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Building 10-min quick commerce AI agents"
                    value={customTagline}
                    onChange={(e) => setCustomTagline(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>CITY *</label>
                    <select value={customCity} onChange={(e) => setCustomCity(e.target.value)}>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Delhi NCR">Delhi NCR</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Pune">Pune</option>
                      <option value="Chennai">Chennai</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>WEBSITE LINK</label>
                    <input
                      type="url"
                      placeholder="https://yourstartup.com"
                      value={customWebsite}
                      onChange={(e) => setCustomWebsite(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsBookModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={isUploading}>
                    Launch Spotlight Story Ad
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
