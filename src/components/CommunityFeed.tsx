"use client";

import React, { useState, useEffect } from "react";
import {
  Community,
  CommunityPost,
  ECOSYSTEM_COMMUNITIES,
  Listing,
} from "@/lib/db";
import { rankCommunityFeed } from "@/lib/feedAlgorithm";
import {
  RepostIcon,
  ShareSendIcon,
  MoreHorizontalIcon,
} from "./Icons";
import { CommunityFeedSkeleton } from "./Skeletons";
import { EmptyFeedState } from "./EmptyFeedState";

import { RedditThreadReplies } from "./RedditThreadReplies";
import { uploadFileToR2 } from "@/lib/uploadClient";

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "";
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${Math.max(1, diffSecs)}s`;
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  } catch {
    return "";
  }
}

interface CommunityFeedProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  isSignedIn: boolean;
  userInterests?: string[];
  userJoinedCommunities?: string[];
  mobileTab?: "feed" | "map";
  onToggleMobileTab?: (tab: "feed" | "map") => void;
  onRequireAuth: () => void;
  onOpenAddListing?: () => void;
  onSelectAuthorHandle?: (handle: string) => void;
}

export function CommunityFeed({
  userId,
  userEmail = "founder@startupmap.in",
  userName = "Founder",
  userAvatar,
  isSignedIn,
  userInterests,
  userJoinedCommunities,
  mobileTab = "feed",
  onToggleMobileTab,
  onRequireAuth,
  onOpenAddListing,
  onSelectAuthorHandle,
}: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>(ECOSYSTEM_COMMUNITIES);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("all");
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(["startups", "founders", "genai"]);
  const [showNoProfileModal, setShowNoProfileModal] = useState(false);
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [userProfileListing, setUserProfileListing] = useState<Listing | null>(null);

  useEffect(() => {
    const openComposer = () => {
      if (!isSignedIn) {
        onRequireAuth();
        return;
      }
      setShowCreateBox(true);
      window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(".create-post-composer textarea")?.focus(), 0);
    };
    window.addEventListener("startupmap:compose", openComposer);
    return () => window.removeEventListener("startupmap:compose", openComposer);
  }, [isSignedIn, onRequireAuth]);

  // Repost & Share interactive state
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create post form state
  const [newPostText, setNewPostText] = useState("");
  const [newPostCommunity, setNewPostCommunity] = useState("startups");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Reply state: active post ID being replied to
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleToggleRepost = async (post: CommunityPost) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    setActionError(null);
    try {
      const res = await fetch("/api/posts/" + post.id + "/repost", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update repost.");
      setPosts((current) => current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              reposts_count: data.reposts_count,
              reposted_by: data.reposted
                ? [...item.reposted_by, userId]
                : item.reposted_by.filter((id) => id !== userId),
            }
          : item
      ));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't update repost. Try again.");
    }
  };

  const handleSharePost = async (post: CommunityPost) => {
    const permalink = new URL(window.location.href);
    permalink.hash = "post-" + post.id;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: post.user_name, text: post.content, url: permalink.toString() });
        return;
      }
      await navigator.clipboard.writeText(permalink.toString());
      setShareFeedback("Post link copied");
      window.setTimeout(() => setShareFeedback(null), 3000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setActionError("Couldn't share this post. Please try again.");
    }
  };

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

  const loadFeed = async (isInitial = false) => {
    if (isInitial) setLoadingPosts(true);
    setFeedError(null);
    try {
      const res = await fetch(selectedCommunityId === "all" ? '/api/posts' : `/api/posts?community_id=${selectedCommunityId}`);
      if (!res.ok) throw new Error("Feed could not be loaded.");
      const data = await res.json();
      const active = Array.isArray(data) ? data : (data.posts || []);
      setPosts(active);
    } catch (err) {
      console.error(err);
      setFeedError("We couldn't load the feed.");
    } finally {
      if (isInitial) setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (loadingPosts || posts.length === 0 || typeof window === "undefined") return;
    const hash = window.location.hash;
    const postId = hash.startsWith("#post-") ? decodeURIComponent(hash.slice(6)) : "";
    if (postId) document.getElementById("post-" + postId)?.scrollIntoView({ block: "center" });
  }, [loadingPosts, posts]);

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
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
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
        const uploadResult = await uploadFileToR2(selectedImageFile, "posts");
        finalR2ImageUrl = uploadResult.url || "";
      } catch (err) {
        console.warn("R2 upload error during post submission:", err);
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

    const previous = posts;
    const updated = posts.map((post) => {
      if (post.id !== postId) return post;
      const liked = post.liked_by.includes(userId);
      const likedBy = liked
        ? post.liked_by.filter((id) => id !== userId)
        : [...post.liked_by, userId];
      return { ...post, liked_by: likedBy, likes_count: likedBy.length };
    });
    setPosts(updated);

    try {
      const res = await fetch("/api/posts/" + postId + "/like", { method: "POST" });
      if (!res.ok) throw new Error("Couldn't update like.");
      const data = await res.json();
      setPosts((current) => current.map((post) =>
        post.id === postId ? { ...post, likes_count: data.result.likes_count } : post
      ));
    } catch (err) {
      setPosts(previous);
      setActionError(err instanceof Error ? err.message : "Couldn't update like. Try again.");
    }
  };

  const handleAddReply = async (
    postId: string,
    content: string,
    parentReplyId?: string,
    replyToUser?: string
  ): Promise<boolean> => {
    if (!isSignedIn) {
      onRequireAuth();
      return false;
    }

    if (!content.trim()) return false;

    const newReplyData = {
      post_id: postId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      user_initials: userName.substring(0, 2).toUpperCase(),
      content: content.trim(),
      parent_reply_id: parentReplyId,
      reply_to_user: replyToUser,
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
            const currentReplies = p.replies || [];
            return {
              ...p,
              replies: [...currentReplies, createdReply],
              replies_count: Math.max((p.replies_count || 0) + 1, currentReplies.length + 1),
            };
          }
          return p;
        });
        setPosts(updated);
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.error === "NO_PROFILE_CREATED") {
          setShowNoProfileModal(true);
        } else {
          alert(errData.message || errData.error || "Failed to add reply.");
        }
        return false;
      }
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteReply = async (postId: string, replyId: string): Promise<boolean> => {
    if (!isSignedIn) {
      onRequireAuth();
      return false;
    }
    if (!confirm("Are you sure you want to delete this reply?")) {
      return false;
    }
    try {
      const res = await fetch(`/api/posts/${postId}/replies?replyId=${encodeURIComponent(replyId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const current = p.replies || [];
              const filtered = current.filter(
                (r) => r.id !== replyId && r.parent_reply_id !== replyId
              );
              return {
                ...p,
                replies: filtered,
                replies_count: Math.max(0, (p.replies_count || current.length) - 1),
              };
            }
            return p;
          })
        );
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || errData.error || "Failed to delete reply.");
        return false;
      }
    } catch (err) {
      console.error("Failed to delete reply:", err);
      return false;
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete post");
        loadFeed();
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post. Please try again.");
      loadFeed();
    }
  };

  const [feedTab, setFeedTab] = useState<"for-you" | "latest" | "joined">("for-you");
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

      if (Array.isArray(userJoinedCommunities)) {
        setJoinedCommunities(userJoinedCommunities);
      } else {
        const savedCommunities = localStorage.getItem(`startupmap_communities_${userId}`);
        if (savedCommunities) {
          try {
            const parsed = JSON.parse(savedCommunities);
            if (Array.isArray(parsed)) setJoinedCommunities(parsed);
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

      
      {/* 1. FIXED STICKY TOP SECTION FOR DISCOVERY TABS */}
      <div ref={feedTopNavRef} className="feed-top-section-fixed">
        <div className="feed-top-action-bar">
          <div className="feed-nav-tabs twitter-nav-tabs">
            {/* INLINE FEED / MAP MODE TOGGLE ON FAR LEFT CORNER OF SECTION BAR (MOBILE ONLY) */}
            <div className="inline-section-mode-toggle mobile-only">
              <button
                type="button"
                className={`mode-toggle-btn ${mobileTab === "feed" ? "active" : ""}`}
                onClick={() => onToggleMobileTab?.("feed")}
                title="Feed View"
                aria-label="Feed View"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${mobileTab === "map" ? "active" : ""}`}
                onClick={() => onToggleMobileTab?.("map")}
                title="Map View"
                aria-label="Map View"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                  <line x1="9" y1="3" x2="9" y2="18" />
                  <line x1="15" y1="6" x2="15" y2="21" />
                </svg>
              </button>
            </div>

            {/* 1. FOR YOU / LATEST TAB (WITH SORTING DROPDOWN) */}
            <div className="nav-tab-dropdown-wrap">
              <button
                type="button"
                className={`feed-nav-tab twitter-tab ${feedTab === "for-you" || feedTab === "latest" ? "active" : ""}`}
                onClick={() => {
                  if (feedTab !== "for-you" && feedTab !== "latest") {
                    setFeedTab("for-you");
                  }
                  setShowForYouDropdown((prev) => !prev);
                  setShowJoinedDropdown(false);
                }}
              >
                <span className="tab-label-text">
                  <span>{feedTab === "latest" ? "Latest" : "For You"}</span>
                  <span
                    className={`feed-chevron-arrow ${showForYouDropdown ? "open" : ""}`}
                    title="Change Feed Sorting"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowForYouDropdown((prev) => !prev);
                      setShowJoinedDropdown(false);
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                  {(feedTab === "for-you" || feedTab === "latest") && <span className="twitter-tab-active-indicator" />}
                </span>
              </button>

              {showForYouDropdown && (
                <div className="tab-dropdown-menu compact">
                  <button
                    type="button"
                    className={`dropdown-item ${feedTab === "for-you" ? "selected" : ""}`}
                    onClick={() => {
                      setFeedTab("for-you");
                      setShowForYouDropdown(false);
                    }}
                  >
                    <span>For You</span>
                    {feedTab === "for-you" && <span className="dropdown-selection-state">Selected</span>}
                  </button>

                  <button
                    type="button"
                    className={`dropdown-item ${feedTab === "latest" ? "selected" : ""}`}
                    onClick={() => {
                      setFeedTab("latest");
                      setShowForYouDropdown(false);
                    }}
                  >
                    <span>Latest</span>
                    {feedTab === "latest" && <span className="dropdown-selection-state">Selected</span>}
                  </button>
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
                }}
              >
                <span className="tab-label-text">
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
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                        {joinedList.length > 0 && (
                          joinedList.map((c) => {
                            const formattedName = c.name.startsWith("/") ? c.name : `/${c.name}`;
                            return (
                              <div
                                key={c.id}
                                className="dropdown-community-row"
                                onClick={() => {
                                  setSelectedCommunityId(c.id);
                                  setFeedTab("joined");
                                  setShowJoinedDropdown(false);
                                }}
                              >
                                <div className="community-info">
                                  <b>{formattedName}</b>
                                </div>
                                <button
                                  type="button"
                                  className="join-toggle-btn joined"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleJoinCommunity(c.id);
                                  }}
                                >
                                  Joined
                                </button>
                              </div>
                            );
                          })
                        )}

                        {unjoinedList.length > 0 && (
                          <>
                            {joinedList.length > 0 && <div className="dropdown-title">Explore More</div>}
                            {unjoinedList.map((c) => {
                              const formattedName = c.name.startsWith("/") ? c.name : `/${c.name}`;
                              return (
                                <div
                                  key={c.id}
                                  className="dropdown-community-row"
                                  onClick={() => {
                                    setSelectedCommunityId(c.id);
                                    setFeedTab("joined");
                                    setShowJoinedDropdown(false);
                                  }}
                                >
                                  <div className="community-info">
                                    <b>{formattedName}</b>
                                  </div>
                                  <button
                                    type="button"
                                    className="join-toggle-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleJoinCommunity(c.id);
                                    }}
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
          </div>

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
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STREAM COMPOSER (INLINE STREAM CARD MATCHING THREADS DESKTOP) */}
      {showCreateBox ? (
        <form onSubmit={handleCreatePost} className="create-post-composer">
          <div className="composer-row">
            <div className="composer-avatar" style={{ background: userProfileListing?.color || "#f85900", borderRadius: "50%" }}>
              {userProfileListing?.logo_url ? (
                <img src={userProfileListing.logo_url} alt={userProfileListing.name} />
              ) : userProfileListing?.initials ? (
                <span>{userProfileListing.initials}</span>
              ) : userAvatar ? (
                <img src={userAvatar} alt={userName} />
              ) : (
                <span>{(userName || "FO").substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="composer-body">
              <div className="composer-header-title">
                <span className="post-at-text">Posting to</span>
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

              <textarea
                required
                autoFocus
                rows={3}
                maxLength={500}
                aria-label="Write your post"
                placeholder="What's happening in your startup journey?"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="composer-textarea"
              />

              {imagePreviewUrl && (
                <div className="composer-image-preview-wrap">
                  <img src={imagePreviewUrl} alt="Attachment" className="composer-image-preview" />
                  <button type="button" className="remove-composer-img-btn" onClick={handleRemoveImage}>
                    ✕
                  </button>
                </div>
              )}

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
                    aria-label={imagePreviewUrl ? "Change attached photo" : "Add a photo"}
                  >
                    <span className="composer-photo-label">Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="composer-file-input"
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
      ) : (
        <div
          className="stream-composer-collapsed threads-composer-bar"
          onClick={() => {
            if (!isSignedIn) {
              onRequireAuth();
            } else {
              setShowCreateBox(true);
            }
          }}
        >
          <div className="stream-composer-avatar" style={{ background: userProfileListing?.color || "#f85900", borderRadius: "50%" }}>
            {userProfileListing?.logo_url ? (
              <img src={userProfileListing.logo_url} alt={userProfileListing.name} />
            ) : userProfileListing?.initials ? (
              <span>{userProfileListing.initials}</span>
            ) : userAvatar ? (
              <img src={userAvatar} alt={userName} />
            ) : (
              <span>{(userName || "FO").substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="stream-composer-input-pill">
            <span>What&apos;s happening in your startup journey?</span>
          </div>
          <button
            type="button"
            className="stream-composer-post-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSignedIn) {
                onRequireAuth();
              } else {
                setShowCreateBox(true);
              }
            }}
          >
            Post
          </button>
        </div>
      )}


      {/* POSTS FEED */}
      <div className="posts-feed">
        {loadingPosts ? (
          <CommunityFeedSkeleton count={3} />
        ) : feedError ? (
          <EmptyFeedState
            title="Feed unavailable"
            description={feedError}
            actionLabel="Retry"
            onAction={() => loadFeed(true)}
          />
        ) : filteredPosts.length === 0 ? (
          <EmptyFeedState
            title={
              selectedCommunityId !== "all"
                ? `No posts in /${selectedCommunityId}`
                : feedTab === "joined"
                ? "No posts from your joined communities"
                : "No posts in this feed yet"
            }
            description={
              selectedCommunityId !== "all"
                ? `Be the first to share news, announcements, or thoughts in /${selectedCommunityId}.`
                : feedTab === "joined" && joinedCommunities.length === 0
                ? "You haven't joined any communities yet. Join communities or start posting to build your feed."
                : "Be the first to share a post, ask a question, or introduce your startup with the community."
            }
            actionLabel="Create a post"
            onAction={() => {
              if (!isSignedIn) {
                onRequireAuth();
              } else {
                setShowCreateBox(true);
              }
            }}
            secondaryActionLabel={
              selectedCommunityId !== "all" || feedTab !== "for-you"
                ? "View For You Feed"
                : undefined
            }
            onSecondaryAction={
              selectedCommunityId !== "all" || feedTab !== "for-you"
                ? () => {
                    setSelectedCommunityId("all");
                    setFeedTab("for-you");
                  }
                : undefined
            }
          />
        ) : (
          filteredPosts.map((post) => {
            const isLiked = post.liked_by.includes(userId);
            const isReplying = activeReplyPostId === post.id;
            const isReposted = post.reposted_by.includes(userId);

            const authorHandle = (
              post.user_name.startsWith("p/") || post.user_name.startsWith("s/")
                ? post.user_name
                : post.user_name.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/(^_|-$)/g, "")
            );
            const categoryName = post.community_name.startsWith("/")
              ? post.community_name.slice(1)
              : post.community_name;

            const timeAgoText = formatTimeAgo(post.created_at);

            return (
              <div id={"post-" + post.id} key={post.id} className="tweet-card threads-post-card">
                {/* TOP ROW: AVATAR LEFT + MAIN CONTENT RIGHT */}
                <div className="post-card-top-row">
                  {/* LEFT: AVATAR */}
                  <div className="post-avatar-col">
                    <div className="post-avatar-wrapper">
                      {post.user_avatar ? (
                        <img src={post.user_avatar} alt={post.user_name} className="post-avatar-img" />
                      ) : (
                        <div className="post-avatar-initials">{post.user_initials}</div>
                      )}
                    </div>
                    {isReplying && <div className="main-post-thread-line" title="Thread connection line" />}
                  </div>

                  {/* RIGHT: ALL CONTENT */}
                  <div className="post-main-col">
                    {/* HEADER BLOCK */}
                    <div className="post-header-block">
                      <div className="post-header-lines">
                        <div className="post-header-line1">
                          <button
                            type="button"
                            className="author-handle-btn"
                            onClick={() => onSelectAuthorHandle?.(authorHandle)}
                          >
                            {authorHandle}
                          </button>
                          <span className="post-header-chevron" aria-hidden="true">{"\u203a"}</span>
                          <span className="post-category-tag">{categoryName}</span>
                          <span className="post-timestamp-inline">{timeAgoText}</span>
                        </div>
                      </div>
                      {userId && post.user_id === userId ? (
                        <button
                          type="button"
                          className="post-delete-btn"
                          title="Delete post"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="post-more-btn"
                          title="Options"
                          onClick={() => {
                            if (!isSignedIn) {
                              onRequireAuth();
                            } else {
                              alert("Thank you for reporting. Our moderation team will review this post within 24 hours.");
                            }
                          }}
                        >
                          <MoreHorizontalIcon size={18} />
                        </button>
                      )}
                    </div>

                    {/* POST COPY */}
                    <p className="post-text-body">{post.content}</p>

                    {/* MEDIA */}
                    {post.image_url && (
                      <div className="post-media-container">
                        <img src={post.image_url} alt="Attachment" className="post-media-image" />
                      </div>
                    )}

                    {/* ACTION BAR */}
                    <div className="post-actions-bar">
                      <button
                        type="button"
                        className={`post-action-btn like-action ${isLiked ? "liked" : ""}`}
                        onClick={() => handleToggleLike(post.id)}
                        title="Like"
                        aria-label="Like"
                      >
                        <svg viewBox="0 0 24 24" className="action-icon" fill={isLiked ? "#ef4444" : "none"} stroke={isLiked ? "#ef4444" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {post.likes_count > 0 && <span className="action-count">{post.likes_count}</span>}
                      </button>

                      <button
                        type="button"
                        className={`post-action-btn comment-action ${isReplying ? "active" : ""}`}
                        onClick={() => setActiveReplyPostId(isReplying ? null : post.id)}
                        title="Comment"
                        aria-label="Comment"
                      >
                        <svg viewBox="0 0 24 24" className="action-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        {Math.max(post.replies_count || 0, post.replies?.length || 0) > 0 && (
                          <span className="action-count">{Math.max(post.replies_count || 0, post.replies?.length || 0)}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`post-action-btn repost-action ${isReposted ? "reposted" : ""}`}
                        onClick={() => handleToggleRepost(post)}
                        title={isReposted ? "Undo repost" : "Repost"}
                        aria-label={isReposted ? "Undo repost" : "Repost"}
                        style={{ color: isReposted ? "#10b981" : "inherit" }}
                      >
                        <RepostIcon size={19} className="action-icon" />
                        {post.reposts_count > 0 && <span className="action-count">{post.reposts_count}</span>}
                      </button>

                      <button
                        type="button"
                        className="post-action-btn share-action"
                        onClick={() => handleSharePost(post)}
                        title="Share post"
                        aria-label="Share post"
                      >
                        <ShareSendIcon size={19} className="action-icon" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* REPLIES SECTION (PRIMARY REPLIES ALIGNED WITH POST AVATAR COLUMN!) */}
                {isReplying && (
                  <RedditThreadReplies
                    post={post}
                    isSignedIn={isSignedIn}
                    userId={userId}
                    userName={userName}
                    userAvatar={userAvatar}
                    userProfileListing={userProfileListing}
                    onRequireAuth={onRequireAuth}
                    onShowNoProfileModal={() => setShowNoProfileModal(true)}
                    onSelectAuthorHandle={onSelectAuthorHandle}
                    onAddReply={handleAddReply}
                    onDeleteReply={handleDeleteReply}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* NO PROFILE REQUIRED MODAL */}
      {showNoProfileModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px 24px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
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
                style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#f85900", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
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
