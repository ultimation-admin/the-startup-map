"use client";

import React, { useState, useEffect } from "react";
import {
  Community,
  CommunityPost,
  ECOSYSTEM_COMMUNITIES,
  Listing,
} from "@/lib/db";
import { rankCommunityFeed } from "@/lib/feedAlgorithm";
import { SparklesIcon, PlusIcon, UploadIcon, ImageIcon, UserGroupIcon, FlameIcon, MapPinIcon, CheckIcon } from "./Icons";
import { CommunityFeedSkeleton } from "./Skeletons";

import { INTEREST_TOPICS } from "./FeedOnboardingModal";

interface CommunityFeedProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  isSignedIn: boolean;
  userInterests?: string[];
  userJoinedCommunities?: string[];
  onRequireAuth: () => void;
  onOpenAddListing?: () => void;
  onSelectAuthorHandle?: (handle: string) => void;
  onOpenFeedOnboarding?: () => void;
}

export function CommunityFeed({
  userId,
  userEmail = "founder@startupmap.in",
  userName = "Founder",
  userAvatar,
  isSignedIn,
  userInterests,
  userJoinedCommunities,
  onRequireAuth,
  onOpenAddListing,
  onSelectAuthorHandle,
  onOpenFeedOnboarding,
}: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("all");
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(["genai", "saas"]);
  const [showNoProfileModal, setShowNoProfileModal] = useState(false);
  const [userProfileListing, setUserProfileListing] = useState<Listing | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);

  const loadCommunities = async () => {
    try {
      const res = await fetch('/api/communities');
      if (res.ok) {
        const data = await res.json();
        const list: Community[] = Array.isArray(data) ? data : (data.communities || []);
        if (list.length > 0) {
          setCommunities(list);
          setNewPostCommunity(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load communities:", err);
    }
  };

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    if (isSignedIn && userId) {
      fetch(`/api/listings?owner_id=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => {
          const listings: Listing[] = Array.isArray(data) ? data : (data.listings || []);
          if (listings.length > 0) {
            setUserProfileListing(listings[0]);
          }
        })
        .catch((err) => console.error("Failed to load profile listing for composer:", err));
    }
  }, [isSignedIn, userId]);

  // Create post form state
  const [newPostText, setNewPostText] = useState("");
  const [newPostCommunity, setNewPostCommunity] = useState("startups");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCreateBox, setShowCreateBox] = useState(false);

  // Reply state: active post ID being replied to
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadFeed = async (isInitial = false) => {
    if (isInitial) setLoadingPosts(true);
    try {
      const res = await fetch(selectedCommunityId === "all" ? '/api/posts' : `/api/posts?community_id=${selectedCommunityId}`);
      if (res.ok) {
        const data = await res.json();
        const active = Array.isArray(data) ? data : (data.posts || []);
        setPosts(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadFeed(true);
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadFeed(false);
      }
    }, 60000);

    const handleFocus = () => {
      loadFeed(false);
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
  }, [selectedCommunityId]);

  const toggleJoinCommunity = (communityId: string) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    const updated = joinedCommunities.includes(communityId)
      ? joinedCommunities.filter((id) => id !== communityId)
      : [...joinedCommunities, communityId];

    setJoinedCommunities(updated);
    if (typeof window !== "undefined" && userId) {
      localStorage.setItem(`startupmap_communities_${userId}`, JSON.stringify(updated));
    }
  };

  // Local File Selection Handler (Zero network calls while editing/changing)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size exceeds 10MB!");
      return;
    }

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl("");
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    if (!newPostText.trim()) {
      alert("Please write something to post.");
      return;
    }

    setIsUploadingImage(true);
    let finalR2ImageUrl = "";

    // Upload file to R2 ONLY upon post submission
    if (selectedImageFile) {
      try {
        const formData = new FormData();
        formData.append("file", selectedImageFile);
        formData.append("folder", "posts");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalR2ImageUrl = uploadData.url || "";
        }
      } catch (err) {
        console.warn("R2 upload error during post submission, using preview URL fallback:", err);
        finalR2ImageUrl = imagePreviewUrl;
      }
    } else if (imagePreviewUrl && !imagePreviewUrl.startsWith("data:")) {
      finalR2ImageUrl = imagePreviewUrl;
    }

    const targetCommunity = ECOSYSTEM_COMMUNITIES.find((c) => c.id === newPostCommunity);

    const newPostData = {
      community_id: newPostCommunity,
      community_name: targetCommunity ? targetCommunity.name : "General",
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      user_initials: userName.substring(0, 2).toUpperCase(),
      user_role: "Ecosystem Builder",
      content: newPostText.trim(),
      image_url: finalR2ImageUrl || undefined,
    };

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPostData)
      });
      if (res.ok) {
        const data = await res.json();
        setPosts([data.post || data, ...posts]);
        setNewPostText("");
        setSelectedImageFile(null);
        setImagePreviewUrl("");
        setShowCreateBox(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "NO_PROFILE_CREATED") {
          setShowNoProfileModal(true);
        } else {
          alert(errData.message || errData.error || "Failed to create post.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create post.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    const updated = posts.map((p) => {
      if (p.id === postId) {
        const isLiked = p.liked_by.includes(userId);
        const newLikedBy = isLiked
          ? p.liked_by.filter((id) => id !== userId)
          : [...p.liked_by, userId];

        return {
          ...p,
          liked_by: newLikedBy,
          likes_count: newLikedBy.length,
        };
      }
      return p;
    });
    setPosts(updated);

    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    } catch (err) {
      console.error("Failed to toggle like", err);
    }
  };

  const handleAddReply = async (postId: string) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    if (!replyText.trim()) return;

    const newReplyData = {
      post_id: postId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      user_initials: userName.substring(0, 2).toUpperCase(),
      content: replyText.trim(),
    };

    try {
      const res = await fetch(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReplyData)
      });
      if (res.ok) {
        const data = await res.json();
        const createdReply = data.reply || data;
        const updated = posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              replies: [...p.replies, createdReply],
            };
          }
          return p;
        });
        setPosts(updated);
        setReplyText("");
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "NO_PROFILE_CREATED") {
          setShowNoProfileModal(true);
        } else {
          alert(errData.message || errData.error || "Failed to add reply.");
        }
      }
    } catch (err) {
      console.error("Failed to add reply", err);
    }
  };

  const [feedTab, setFeedTab] = useState<"for-you" | "joined" | "trending">("for-you");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showForYouDropdown, setShowForYouDropdown] = useState(false);
  const [showJoinedDropdown, setShowJoinedDropdown] = useState(false);
  const feedTopNavRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking anywhere outside on screen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (feedTopNavRef.current && !feedTopNavRef.current.contains(event.target as Node)) {
        setShowForYouDropdown(false);
        setShowJoinedDropdown(false);
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      if (typeof window !== "undefined") {
        document.removeEventListener("mousedown", handleClickOutside);
      }
    };
  }, []);

  // Sync setup info (interests & joined communities) from localStorage / props
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      if (userInterests && userInterests.length > 0) {
        setSelectedInterests(userInterests);
      } else {
        const savedInterests = localStorage.getItem(`startupmap_interests_${userId}`);
        if (savedInterests) {
          try {
            const parsed = JSON.parse(savedInterests);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedInterests(parsed);
            }
          } catch {}
        }
      }

      if (userJoinedCommunities && userJoinedCommunities.length > 0) {
        setJoinedCommunities(userJoinedCommunities);
      } else {
        const savedCommunities = localStorage.getItem(`startupmap_communities_${userId}`);
        if (savedCommunities) {
          try {
            const parsed = JSON.parse(savedCommunities);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setJoinedCommunities(parsed);
            }
          } catch {}
        }
      }
    }
  }, [userId, JSON.stringify(userInterests), JSON.stringify(userJoinedCommunities)]);

  const toggleInterest = (topicId: string) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId];
      if (typeof window !== "undefined" && userId) {
        localStorage.setItem(`startupmap_interests_${userId}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const getFilteredAndSortedPosts = () => {
    let sourcePosts = [...posts];

    if (selectedCommunityId !== "all") {
      sourcePosts = sourcePosts.filter((p) => p.community_id === selectedCommunityId);
    }

    return rankCommunityFeed(sourcePosts, feedTab, {
      userId,
      userCity: userProfileListing?.city,
      userSector: userProfileListing?.sector,
      joinedCommunities,
      selectedInterests,
    });
  };

  const filteredPosts = getFilteredAndSortedPosts();

  return (
    <div className="community-feed-wrapper">

      {/* CREATE POST BLOCK (TWITTER / X STYLE COMPOSER) */}
      {showCreateBox && (
        <form onSubmit={handleCreatePost} className="create-post-composer">
          <div className="composer-row">
            {/* ACTIVE PROFILE AVATAR */}
            <div className="composer-avatar" style={{ background: userProfileListing?.color || "#10b981", borderRadius: "50%" }}>
              {userProfileListing?.logo_url ? (
                <img src={userProfileListing.logo_url} alt={userProfileListing.name} />
              ) : userProfileListing?.initials ? (
                <span>{userProfileListing.initials}</span>
              ) : userAvatar ? (
                <img src={userAvatar} alt={userName} />
              ) : (
                <span>{userName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            {/* COMPOSER BODY */}
            <div className="composer-body">
              {/* TARGET COMMUNITY HEADER: Post at /community-name */}
              <div className="composer-header-title">
                <span className="post-at-text">Post at</span>
                <div className="composer-community-pill">
                  <select
                    value={newPostCommunity}
                    onChange={(e) => setNewPostCommunity(e.target.value)}
                    className="community-select-compact"
                  >
                    {communities.length > 0 ? (
                      communities.map((c) => {
                        const formattedName = c.name.startsWith("/") ? c.name : `/${c.name}`;
                        return (
                          <option key={c.id} value={c.id}>
                            {formattedName}
                          </option>
                        );
                      })
                    ) : (
                      <option value="startups">/startups</option>
                    )}
                  </select>
                </div>
              </div>

              {/* TEXTAREA */}
              <textarea
                required
                rows={3}
                maxLength={500}
                placeholder="What's happening in your startup journey?"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="composer-textarea"
              />

              {/* IMAGE ATTACHMENT PREVIEW */}
              {imagePreviewUrl && (
                <div className="composer-image-preview-wrap">
                  <img src={imagePreviewUrl} alt="Attachment" className="composer-image-preview" />
                  <button type="button" className="remove-composer-img-btn" onClick={handleRemoveImage}>
                    ✕
                  </button>
                </div>
              )}

              {/* COMPOSER BOTTOM ACTIONS */}
              <div className="composer-footer">
                <div className="composer-tools">
                  <label
                    className={`composer-tool-icon-btn ${imagePreviewUrl ? "active" : ""}`}
                    title={
                      isUploadingImage
                        ? "Uploading photo..."
                        : imagePreviewUrl
                        ? "Photo Attached (Click to change)"
                        : "Add Photo"
                    }
                  >
                    <ImageIcon size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div className="composer-submit-group">
                  <span className="composer-char-count">{500 - newPostText.length}</span>
                  <button
                    type="button"
                    className="composer-discard-btn"
                    onClick={() => {
                      setNewPostText("");
                      handleRemoveImage();
                      setShowCreateBox(false);
                    }}
                  >
                    Discard
                  </button>
                  <button type="submit" className="composer-post-btn" disabled={isUploadingImage || !newPostText.trim()}>
                    {isUploadingImage ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* FIXED STICKY TOP SECTION FOR DISCOVERY TABS (TWITTER / X STYLE) */}
      <div ref={feedTopNavRef} className="feed-top-section-fixed">
        <div className="feed-top-action-bar">
          <div className="feed-nav-tabs twitter-nav-tabs">
            {/* 1. FOR YOU TAB (WITH INTERESTS DROPDOWN) */}
            <div className="nav-tab-dropdown-wrap">
              <button
                type="button"
                className={`feed-nav-tab twitter-tab ${feedTab === "for-you" ? "active" : ""}`}
                onClick={() => {
                  setFeedTab("for-you");
                  setShowForYouDropdown(false);
                  setShowJoinedDropdown(false);
                }}
              >
                <span className="tab-label-text">
                  <SparklesIcon size={14} className="tab-section-icon" filled={feedTab === "for-you"} />
                  <span>For You</span>
                  <span
                    className={`feed-chevron-arrow ${showForYouDropdown ? "open" : ""}`}
                    title="Change Interest Topics"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeedTab("for-you");
                      setShowForYouDropdown(!showForYouDropdown);
                      setShowJoinedDropdown(false);
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                  {feedTab === "for-you" && <span className="twitter-tab-active-indicator" />}
                </span>
              </button>

              {showForYouDropdown && (
                <div className="tab-dropdown-menu">
                  <div className="dropdown-title">FILTER BY INTEREST TOPICS</div>
                  {INTEREST_TOPICS.map((topic) => {
                    const isSelected = selectedInterests.includes(topic.id);
                    const IconComponent = topic.icon;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        className={`dropdown-item ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleInterest(topic.id)}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: topic.color, display: "inline-flex" }}>
                            <IconComponent size={15} />
                          </span>
                          <span>{topic.label}</span>
                        </span>
                        <span className="chip-check-wrap">{isSelected ? <CheckIcon size={13} /> : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. JOINED TAB (WITH JOIN / EXIT COMMUNITIES DROPDOWN) */}
            <div className="nav-tab-dropdown-wrap">
              <button
                type="button"
                className={`feed-nav-tab twitter-tab ${feedTab === "joined" ? "active" : ""}`}
                onClick={() => {
                  setFeedTab("joined");
                  setShowJoinedDropdown(false);
                  setShowForYouDropdown(false);
                }}
              >
                <span className="tab-label-text">
                  <UserGroupIcon size={14} className="tab-section-icon" filled={feedTab === "joined"} />
                  <span>Joined</span>
                  {joinedCommunities.length > 0 && (
                    <span className="joined-count-badge">{joinedCommunities.length}</span>
                  )}
                  <span
                    className={`feed-chevron-arrow ${showJoinedDropdown ? "open" : ""}`}
                    title="Manage Communities"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeedTab("joined");
                      setShowJoinedDropdown(!showJoinedDropdown);
                      setShowForYouDropdown(false);
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                  {feedTab === "joined" && <span className="twitter-tab-active-indicator" />}
                </span>
              </button>

              {showJoinedDropdown && (
                <div className="tab-dropdown-menu">
                  {(() => {
                    const availableList = communities.length > 0 ? communities : ECOSYSTEM_COMMUNITIES;
                    const joinedList = availableList.filter((c) => joinedCommunities.includes(c.id));
                    const unjoinedList = availableList.filter((c) => !joinedCommunities.includes(c.id));

                    return (
                      <>
                        <div className="dropdown-title">YOUR JOINED COMMUNITIES ({joinedList.length})</div>
                        {joinedList.length === 0 ? (
                          <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>
                            No communities joined yet. Select below to join.
                          </div>
                        ) : (
                          joinedList.map((c) => {
                            const formattedName = c.name.startsWith("/") ? c.name : `/${c.name}`;
                            return (
                              <div key={c.id} className="dropdown-community-row">
                                <div className="community-info">
                                  <b>{formattedName}</b>
                                </div>
                                <button
                                  type="button"
                                  className="join-toggle-btn joined"
                                  onClick={() => toggleJoinCommunity(c.id)}
                                >
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <CheckIcon size={12} /> Joined
                                  </span>
                                </button>
                              </div>
                            );
                          })
                        )}

                        {unjoinedList.length > 0 && (
                          <>
                            <div className="dropdown-title" style={{ marginTop: "12px" }}>EXPLORE MORE COMMUNITIES</div>
                            {unjoinedList.map((c) => {
                              const formattedName = c.name.startsWith("/") ? c.name : `/${c.name}`;
                              return (
                                <div key={c.id} className="dropdown-community-row">
                                  <div className="community-info">
                                    <b>{formattedName}</b>
                                  </div>
                                  <button
                                    type="button"
                                    className="join-toggle-btn"
                                    onClick={() => toggleJoinCommunity(c.id)}
                                  >
                                    + Join
                                  </button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 3. TRENDING TAB */}
            <button
              type="button"
              className={`feed-nav-tab twitter-tab ${feedTab === "trending" ? "active" : ""}`}
              onClick={() => {
                setFeedTab("trending");
                setShowForYouDropdown(false);
                setShowJoinedDropdown(false);
              }}
            >
              <span className="tab-label-text">
                <FlameIcon size={14} className="tab-section-icon" filled={feedTab === "trending"} />
                <span>Trending</span>
                {feedTab === "trending" && <span className="twitter-tab-active-indicator" />}
              </span>
            </button>
          </div>

          {!showCreateBox && (
            <div className="feed-header-actions-row">
              <button
                type="button"
                className="create-post-btn twitter-create-post-btn"
                onClick={() => {
                  if (!isSignedIn) {
                    onRequireAuth();
                  } else {
                    setShowCreateBox(true);
                  }
                }}
              >
                <PlusIcon size={14} />
                <span>Post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POSTS FEED */}
      <div className="posts-feed">
        {loadingPosts ? (
          <CommunityFeedSkeleton count={3} />
        ) : filteredPosts.length === 0 ? (
          <div className="empty-feed-card">
            <p>No 24-hour posts in this community yet.</p>
            <button type="button" className="add-btn" onClick={() => setShowCreateBox(true)}>
              + Be the first to post
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isLiked = post.liked_by.includes(userId);
            const isReplying = activeReplyPostId === post.id;

            return (
              <div key={post.id} className="tweet-card">
                {/* LEFT COLUMN: AVATAR */}
                <div className="tweet-avatar-col">
                  {post.user_avatar ? (
                    <img src={post.user_avatar} alt={post.user_name} className="tweet-avatar" />
                  ) : (
                    <div className="tweet-initials">{post.user_initials}</div>
                  )}
                </div>

                {/* RIGHT COLUMN: TWEET CONTENT */}
                <div className="tweet-main-col">
                  {/* TWEET HEADER */}
                  <div className="tweet-header">
                    <div className="tweet-meta">
                      {(() => {
                        const authorHandle = (
                          post.user_name.startsWith("p/") || post.user_name.startsWith("s/")
                            ? post.user_name
                            : `p/${post.user_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
                        ).toLowerCase();
                        return (
                          <button
                            type="button"
                            onClick={() => onSelectAuthorHandle?.(authorHandle)}
                            style={{ color: "#111827", textDecoration: "none", fontWeight: 800, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}
                          >
                            {authorHandle}
                          </button>
                        );
                      })()}
                      <span className="tweet-community-pill">{post.community_name}</span>
                    </div>
                  </div>

                  {/* TWEET BODY TEXT */}
                  <p className="tweet-text">{post.content}</p>

                  {/* TWEET ATTACHED MEDIA */}
                  {post.image_url && (
                    <div className="tweet-media-wrap">
                      <img src={post.image_url} alt="Attachment" className="tweet-media-img" />
                    </div>
                  )}

                  {/* ACTION BAR: LEFT INTERACTION CLUSTER (LIKE, COMMENT, VIEWS) | RIGHT REPORT BUTTON */}
                  <div className="tweet-actions-row">
                    <div className="interactions-left-cluster">
                      <button
                        type="button"
                        className={`tweet-action-btn like-btn ${isLiked ? "liked" : ""}`}
                        onClick={() => handleToggleLike(post.id)}
                        title="Like"
                      >
                        <svg viewBox="0 0 24 24" className="tweet-icon">
                          {isLiked ? (
                            <path fill="#10b981" d="M12 21.638h-.014C9.403 21.59 1.95 14.851 1.95 8.478c0-3.064 2.525-5.554 5.628-5.554 2.14 0 4.022 1.189 4.922 2.955.9-1.766 2.782-2.955 4.922-2.955 3.103 0 5.628 2.49 5.628 5.554 0 6.373-7.453 13.112-10.036 13.16h-.014z" />
                          ) : (
                            <path fill="currentColor" d="M16.697 3.5c-1.776 0-3.38.868-4.397 2.228C11.283 4.368 9.679 3.5 7.903 3.5 4.92 3.5 2.5 5.92 2.5 8.903c0 5.16 5.86 10.74 9.07 13.29.25.2.61.2.86 0 3.21-2.55 9.07-8.13 9.07-13.29 0-2.983-2.42-5.403-5.403-5.403zm-4.397 16.99c-2.44-2.02-7.8-6.9-7.8-11.587 0-1.876 1.524-3.4 3.4-3.4 1.34 0 2.54.77 3.09 1.96.19.41.6.67 1.05.67.45 0 .86-.26 1.05-.67.55-1.19 1.75-1.96 3.09-1.96 1.876 0 3.4 1.524 3.4 3.4 0 4.687-5.36 9.567-7.8 11.587z" />
                          )}
                        </svg>
                        <span className={isLiked ? "like-count-green" : "action-count-text"}>
                          {post.likes_count > 0 ? post.likes_count : ""}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`tweet-action-btn reply-btn ${isReplying ? "active" : ""}`}
                        onClick={() => setActiveReplyPostId(isReplying ? null : post.id)}
                        title="Comment"
                      >
                        <svg viewBox="0 0 24 24" className="tweet-icon">
                          <path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.489c4.42 0 8.005 3.58 8.005 8 0 3.15-1.82 5.88-4.469 7.19l-3.328 3.33a1.49 1.49 0 0 1-2.112 0l-3.328-3.33A8.01 8.01 0 0 1 1.75 10zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 2.5 1.536 4.65 3.738 5.56.368.15.607.51.607.91v1.65l2.138-2.14c.284-.28.67-.44 1.071-.44h2.942c3.317 0 6.005-2.69 6.005-6s-2.688-6-6.005-6H9.756z" />
                        </svg>
                        <span className="action-count-text">{post.replies.length > 0 ? post.replies.length : ""}</span>
                      </button>

                      <div className="tweet-action-btn views-btn" title="Views">
                        <svg viewBox="0 0 24 24" className="tweet-icon">
                          <path fill="currentColor" d="M8.75 21V3h2v18h-2zM18 21V11h2v10h-2zM3 21V16h2v5H3zM13.25 21V7h2v14h-2z" />
                        </svg>
                        <span className="action-count-text">{post.views_count}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="tweet-action-btn report-btn"
                      onClick={() => {
                        if (!isSignedIn) {
                          onRequireAuth();
                        } else {
                          alert("Thank you for reporting. Our moderation team will review this post within 24 hours.");
                        }
                      }}
                      title="Report Post"
                    >
                      <svg viewBox="0 0 24 24" className="tweet-icon report-icon">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                      </svg>
                    </button>
                  </div>

                  {/* REPLIES SECTION */}
                  {isReplying && (
                    <div className="tweet-replies-wrap">
                      {post.replies.map((reply) => (
                        <div key={reply.id} className="tweet-reply-row">
                          <div className="tweet-reply-avatar">{reply.user_initials}</div>
                          <div className="tweet-reply-bubble">
                            <span className="reply-name">{reply.user_name}</span>
                            <p className="reply-body">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="tweet-reply-input-row">
                        <input
                          type="text"
                          placeholder="Post your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddReply(post.id);
                          }}
                        />
                        <button type="button" onClick={() => handleAddReply(post.id)}>
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NO PROFILE REQUIRED MODAL */}
      {showNoProfileModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px 24px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f0eee6", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", margin: "0 auto 16px" }}>
              <MapPinIcon size={24} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Map Profile Required</h3>
            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.5", margin: "0 0 24px 0" }}>
              To post, reply, or interact in the community, you need to create your official map profile (either as <b>p/YourName</b> or <b>s/StartupName</b>) pinned on the map!
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowNoProfileModal(false)}
                style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#eeeef2", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoProfileModal(false);
                  onOpenAddListing?.();
                }}
                style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#10b981", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
              >
                + Create Map Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
