"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Listing, CommunityPost, PostReply } from "@/lib/db";
import {
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
} from "./Icons";
import { CommunityFeedSkeleton } from "./Skeletons";
import { EmptyFeedState } from "./EmptyFeedState";
import { uploadFileToR2 } from "@/lib/uploadClient";
import { ProfileArticles } from "./ProfileArticles";

interface DedicatedProfileStudioProps {
  profile: Listing;
  canManageProfile?: boolean;
  canManageArticles?: boolean;
  onClose: () => void;
  onSelectListingOnMap?: (listing: Listing) => void;
  onProfileUpdated?: () => void;
  onOpenJobs?: (listing: Listing) => void;
}

type StudioTab = "posts" | "replies" | "articles";
const studioTabs: StudioTab[] = ["posts", "replies", "articles"];

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new globalThis.Map(items.map((item) => [item.id, item])).values());
}

export function DedicatedProfileStudio({
  profile,
  canManageProfile = false,
  canManageArticles = false,
  onClose,
  onSelectListingOnMap,
  onProfileUpdated,
  onOpenJobs,
}: DedicatedProfileStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("posts");
  const [profileTabInitialized, setProfileTabInitialized] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile Form States
  const [name, setName] = useState(profile.name);
  const [website, setWebsite] = useState(profile.website || "");
  const [phone, setPhone] = useState(profile.phone_number || "");
  const [description, setDescription] = useState(profile.description || "");
  const [tweetUrl, setTweetUrl] = useState(profile.tweet_url || "");
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Posts & Replies States
  const [profilePosts, setProfilePosts] = useState<CommunityPost[]>([]);
  const [profileReplies, setProfileReplies] = useState<PostReply[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingMoreContent, setLoadingMoreContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [moreContentError, setMoreContentError] = useState<string | null>(null);
  const [hasLoadedProfileContent, setHasLoadedProfileContent] = useState(false);
  const [contentRetry, setContentRetry] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [repliesCursor, setRepliesCursor] = useState<string | null>(null);

  // Edit Post Inline State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [postActionLoadingId, setPostActionLoadingId] = useState<string | null>(null);

  const handle = (profile.type === "person" ? `p/${profile.slug}` : `s/${profile.slug}`).toLowerCase();

  const changeStudioTab = (tab: StudioTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "posts") url.searchParams.delete("profileTab");
    else url.searchParams.set("profileTab", tab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const handleStudioTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTab: StudioTab) => {
    if (!(["ArrowLeft", "ArrowRight", "Home", "End"] as string[]).includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? studioTabs.length - 1
        : (studioTabs.indexOf(currentTab) + direction + studioTabs.length) % studioTabs.length;
    const nextTab = studioTabs[nextIndex];
    changeStudioTab(nextTab);
    document.getElementById(`profile-tab-${nextTab}`)?.focus();
  };

  const cancelProfileEdit = () => {
    setName(profile.name);
    setWebsite(profile.website || "");
    setPhone(profile.phone_number || "");
    setDescription(profile.description || "");
    setTweetUrl(profile.tweet_url || "");
    setSelectedFile(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    setLogoUrl(profile.logo_url || "");
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setMessage(null);
    setIsEditingProfile(false);
  };

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("profileTab");
    if (tab === "articles" || tab === "replies") setActiveTab(tab);
    setProfileTabInitialized(true);
  }, []);

  // Load activity only when its tab is first opened. Articles use their own endpoint.
  const loadProfileContent = useCallback(async (signal?: AbortSignal) => {
    setLoadingContent(true);
    setContentError(null);
    try {
      const queryParams = new URLSearchParams({
        owner_id: profile.owner_id || "",
      });
      const res = await fetch(`/api/posts/profile?${queryParams.toString()}`, { signal });
      if (!res.ok) throw new Error("Profile activity could not be loaded. Please try again.");
      const data = await res.json();
      if (signal?.aborted) return;
      setProfilePosts(uniqueById(data.posts || []));
      setProfileReplies(uniqueById(data.replies || []));
      setHasMorePosts(Boolean(data.has_more_posts));
      setHasMoreReplies(Boolean(data.has_more_replies));
      setPostsCursor(data.next_posts_cursor || null);
      setRepliesCursor(data.next_replies_cursor || null);
      setHasLoadedProfileContent(true);
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      console.error("Failed to load profile posts/replies:", err);
      setContentError(err instanceof Error ? err.message : "Profile activity could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoadingContent(false);
    }
  }, [profile.owner_id]);

  useEffect(() => {
    if (!profileTabInitialized || activeTab === "articles" || hasLoadedProfileContent) return;
    const controller = new AbortController();
    void loadProfileContent(controller.signal);
    return () => controller.abort();
  }, [activeTab, contentRetry, hasLoadedProfileContent, loadProfileContent, profileTabInitialized]);

  const loadMoreProfileContent = async (kind: "posts" | "replies") => {
    const cursor = kind === "posts" ? postsCursor : repliesCursor;
    if (!cursor || loadingMoreContent) return;

    setLoadingMoreContent(true);
    setMoreContentError(null);
    try {
      const params = new URLSearchParams({ owner_id: profile.owner_id || "" });
      params.set(kind === "posts" ? "posts_cursor" : "replies_cursor", cursor);
      const response = await fetch(`/api/posts/profile?${params.toString()}`);
      if (!response.ok) throw new Error("More profile activity could not be loaded.");
      const data = await response.json();
      if (kind === "posts") {
        setProfilePosts((current) => uniqueById([...current, ...(data.posts || [])]));
        setHasMorePosts(Boolean(data.has_more_posts));
        setPostsCursor(data.next_posts_cursor || null);
      } else {
        setProfileReplies((current) => uniqueById([...current, ...(data.replies || [])]));
        setHasMoreReplies(Boolean(data.has_more_replies));
        setRepliesCursor(data.next_replies_cursor || null);
      }
    } catch (error) {
      console.error("Failed to load more profile activity:", error);
      setMoreContentError(error instanceof Error ? error.message : "More activity could not be loaded.");
    } finally {
      setLoadingMoreContent(false);
    }
  };

  useEffect(() => {
    setName(profile.name);
    setWebsite(profile.website || "");
    setPhone(profile.phone_number || "");
    setDescription(profile.description || "");
    setTweetUrl(profile.tweet_url || "");
    setLogoUrl(profile.logo_url || "");
    setMessage(null);
  }, [profile.id, profile.name, profile.website, profile.phone_number, profile.description, profile.tweet_url, profile.logo_url]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage({ type: "error", text: "Choose an image file." });
        e.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image size exceeds 5MB." });
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      setLogoUrl(previewUrl);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let savedLogoUrl = logoUrl;
      if (selectedFile) {
        const uploadResult = await uploadFileToR2(selectedFile, "logos");
        if (!uploadResult.url) throw new Error("Image upload did not return a usable URL.");
        savedLogoUrl = uploadResult.url;
      }
      const res = await fetch(`/api/listings/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          website,
          phone_number: phone,
          description,
          tweet_url: tweetUrl,
          logo_url: savedLogoUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile.");
      }

      setLogoUrl(savedLogoUrl);
      setSelectedFile(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setMessage({ type: "success", text: "Profile details updated successfully." });
      setIsEditingProfile(false);
      onProfileUpdated?.();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!confirm(`Are you sure you want to delete profile "${profile.name}"?`)) return;
    setDeletingProfile(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${profile.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("The profile could not be deleted. Please try again.");
      onProfileUpdated?.();
      onClose();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "The profile could not be deleted." });
    } finally {
      setDeletingProfile(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Permanently delete this community post?")) return;
    setPostActionLoadingId(postId);
    setPostActionError(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("The post could not be deleted. Please try again.");
      setProfilePosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setPostActionError(err instanceof Error ? err.message : "The post could not be deleted.");
    } finally {
      setPostActionLoadingId(null);
    }
  };

  const handleSaveEditPost = async (postId: string) => {
    if (!editingPostText.trim()) {
      setPostActionError("A post can’t be empty.");
      return;
    }
    setPostActionLoadingId(postId);
    setPostActionError(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingPostText }),
      });

      if (!res.ok) throw new Error("The post could not be saved. Please try again.");
      setProfilePosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content: editingPostText } : p))
      );
      setEditingPostId(null);
    } catch (err) {
      setPostActionError(err instanceof Error ? err.message : "The post could not be saved.");
    } finally {
      setPostActionLoadingId(null);
    }
  };

  return (
    <div className="dedicated-profile-studio" style={{ width: "100%", background: "#FFFFFF", minHeight: "100%" }}>
      {/* TWITTER STICKY TOP HEADER BAR */}
      <div
        className="profile-top-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "10px 20px",
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid #E3E3E3",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to feed"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            color: "#000000",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          className="hover:bg-[rgba(0,0,0,0.06)]"
        >
          <ArrowLeftIcon size={18} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 800,
              color: "#000000",
              letterSpacing: "-0.3px",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </h1>
        </div>
      </div>

      {/* TWITTER UNBOXED PROFILE HERO SECTION (SIDE-BY-SIDE LAYOUT) */}
      <div className="profile-hero-section" style={{ padding: "16px 20px 14px 20px" }}>
        <div className="profile-hero-layout" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {/* LEFT: AVATAR WITH OVERLAY CAMERA UPLOAD BUTTON */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                overflow: "hidden",
                background: logoUrl ? "transparent" : "#E3E3E3",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "18px",
                border: "2px solid #FFFFFF",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                profile.initials
              )}
            </div>
            {canManageProfile && <label
              htmlFor="studio-logo-file"
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                background: "#000000",
                color: "#FFFFFF",
                borderRadius: "999px",
                minWidth: "32px",
                height: "18px",
                padding: "0 5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                transition: "transform 0.15s ease",
              }}
              title="Change profile image"
            >
              Edit
            </label>}
            {canManageProfile && <input ref={logoFileInputRef} id="studio-logo-file" type="file" accept="image/*" aria-label="Upload profile image (5MB max)" style={{ display: "none" }} onChange={handleFileUpload} />}
          </div>

          {/* RIGHT: NAME, USERNAME, EDIT PROFILE BUTTON, DESCRIPTION, METADATA */}
          <div className="profile-hero-content" style={{ flex: 1, minWidth: 0 }}>
            {/* NAME & EDIT BUTTON ROW */}
            <div className="profile-identity-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
              <div className="profile-identity-copy">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#000000", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
                    {name}
                  </h2>
                  {profile.type === "startup" ? (
                    <span title="Startup profile" style={{ color: "#757575", fontSize: "9px", fontWeight: 800, letterSpacing: "0.07em", marginLeft: "3px" }}>
                      STARTUP
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: "14px", color: "#757575", fontWeight: 500, marginTop: "2px" }}>
                  {handle}
                </div>
              </div>

              {/* EDIT PROFILE ACTION BUTTON */}
              <div className="profile-action-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {profile.type === "startup" && onOpenJobs && (
                <button type="button" className="btn-outline-pill" onClick={() => onOpenJobs(profile)}>
                  Jobs
                </button>
              )}
              {onSelectListingOnMap && <button type="button" className="btn-outline-pill" onClick={() => onSelectListingOnMap(profile)}>View on map</button>}
              {canManageProfile && <button
                type="button"
                disabled={saving}
                onClick={() => isEditingProfile ? cancelProfileEdit() : setIsEditingProfile(true)}
                className={`btn-outline-pill ${isEditingProfile ? "active" : ""}`}
              >
                {isEditingProfile ? "Cancel" : "Edit profile"}
              </button>}
              </div>
            </div>

            {/* BIO DESCRIPTION */}
            {description && (
              <p
                style={{
                  margin: "8px 0 8px 0",
                  fontSize: "14px",
                  color: "#000000",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {description}
              </p>
            )}

            {/* METADATA ROW */}
            <div
              className="profile-hero-meta"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 16px",
                fontSize: "13px",
                color: "#757575",
                marginTop: "6px",
              }}
            >
              {profile.city && (
                <span>{profile.city}, India</span>
              )}

              {profile.sector && (
                <span>{profile.sector}</span>
              )}

              {website && (
                <div>
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#000000", textDecoration: "none", fontWeight: 600 }}
                  >
                    {website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {phone && (
                <span>{phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE FORM (DISPLAYED WHEN EDIT PROFILE IS ACTIVE) */}
      {isEditingProfile ? (
        <div style={{ padding: "20px", borderTop: "1px solid #E3E3E3", background: "#FFFFFF" }}>
          <form onSubmit={handleSaveChanges}>
            {message && (
              <div
                role={message.type === "error" ? "alert" : "status"}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  background: message.type === "success" ? "#E3E3E3" : "#E3E3E3",
                  color: message.type === "success" ? "#000000" : "#000000",
                  fontWeight: 700,
                  fontSize: "13.5px",
                }}
              >
                {message.text}
              </div>
            )}

            <div className="profile-edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "#757575", letterSpacing: "0.5px" }}>FULL NAME / COMPANY</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-form-field"
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "#757575", letterSpacing: "0.5px" }}>PHONE NUMBER (OPTIONAL)</label>
                <small>This number is public on your profile.</small>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-form-field"
                />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 800, color: "#757575", letterSpacing: "0.5px" }}>WEBSITE / PORTFOLIO URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="input-form-field"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 800, color: "#757575", letterSpacing: "0.5px" }}>X / TWITTER URL (OPTIONAL)</label>
              <input
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                className="input-form-field"
                placeholder="https://x.com/username"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 800, color: "#757575", letterSpacing: "0.5px" }}>SHORT BIO / DESCRIPTION</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                className="input-form-field"
                style={{ fontFamily: "inherit" }}
              />
            </div>



            <div className="profile-edit-actions" style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
              {canManageProfile && <button
                type="submit"
                disabled={saving}
                className="btn-solid-emerald"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>}
              <button
                type="button"
                disabled={deletingProfile}
                onClick={handleDeleteProfile}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "9999px",
                  border: "none",
                  background: "#E3E3E3",
                  color: "#000000",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "14px",
                  boxShadow: "none",
                }}
              >
                <TrashIcon size={16} /> {deletingProfile ? "Deleting…" : "Delete Profile"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* TWITTER PROFILE NAVIGATION TAB STRIP (LEFT-ALIGNED AT LEFT CORNER) */}
          <div
            className="profile-nav-tabs"
            role="tablist"
            aria-label={`${name} profile content`}
            style={{
              display: "flex",
              gap: "32px",
              justifyContent: "flex-start",
              padding: "0 20px",
              borderBottom: "1px solid #E3E3E3",
              background: "transparent",
            }}
          >
            <button
              id="profile-tab-posts"
              role="tab"
              aria-controls="profile-panel-posts"
              aria-selected={activeTab === "posts"}
              tabIndex={activeTab === "posts" ? 0 : -1}
              type="button"
              onClick={() => changeStudioTab("posts")}
              onKeyDown={(event) => handleStudioTabKeyDown(event, "posts")}
              style={{
                padding: "12px 0",
                border: "none",
                background: "transparent",
                color: activeTab === "posts" ? "#000000" : "#757575",
                fontWeight: activeTab === "posts" ? 800 : 600,
                fontSize: "14.5px",
                cursor: "pointer",
                position: "relative",
                transition: "color 0.15s ease",
              }}
            >
              <span>Posts</span>
              {activeTab === "posts" && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: "#f85900",
                    borderRadius: "9999px",
                  }}
                />
              )}
            </button>

            <button
              id="profile-tab-replies"
              role="tab"
              aria-controls="profile-panel-replies"
              aria-selected={activeTab === "replies"}
              tabIndex={activeTab === "replies" ? 0 : -1}
              type="button"
              onClick={() => changeStudioTab("replies")}
              onKeyDown={(event) => handleStudioTabKeyDown(event, "replies")}
              style={{
                padding: "12px 0",
                border: "none",
                background: "transparent",
                color: activeTab === "replies" ? "#000000" : "#757575",
                fontWeight: activeTab === "replies" ? 800 : 600,
                fontSize: "14.5px",
                cursor: "pointer",
                position: "relative",
                transition: "color 0.15s ease",
              }}
            >
              <span>Replies</span>
              {activeTab === "replies" && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: "#f85900",
                    borderRadius: "9999px",
                  }}
                />
              )}
            </button>

            <button
              id="profile-tab-articles"
              role="tab"
              aria-controls="profile-panel-articles"
              aria-selected={activeTab === "articles"}
              tabIndex={activeTab === "articles" ? 0 : -1}
              type="button"
              onClick={() => changeStudioTab("articles")}
              onKeyDown={(event) => handleStudioTabKeyDown(event, "articles")}
              style={{
                padding: "12px 0",
                border: "none",
                background: "transparent",
                color: activeTab === "articles" ? "#000000" : "#757575",
                fontWeight: activeTab === "articles" ? 800 : 600,
                fontSize: "14.5px",
                cursor: "pointer",
                position: "relative",
                transition: "color 0.15s ease",
              }}
            >
              <span>Articles</span>
              {activeTab === "articles" && (
                <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4px", background: "#f85900", borderRadius: "9999px" }} />
              )}
            </button>
          </div>

          {/* TAB 1: POSTS (TWITTER UNBOXED TIMELINE FEED) */}
          {activeTab === "posts" && (
            <div id="profile-panel-posts" role="tabpanel" tabIndex={0} aria-labelledby="profile-tab-posts" className="profile-timeline-feed">
              {contentError ? (
                <div className="profile-content-error" role="alert">
                  <p>{contentError}</p>
                  <button type="button" onClick={() => setContentRetry((attempt) => attempt + 1)}>Try again</button>
                </div>
              ) : postActionError ? (
                <div className="profile-content-error" role="alert">
                  <p>{postActionError}</p>
                  <button type="button" onClick={() => setPostActionError(null)}>Dismiss</button>
                </div>
              ) : loadingContent ? (
                <CommunityFeedSkeleton count={2} />
              ) : profilePosts.length === 0 ? (
                <EmptyFeedState
                  title={`No posts published yet`}
                  description={`No posts have been published by ${name} yet.`}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {profilePosts.map((post) => (
                    <div
                      key={post.id}
                      className="timeline-row-item"
                      style={{ padding: "14px 20px" }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: logoUrl ? "transparent" : "#000000",
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "14px",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {logoUrl ? <img src={logoUrl} alt={name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profile.initials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="profile-post-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <b style={{ fontSize: "14.5px", color: "#000000", fontWeight: 800 }}>{handle.toLowerCase()}</b>
                            <span style={{ fontSize: "13px", color: "#757575" }}>&bull;</span>
                            <small style={{ color: "#757575", fontSize: "13px" }}>{new Date(post.created_at).toLocaleDateString()}</small>
                          </div>
                          <span className="profile-post-community" style={{ background: "#E3E3E3", color: "#000000", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                            {post.community_name}
                          </span>
                        </div>

                        {editingPostId === post.id ? (
                          <div style={{ marginTop: "6px" }}>
                            <textarea
                              value={editingPostText}
                              onChange={(e) => setEditingPostText(e.target.value)}
                              rows={3}
                              className="input-form-field"
                              style={{ fontFamily: "inherit" }}
                            />
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
                              <button type="button" onClick={() => setEditingPostId(null)} className="btn-outline-pill">
                                Cancel
                              </button>
                              <button type="button" disabled={postActionLoadingId === post.id} onClick={() => void handleSaveEditPost(post.id)} className="btn-solid-emerald">
                                {postActionLoadingId === post.id ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ margin: "4px 0 10px 0", fontSize: "14.5px", color: "#000000", lineHeight: "1.5", wordBreak: "break-word" }}>{post.content}</p>

                            {post.image_url && (
                              <div className="profile-post-media" style={{ marginTop: "8px", marginBottom: "10px", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                                <img src={post.image_url} alt="Post attachment" loading="lazy" decoding="async" style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }} />
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "flex-end", marginTop: "8px" }}>
                              <button
                                type="button"
                                disabled={postActionLoadingId === post.id}
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setEditingPostText(post.content);
                                }}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", border: "none", background: "transparent", color: "#757575", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}
                              >
                                <EditIcon size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                disabled={postActionLoadingId === post.id}
                                onClick={() => handleDeletePost(post.id)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", border: "none", background: "transparent", color: "#000000", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}
                              >
                                <TrashIcon size={14} /> {postActionLoadingId === post.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {hasMorePosts && (
                    <>
                      {moreContentError && <div className="profile-content-error" role="alert"><p>{moreContentError}</p><button type="button" disabled={loadingMoreContent} onClick={() => void loadMoreProfileContent("posts")}>Try again</button></div>}
                      <button type="button" className="btn-outline-pill" disabled={loadingMoreContent} onClick={() => void loadMoreProfileContent("posts")} style={{ alignSelf: "center", margin: "16px 0 24px" }}>
                        {loadingMoreContent ? "Loading…" : "Load more posts"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REPLIES (TWITTER UNBOXED TIMELINE FEED) */}
          {activeTab === "replies" && (
            <div id="profile-panel-replies" role="tabpanel" tabIndex={0} aria-labelledby="profile-tab-replies" className="profile-replies-feed">
              {contentError ? (
                <div className="profile-content-error" role="alert">
                  <p>{contentError}</p>
                  <button type="button" onClick={() => setContentRetry((attempt) => attempt + 1)}>Try again</button>
                </div>
              ) : loadingContent ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#757575" }}>Loading replies...</div>
              ) : profileReplies.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#757575", fontSize: "14.5px" }}>
                  No replies published yet by {name}.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {profileReplies.map((reply) => (
                    <div key={reply.id} className="timeline-row-item" style={{ padding: "14px 20px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: logoUrl ? "transparent" : "#000000", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", flexShrink: 0, overflow: "hidden" }}>
                        {logoUrl ? <img src={logoUrl} alt={name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profile.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <b style={{ fontSize: "14px", color: "#000000", fontWeight: 800 }}>{handle.toLowerCase()}</b>
                          <span style={{ fontSize: "13px", color: "#757575" }}>&bull;</span>
                          <small style={{ color: "#757575", fontSize: "13px" }}>{new Date(reply.created_at).toLocaleDateString()}</small>
                        </div>
                        <p style={{ margin: "2px 0 0 0", fontSize: "14.5px", color: "#000000", lineHeight: "1.5" }}>{reply.content}</p>
                      </div>
                    </div>
                  ))}
                  {hasMoreReplies && (
                    <>
                      {moreContentError && <div className="profile-content-error" role="alert"><p>{moreContentError}</p><button type="button" disabled={loadingMoreContent} onClick={() => void loadMoreProfileContent("replies")}>Try again</button></div>}
                      <button type="button" className="btn-outline-pill" disabled={loadingMoreContent} onClick={() => void loadMoreProfileContent("replies")} style={{ alignSelf: "center", margin: "16px 0 24px" }}>
                        {loadingMoreContent ? "Loading…" : "Load more replies"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "articles" && (
            <div id="profile-panel-articles" role="tabpanel" tabIndex={0} aria-labelledby="profile-tab-articles">
              <ProfileArticles key={profile.id} profile={profile} canManageArticles={canManageArticles} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
