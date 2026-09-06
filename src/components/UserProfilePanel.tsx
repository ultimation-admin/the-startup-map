"use client";

import React, { useState, useEffect } from "react";
import { Listing } from "@/lib/db";
import { DedicatedProfileStudio } from "./DedicatedProfileStudio";
import { ProfileStudioSkeleton } from "./Skeletons";
import {
  RocketIcon,
  UserIcon,
  PlusIcon,
  CheckIcon,
  AlertTriangleIcon,
  MapPinIcon,
  GlobeIcon,
  SparklesIcon,
  ArrowLeftIcon,
} from "./Icons";

interface UserProfilePanelProps {
  userId: string;
  userEmail?: string;
  userInitials?: string;
  onClose: () => void;
  onAddListingClick: () => void;
  onSelectListingOnMap?: (listing: Listing) => void;
}

export function UserProfilePanel({
  userId,
  userEmail = "founder@startupmap.in",
  userInitials = "US",
  onClose,
  onAddListingClick,
  onSelectListingOnMap,
}: UserProfilePanelProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const loadListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings?owner_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        const userListings: Listing[] = Array.isArray(data) ? data : (data.listings || []);
        setListings(userListings);
        if (userListings.length > 0 && !selectedProfileId) {
          setSelectedProfileId(userListings[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load user listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    const interval = setInterval(loadListings, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const activeProfile = listings.find((l) => l.id === selectedProfileId) || listings[0] || null;

  if (loading) {
    return <ProfileStudioSkeleton />;
  }

  // IF USER HAS CREATED A PROFILE, SHOW THE FULL PROFILE DASHBOARD & STUDIO IN THE LEFT SIDE PANEL!
  if (activeProfile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* PROFILE SWITCHER BAR IF USER HAS MULTIPLE MAP PROFILES */}
        {listings.length > 1 && (
          <div style={{ display: "flex", gap: "8px", background: "#ffffff", padding: "10px 16px", borderRadius: "12px", border: "1px solid #e5e7eb", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>SWITCH PROFILE:</span>
            {listings.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedProfileId(l.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: l.id === activeProfile.id ? "#111827" : "#eeeef2",
                  color: l.id === activeProfile.id ? "#ffffff" : "#374151",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {l.type === "person" ? `p/${l.name}` : `s/${l.name}`}
              </button>
            ))}
          </div>
        )}

        <DedicatedProfileStudio
          profile={activeProfile}
          onClose={onClose}
          onSelectListingOnMap={onSelectListingOnMap}
          onProfileUpdated={loadListings}
        />
      </div>
    );
  }

  // IF USER HAS NOT CREATED A PROFILE YET, SHOW CREATE PROFILE CALL TO ACTION IN LEFT PANEL
  return (
    <div style={{ background: "#ffffff", borderRadius: "16px", margin: "16px 20px", padding: "20px", border: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={onClose}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "none", background: "#eeeef2", padding: "8px 14px", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
        >
          <ArrowLeftIcon size={14} /> Back
        </button>
        <span style={{ background: "#111827", color: "#ffffff", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
          MY ACCOUNT
        </span>
      </div>

      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#e6f8ed", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
          <RocketIcon size={28} />
        </div>
        <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800 }}>No Map Profile Created Yet</h3>
        <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
          Create a profile to pin yourself or your startup on the interactive map and start posting in the community feed.
        </p>

        <button
          type="button"
          onClick={onAddListingClick}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            borderRadius: "10px",
            border: "none",
            background: "#10b981",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <PlusIcon size={16} /> Create Map Profile
        </button>
      </div>
    </div>
  );
}
