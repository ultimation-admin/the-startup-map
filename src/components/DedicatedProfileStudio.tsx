"use client";

import React, { useState, useEffect } from "react";
import { Listing, CommunityPost } from "@/lib/db";
import {
  MapPinIcon,
  CheckIcon,
  UploadIcon,
  RocketIcon,
  UserIcon,
  GlobeIcon,
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
  PhoneIcon,
} from "./Icons";
import { CommunityFeedSkeleton } from "./Skeletons";

interface DedicatedProfileStudioProps {
  profile: Listing;
  onClose: () => void;
  onSelectListingOnMap?: (listing: Listing) => void;
  onProfileUpdated?: () => void;
}

type StudioTab = "posts" | "replies";

export function DedicatedProfileStudio({
  profile,
  onClose,
  onSelectListingOnMap,
  onProfileUpdated,
}: DedicatedProfileStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("posts");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile Form States
  const [name, setName] = useState(profile.name);
  const [website, setWebsite] = useState(profile.website || "");
  const [phone, setPhone] = useState(profile.phone_number || "");
  const [description, setDescription] = useState(profile.description || "");
  const [tweetUrl, setTweetUrl] = useState(profile.tweet_url || "");
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || "");
  const [fileName, setFileName] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Posts & Replies States
  const [profilePosts, setProfilePosts] = useState<CommunityPost[]>([]);
  const [profileReplies, setProfileReplies] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // Edit Post Inline State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState("");

  const handle = (profile.type === "person" ? `p/${profile.slug}` : `s/${profile.slug}`).toLowerCase();

  // Load Posts & Replies for this Profile Handle
  const loadProfileContent = async () => {
    setLoadingContent(true);
    try {
      const queryParams = new URLSearchParams({
        handle: handle,
        owner_id: profile.owner_id || "",
        slug: profile.slug || "",
        name: profile.name || "",
      });
      const res = await fetch(`/api/posts/profile?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProfilePosts(data.posts || []);
        setProfileReplies(data.replies || []);
      }
    } catch (err) {
      console.error("Failed to load profile posts/replies:", err);
    } finally {
      setLoadingContent(false);
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
    loadProfileContent();
  }, [profile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image size exceeds 5MB." });
        return;
      }
      setFileName(file.name);
      const previewUrl = URL.createObjectURL(file);
      setLogoUrl(previewUrl);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/listings/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          website,
          phone_number: phone,
          description,
          tweet_url: profile.tweet_url,
          logo_url: logoUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile.");
      }

      setMessage({ type: "success", text: "Profile details updated successfully." });
      setIsEditingProfile(false);
      onProfileUpdated?.();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!confirm(`Are you sure you want to delete profile "${profile.name}"?`)) return;
    try {
      const res = await fetch(`/api/listings/${profile.id}`, { method: "DELETE" });
      if (res.ok) {
        onProfileUpdated?.();
        onClose();
      }
    } catch (err) {
      alert("Failed to delete profile");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Permanently delete this community post?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setProfilePosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert("Failed to delete post.");
      }
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const handleSaveEditPost = async (postId: string) => {
    if (!editingPostText.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingPostText }),
      });

      if (res.ok) {
        setProfilePosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, content: editingPostText } : p))
        );
        setEditingPostId(null);
      }
    } catch (err) {
      alert("Failed to edit post");
    }
  };

  return (
    <div className="dedicated-profile-studio" style={{ width: "100%", background: "#F2F2F7", minHeight: "100%" }}>
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
          background: "rgba(242, 242, 247, 0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
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
            color: "#0f172a",
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
              color: "#0f172a",
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
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {/* LEFT: AVATAR WITH OVERLAY CAMERA UPLOAD BUTTON */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                overflow: "hidden",
                background: logoUrl ? "transparent" : "#10b981",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "18px",
                border: "2px solid #ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                profile.initials
              )}
            </div>
            <label
              htmlFor="studio-logo-file"
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                transition: "transform 0.15s ease",
              }}
              title="Upload Avatar Image"
            >
              <UploadIcon size={10} />
            </label>
            <input id="studio-logo-file" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
          </div>

          {/* RIGHT: NAME, USERNAME, EDIT PROFILE BUTTON, DESCRIPTION, METADATA */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* NAME & EDIT BUTTON ROW */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
                    {name}
                  </h2>
                  {profile.type === "startup" ? (
                    <span title="Verified Startup" style={{ color: "#10b981", display: "inline-flex" }}>
                      <RocketIcon size={16} />
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: "14px", color: "#536471", fontWeight: 500, marginTop: "2px" }}>
                  {handle}
                </div>
              </div>

              {/* EDIT PROFILE ACTION BUTTON */}
              <button
                type="button"
                onClick={() => setIsEditingProfile((prev) => !prev)}
                className={`btn-outline-pill ${isEditingProfile ? "active" : ""}`}
              >
                {isEditingProfile ? "Cancel" : "Edit profile"}
              </button>
            </div>

            {/* BIO DESCRIPTION */}
            {description && (
              <p
                style={{
                  margin: "8px 0 8px 0",
                  fontSize: "14px",
                  color: "#0f172a",
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {description}
              </p>
            )}

            {/* METADATA ROW */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 16px",
                fontSize: "13px",
                color: "#536471",
                marginTop: "6px",
              }}
            >
              {profile.city && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPinIcon size={14} />
                  <span>{profile.city}, India</span>
                </div>
              )}

              {profile.sector && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <RocketIcon size={14} />
                  <span>{profile.sector}</span>
                </div>
              )}

              {website && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <GlobeIcon size={14} />
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#10b981", textDecoration: "none", fontWeight: 600 }}
                  >
                    {website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <PhoneIcon size={14} />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE FORM (DISPLAYED WHEN EDIT PROFILE IS ACTIVE) */}
      {isEditingProfile ? (
        <div style={{ padding: "20px", borderTop: "1px solid rgba(0, 0, 0, 0.08)", background: "#ffffff" }}>
          <form onSubmit={handleSaveChanges}>
            {message && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  background: message.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: message.type === "success" ? "#16a34a" : "#dc2626",
                  fontWeight: 700,
                  fontSize: "13.5px",
                }}
              >
                {message.text}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "#536471", letterSpacing: "0.5px" }}>FULL NAME / COMPANY</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-form-field"
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 800, color: "#536471", letterSpacing: "0.5px" }}>PHONE NUMBER</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input-form-field"
                />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 800, color: "#536471", letterSpacing: "0.5px" }}>WEBSITE / PORTFOLIO URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                required
                className="input-form-field"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 800, color: "#536471", letterSpacing: "0.5px" }}>SHORT BIO / DESCRIPTION</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                className="input-form-field"
                style={{ fontFamily: "inherit" }}
              />
            </div>



            <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-solid-emerald"
              >
                <CheckIcon size={16} /> {saving ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "9999px",
                  border: "none",
                  background: "#fee2e2",
                  color: "#dc2626",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "14px",
                  boxShadow: "none",
                }}
              >
                <TrashIcon size={16} /> Delete Profile
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* TWITTER PROFILE NAVIGATION TAB STRIP (LEFT-ALIGNED AT LEFT CORNER) */}
          <div
            className="profile-nav-tabs"
            style={{
              display: "flex",
              gap: "32px",
              justifyContent: "flex-start",
              padding: "0 20px",
              borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
              background: "transparent",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              style={{
                padding: "12px 0",
                border: "none",
                background: "transparent",
                color: activeTab === "posts" ? "#0f172a" : "#536471",
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
                    background: "#10b981",
                    borderRadius: "9999px",
                  }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("replies")}
              style={{
                padding: "12px 0",
                border: "none",
                background: "transparent",
                color: activeTab === "replies" ? "#0f172a" : "#536471",
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
                    background: "#10b981",
                    borderRadius: "9999px",
                  }}
                />
              )}
            </button>
          </div>

          {/* TAB 1: POSTS (TWITTER UNBOXED TIMELINE FEED) */}
          {activeTab === "posts" && (
            <div className="profile-timeline-feed">
              {loadingContent ? (
                <CommunityFeedSkeleton count={2} />
              ) : profilePosts.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#536471", fontSize: "14.5px" }}>
                  No posts published yet by {name}.
                </div>
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
                          background: logoUrl ? "transparent" : "#10b981",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "14px",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {logoUrl ? <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profile.initials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <b style={{ fontSize: "14.5px", color: "#0f172a", fontWeight: 800 }}>{handle.toLowerCase()}</b>
                            <span style={{ fontSize: "13px", color: "#536471" }}>&bull;</span>
                            <small style={{ color: "#536471", fontSize: "13px" }}>{new Date(post.created_at).toLocaleDateString()}</small>
                          </div>
                          <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
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
                              <button type="button" onClick={() => handleSaveEditPost(post.id)} className="btn-solid-emerald">
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ margin: "4px 0 10px 0", fontSize: "14.5px", color: "#0f172a", lineHeight: "1.5", wordBreak: "break-word" }}>{post.content}</p>

                            {post.image_url && (
                              <div style={{ marginTop: "8px", marginBottom: "10px", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                                <img src={post.image_url} alt="Attachment" style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }} />
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "flex-end", marginTop: "8px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPostId(post.id);
                                  setEditingPostText(post.content);
                                }}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", border: "none", background: "transparent", color: "#536471", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}
                              >
                                <EditIcon size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", border: "none", background: "transparent", color: "#ef4444", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}
                              >
                                <TrashIcon size={14} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REPLIES (TWITTER UNBOXED TIMELINE FEED) */}
          {activeTab === "replies" && (
            <div className="profile-replies-feed">
              {loadingContent ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#536471" }}>Loading replies...</div>
              ) : profileReplies.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#536471", fontSize: "14.5px" }}>
                  No replies published yet by {name}.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {profileReplies.map((reply) => (
                    <div key={reply.id} className="timeline-row-item" style={{ padding: "14px 20px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: logoUrl ? "transparent" : "#10b981", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", flexShrink: 0, overflow: "hidden" }}>
                        {logoUrl ? <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profile.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <b style={{ fontSize: "14px", color: "#0f172a", fontWeight: 800 }}>{handle.toLowerCase()}</b>
                          <span style={{ fontSize: "13px", color: "#536471" }}>&bull;</span>
                          <small style={{ color: "#536471", fontSize: "13px" }}>{new Date(reply.created_at).toLocaleDateString()}</small>
                        </div>
                        <p style={{ margin: "2px 0 0 0", fontSize: "14.5px", color: "#0f172a", lineHeight: "1.5" }}>{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
