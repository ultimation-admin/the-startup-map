"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Listing } from "@/lib/db";
import { DedicatedProfileStudio } from "./DedicatedProfileStudio";
import { ProfileStudioSkeleton } from "./Skeletons";
import { ArrowLeftIcon } from "./Icons";

interface UserProfilePanelProps {
  userId: string;
  isSignedIn: boolean;
  isAuthLoaded: boolean;
  onRequireAuth: () => void;
  userEmail?: string;
  userInitials?: string;
  onClose: () => void;
  onAddListingClick: () => void;
  onSelectListingOnMap?: (listing: Listing) => void;
  onOpenJobs?: (listing: Listing) => void;
}

export function UserProfilePanel({
  userId,
  isSignedIn,
  isAuthLoaded,
  onRequireAuth,
  userEmail = "",
  userInitials = "US",
  onClose,
  onAddListingClick,
  onSelectListingOnMap,
  onOpenJobs,
}: UserProfilePanelProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(isSignedIn);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const loadListings = useCallback(async (showLoading = false, signal?: AbortSignal) => {
    if (!isSignedIn) {
      setListings([]);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings?owner_id=${encodeURIComponent(userId)}`, { signal });
      if (!res.ok) throw new Error("We couldn’t load your profile. Please try again.");
      const data = await res.json();
      const responseListings: Listing[] = Array.isArray(data) ? data : (data.listings || []);
      const userListings = Array.from(
        new Map(responseListings.map((listing) => [listing.id, listing])).values()
      );
      setListings(userListings);
      setSelectedProfileId((current) =>
        userListings.some((listing) => listing.id === current) ? current : (userListings[0]?.id ?? null)
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Failed to load user listings:", err);
      setError(err instanceof Error ? err.message : "We couldn’t load your profile. Please try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    setListings([]);
    setSelectedProfileId(null);
    setError(null);
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadListings(true, controller.signal);
    return () => controller.abort();
  }, [isSignedIn, userId, loadListings]);

  const activeProfile = listings.find((listing) => listing.id === selectedProfileId) || listings[0] || null;

  if (!isAuthLoaded) return <ProfileStudioSkeleton />;

  if (!isSignedIn) {
    return (
      <main className="profile-setup-screen">
        <section className="profile-setup-card" aria-labelledby="profile-setup-title">
          <div className="profile-setup-topline">
            <button type="button" className="profile-setup-back" onClick={onClose} aria-label="Back">
              <ArrowLeftIcon size={16} /> Back
            </button>
            <span className="profile-setup-account">YOUR PROFILE</span>
          </div>
          <div className="profile-setup-content">
            <div className="profile-setup-mark" aria-hidden="true">{userInitials}</div>
            <p className="profile-setup-eyebrow">JOIN THE COMMUNITY</p>
            <h1 id="profile-setup-title">Your profile starts here</h1>
            <p className="profile-setup-description">
              Sign in to create your map profile, share updates, and publish articles under your own name.
            </p>
            <button type="button" className="profile-setup-primary" onClick={onRequireAuth}>Sign in to continue</button>
            <p className="profile-setup-note">Your public profile can be shared with a link.</p>
          </div>
        </section>
      </main>
    );
  }

  if (loading) return <ProfileStudioSkeleton />;

  if (activeProfile) {
    return (
      <div className="profile-panel-stack">
        {listings.length > 1 && (
          <div className="profile-switcher" role="group" aria-label="Switch profile">
            <span>PROFILES</span>
            {listings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                aria-pressed={listing.id === activeProfile.id}
                onClick={() => setSelectedProfileId(listing.id)}
                className={listing.id === activeProfile.id ? "is-active" : ""}
              >
                {listing.type === "person" ? `p/${listing.name}` : `s/${listing.name}`}
              </button>
            ))}
          </div>
        )}
        <DedicatedProfileStudio
          key={activeProfile.id}
          profile={activeProfile}
          canManageProfile={activeProfile.owner_id === userId}
          canManageArticles={activeProfile.owner_id === userId}
          onClose={onClose}
          onSelectListingOnMap={onSelectListingOnMap}
          onProfileUpdated={() => loadListings(false)}
          onOpenJobs={onOpenJobs}
        />
      </div>
    );
  }

  return (
    <main className="profile-setup-screen">
      <section className="profile-setup-card" aria-labelledby="profile-setup-title">
        <div className="profile-setup-topline">
          <button type="button" className="profile-setup-back" onClick={onClose} aria-label="Back">
            <ArrowLeftIcon size={16} /> Back
          </button>
          <span className="profile-setup-account">MY ACCOUNT</span>
        </div>
        <div className="profile-setup-content">
          <div className="profile-setup-mark" aria-hidden="true">{userInitials}</div>
          <p className="profile-setup-eyebrow">PROFILE SETUP</p>
          <h1 id="profile-setup-title">Make your place on the map</h1>
          <p className="profile-setup-description">
            Create a personal or startup profile to pin your work on the map, join community conversations, and share articles.
          </p>
          {error ? (
            <div className="profile-setup-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => void loadListings(true)}>Try again</button>
            </div>
          ) : (
            <button type="button" className="profile-setup-primary" onClick={onAddListingClick}>Create your profile</button>
          )}
          {userEmail && <p className="profile-setup-note">Signed in as {userEmail}</p>}
        </div>
      </section>
    </main>
  );
}
