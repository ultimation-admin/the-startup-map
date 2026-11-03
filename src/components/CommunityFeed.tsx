"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Community,
  CommunityPost,
  Listing,
} from "@/lib/db";
import { ECOSYSTEM_COMMUNITIES } from "@/lib/db";
import { rankCommunityFeed } from "@/lib/feedAlgorithm";
import type { FeedTabMode } from "@/lib/feedAlgorithm";
import {
  RepostIcon,
  ShareSendIcon,
  MoreHorizontalIcon,
} from "./Icons";
import { CommunityFeedSkeleton } from "./Skeletons";
import { EmptyFeedState } from "./EmptyFeedState";

import { RedditThreadReplies } from "./RedditThreadReplies";
import { uploadFileToR2 } from "@/lib/uploadClient";

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new globalThis.Map(items.map((item) => [item.id, item])).values());
}

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
  userName?: string;
  userAvatar?: string;
  isSignedIn: boolean;
  userInterests?: string[];
  userJoinedCommunities?: string[];
  onRequireAuth: () => void;
  onOpenAddListing?: () => void;
  onSelectAuthorHandle?: (handle: string) => void;
  initialFeedTab?: FeedTabMode;
  showFeedModeSelector?: boolean;
}

export function CommunityFeed({
  userId,
  userName = "",
  userAvatar,
  isSignedIn,
  userInterests,
  userJoinedCommunities,
  onRequireAuth,
  onOpenAddListing,
  onSelectAuthorHandle,
  initialFeedTab = "for-you",
  showFeedModeSelector = true,
}: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>(ECOSYSTEM_COMMUNITIES);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("all");
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
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
  const [newPostCommunity, setNewPostCommunity] = useState(ECOSYSTEM_COMMUNITIES[0]?.id || "");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const imagePreviewUrlRef = useRef<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Reply state: active post ID being replied to
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [loadedRepliesPostIds, setLoadedRepliesPostIds] = useState<Set<string>>(() => new Set());
  const [replyPageCursors, setReplyPageCursors] = useState<Record<string, string | null>>({});
  const [replyHasMore, setReplyHasMore] = useState<Record<string, boolean>>({});
  const [loadingReplyPostIds, setLoadingReplyPostIds] = useState<Set<string>>(() => new Set());
  const [replyLoadErrors, setReplyLoadErrors] = useState<Record<string, string>>({});
  const replyRequestsRef = useRef(new Set<string>());

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
      setUserProfileListing(null);
      const controller = new AbortController();
      fetch(`/api/listings?owner_id=${encodeURIComponent(userId)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("Profile could not be loaded.");
          return res.json();
        })
        .then((data) => {
          const listings: Listing[] = Array.isArray(data) ? data : (data.listings || []);
          if (listings.length > 0) {
            setUserProfileListing(listings[0]);
          }
        })
        .catch((err) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) console.error("Failed to load profile listing for composer:", err);
        });
      return () => controller.abort();
    }
  }, [isSignedIn, userId]);

  useEffect(() => () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
  }, []);

  const loadFeed = useCallback(async (isInitial = false, signal?: AbortSignal) => {
    if (isInitial) setLoadingPosts(true);
    setFeedError(null);
    try {
      const params = new URLSearchParams({ limit: initialFeedTab === "trending" ? "50" : "20" });
      if (selectedCommunityId !== "all") params.set("community_id", selectedCommunityId);
      const url = `/api/posts?${params.toString()}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error("Feed could not be loaded.");
      const data = await res.json();
      const active = Array.isArray(data) ? data : (data.posts || []);
      if (signal?.aborted) return;
      setPosts((current) => {
        const currentById = new Map(current.map((post) => [post.id, post]));
        return uniqueById(active.map((post: CommunityPost) => ({
          ...post,
          replies: currentById.get(post.id)?.replies || [],
        })));
      });
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      console.error(err);
      setFeedError("We couldn't load the feed.");
    } finally {
      if (isInitial && !signal?.aborted) setLoadingPosts(false);
    }
  }, [initialFeedTab, selectedCommunityId]);

  useEffect(() => {
    if (loadingPosts || posts.length === 0 || typeof window === "undefined") return;
    const hash = window.location.hash;
    const postId = hash.startsWith("#post-") ? decodeURIComponent(hash.slice(6)) : "";
    if (postId) document.getElementById("post-" + postId)?.scrollIntoView({ block: "center" });
  }, [loadingPosts, posts]);

  useEffect(() => {
    const controller = new AbortController();
    void loadFeed(true, controller.signal);
    let lastRefresh = Date.now();
    const refreshWhenActive = () => {
      if (document.hidden || Date.now() - lastRefresh < 30000) return;
      lastRefresh = Date.now();
      void loadFeed(false, controller.signal);
    };
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);

    return () => {
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
      controller.abort();
    };
  }, [loadFeed]);

  const loadPostReplies = async (postId: string, cursor?: string | null) => {
    if (replyRequestsRef.current.has(postId)) return;
    replyRequestsRef.current.add(postId);
    setLoadingReplyPostIds((current) => new Set(current).add(postId));
    setReplyLoadErrors((current) => ({ ...current, [postId]: "" }));
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/replies?${params.toString()}`);
      if (!response.ok) throw new Error("Replies could not be loaded.");
      const data = await response.json();
      const incomingReplies = Array.isArray(data.replies) ? data.replies : [];
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, replies: uniqueById(cursor ? [...(post.replies || []), ...incomingReplies] : incomingReplies) }
        : post));
      setReplyLoadErrors((current) => ({ ...current, [postId]: "" }));
      setLoadedRepliesPostIds((current) => new Set(current).add(postId));
      setReplyPageCursors((current) => ({ ...current, [postId]: data.next_cursor || null }));
      setReplyHasMore((current) => ({ ...current, [postId]: Boolean(data.has_more) }));
    } catch (error) {
      console.error("Failed to load post replies:", error);
      setReplyLoadErrors((current) => ({ ...current, [postId]: "Replies could not be loaded. Try again." }));
    } finally {
      replyRequestsRef.current.delete(postId);
      setLoadingReplyPostIds((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleToggleReplySection = (postId: string, isOpen: boolean) => {
    if (isOpen) {
      setActiveReplyPostId(null);
      return;
    }
    setActiveReplyPostId(postId);
    if (!loadedRepliesPostIds.has(postId)) void loadPostReplies(postId);
  };

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

  const handleDropdownKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const menuItems = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role^='menuitem']:not(:disabled)"));
    if (!menuItems.length) return;
    event.preventDefault();
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
    const targetIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? menuItems.length - 1
        : currentIndex < 0
          ? 0
          : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + menuItems.length) % menuItems.length;
    menuItems[targetIndex]?.focus();
  };

  // Local File Selection Handler (Zero network calls while editing/changing)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type.toLowerCase())) {
      setActionError("Choose a JPEG, PNG, WebP, or GIF image.");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setActionError("Choose an image smaller than 10 MB.");
      e.target.value = "";
      return;
    }

    setActionError(null);
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    imagePreviewUrlRef.current = previewUrl;
    setImagePreviewUrl(previewUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    imagePreviewUrlRef.current = null;
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    if (!newPostText.trim()) {
      setActionError("Write something before posting.");
      return;
    }

    setActionError(null);
    setIsUploadingImage(true);
    let finalR2ImageUrl = "";

    // Upload file to R2 ONLY upon post submission
    if (selectedImageFile) {
      try {
        const uploadResult = await uploadFileToR2(selectedImageFile, "posts");
        finalR2ImageUrl = uploadResult.url || "";
      } catch (err) {
        console.warn("R2 upload error during post submission:", err);
        setActionError(err instanceof Error ? err.message : "Image upload failed. Please try again.");
        setIsUploadingImage(false);
        return;
      }
    } else if (imagePreviewUrl && !imagePreviewUrl.startsWith("data:")) {
      finalR2ImageUrl = imagePreviewUrl;
    }

    const targetCommunity = communities.find((c) => c.id === newPostCommunity) || ECOSYSTEM_COMMUNITIES.find((c) => c.id === newPostCommunity);

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
        setPosts((current) => uniqueById([data.post || data, ...current]));
        setNewPostText("");
        setSelectedImageFile(null);
        handleRemoveImage();
        setShowCreateBox(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "NO_PROFILE_CREATED") {
          setShowNoProfileModal(true);
        } else {
          setActionError(errData.message || errData.error || "Failed to create post.");
        }
      }
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to create post.");
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
      return {
        ...post,
        liked_by: likedBy,
        likes_count: Math.max(0, post.likes_count + (liked ? -1 : 1)),
      };
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
        setPosts((current) => current.map((p) => {
          if (p.id === postId) {
            const currentReplies = p.replies || [];
            const nextReplies = uniqueById([...currentReplies, createdReply]);
            return {
              ...p,
              replies: nextReplies,
              replies_count: Math.max((p.replies_count || 0) + 1, nextReplies.length),
            };
          }
          return p;
        }));
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.error === "NO_PROFILE_CREATED") {
          setShowNoProfileModal(true);
        } else {
          setActionError(errData.message || errData.error || "Failed to add reply.");
        }
        return false;
      }
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to add reply.");
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
              const removedIds = new Set([replyId]);
              const childrenByParent = new Map<string, string[]>();
              for (const reply of current) {
                if (!reply.parent_reply_id) continue;
                const children = childrenByParent.get(reply.parent_reply_id) || [];
                children.push(reply.id);
                childrenByParent.set(reply.parent_reply_id, children);
              }
              const pending = [replyId];
              while (pending.length) {
                const parentId = pending.pop()!;
                for (const childId of childrenByParent.get(parentId) || []) {
                  if (removedIds.has(childId)) continue;
                  removedIds.add(childId);
                  pending.push(childId);
                }
              }
              const filtered = current.filter((reply) => !removedIds.has(reply.id));
              return {
                ...p,
                replies: filtered,
                replies_count: Math.max(0, (p.replies_count || current.length) - removedIds.size),
              };
            }
            return p;
          })
        );
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionError(errData.message || errData.error || "Failed to delete reply.");
        return false;
      }
    } catch (err) {
      console.error("Failed to delete reply:", err);
      setActionError(err instanceof Error ? err.message : "Failed to delete reply.");
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
        setActionError(data.error || "Failed to delete post.");
        loadFeed();
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      setActionError("Failed to delete post. Please try again.");
      loadFeed();
    }
  };

  const [feedTab, setFeedTab] = useState<FeedTabMode>(initialFeedTab);
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
      document.addEventListener("pointerdown", handleClickOutside);
    }
    return () => {
      if (typeof window !== "undefined") {
        document.removeEventListener("pointerdown", handleClickOutside);
      }
    };
  }, []);

  useEffect(() => {
    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowForYouDropdown(false);
      setShowJoinedDropdown(false);
    };
    document.addEventListener("keydown", closeMenusOnEscape);
    return () => document.removeEventListener("keydown", closeMenusOnEscape);
  }, []);

  const userInterestsKey = JSON.stringify(userInterests ?? null);
  const userJoinedCommunitiesKey = JSON.stringify(userJoinedCommunities ?? null);

  // Sync setup info (interests & joined communities) from localStorage / props
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      setJoinedCommunities([]);
      const propInterests = JSON.parse(userInterestsKey) as string[] | null;
      const propJoinedCommunities = JSON.parse(userJoinedCommunitiesKey) as string[] | null;
      if (propInterests && propInterests.length > 0) {
        setSelectedInterests(propInterests);
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

      if (Array.isArray(propJoinedCommunities)) {
        setJoinedCommunities(propJoinedCommunities);
      } else {
        const savedCommunities = localStorage.getItem(`startupmap_communities_${userId}`);
        if (savedCommunities) {
          try {
            const parsed = JSON.parse(savedCommunities);
            if (Array.isArray(parsed)) setJoinedCommunities(parsed);
          } catch {}
        }
      }
    } else {
      setJoinedCommunities([]);
      setSelectedInterests([]);
    }
  }, [userId, userInterestsKey, userJoinedCommunitiesKey]);

  const filteredPosts = useMemo(() => {
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
  }, [feedTab, joinedCommunities, posts, selectedCommunityId, selectedInterests, userId, userProfileListing?.city, userProfileListing?.sector]);

  return (
    <div className="community-feed-wrapper">
      {initialFeedTab === "trending" && (
        <header className="feed-section-heading">
          <p className="eyebrow">WHAT THE COMMUNITY IS TALKING ABOUT</p>
          <h1>Trending</h1>
          <p>Popular conversations across the startup community.</p>
        </header>
      )}
      
      {/* 1. FIXED STICKY TOP SECTION FOR DISCOVERY TABS */}
      <div ref={feedTopNavRef} className="feed-top-section-fixed">
        <div className="feed-top-action-bar">
          <div className="feed-nav-tabs twitter-nav-tabs">
            {/* 1. FOR YOU / LATEST TAB (WITH SORTING DROPDOWN) */}
            {showFeedModeSelector && <>
            <div className="nav-tab-dropdown-wrap">
              <button
                type="button"
                className={`feed-nav-tab twitter-tab ${feedTab === "for-you" || feedTab === "latest" ? "active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={showForYouDropdown}
                aria-controls="feed-sort-menu"
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
                    aria-hidden="true"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                  {(feedTab === "for-you" || feedTab === "latest") && <span className="twitter-tab-active-indicator" />}
                </span>
              </button>

              {showForYouDropdown && (
                <div id="feed-sort-menu" className="tab-dropdown-menu compact" role="menu" aria-label="Feed order" onKeyDown={handleDropdownKeyDown}>
                  <button
                    type="button"
                    className={`dropdown-item ${feedTab === "for-you" ? "selected" : ""}`}
                    role="menuitemradio"
                    aria-checked={feedTab === "for-you"}
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
                    role="menuitemradio"
                    aria-checked={feedTab === "latest"}
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
                aria-haspopup="menu"
                aria-expanded={showJoinedDropdown}
                aria-controls="joined-community-menu"
                onClick={() => {
                  setFeedTab("joined");
                  setShowForYouDropdown(false);
                  setShowJoinedDropdown((open) => !open);
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
                    aria-hidden="true"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                  {feedTab === "joined" && <span className="twitter-tab-active-indicator" />}
                </span>
              </button>

              {showJoinedDropdown && (
                <div id="joined-community-menu" className="tab-dropdown-menu" role="menu" aria-label="Communities" onKeyDown={handleDropdownKeyDown}>
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
                              <div key={c.id} className="dropdown-community-row">
                                <button type="button" className="community-info" role="menuitem" onClick={() => {
                                  setSelectedCommunityId(c.id);
                                  setFeedTab("joined");
                                  setShowJoinedDropdown(false);
                                }}>
                                  <b>{formattedName}</b>
                                </button>
                                <button
                                  type="button"
                                  className="join-toggle-btn joined"
                                  role="menuitemcheckbox"
                                  aria-checked="true"
                                  onClick={() => toggleJoinCommunity(c.id)}
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
                                <div key={c.id} className="dropdown-community-row">
                                  <button type="button" className="community-info" role="menuitem" onClick={() => {
                                    setSelectedCommunityId(c.id);
                                    setFeedTab("joined");
                                    setShowJoinedDropdown(false);
                                  }}>
                                    <b>{formattedName}</b>
                                  </button>
                                  <button
                                    type="button"
                                    className="join-toggle-btn"
                                    role="menuitemcheckbox"
                                    aria-checked="false"
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
            </>}
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

      {(actionError || shareFeedback) && (
        <div className={`feed-action-feedback ${actionError ? "is-error" : ""}`} role={actionError ? "alert" : "status"}>
          <span>{actionError || shareFeedback}</span>
          {actionError && <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss message">Dismiss</button>}
        </div>
      )}

      {/* 2. STREAM COMPOSER (INLINE STREAM CARD MATCHING THREADS DESKTOP) */}
      {showCreateBox ? (
        <form onSubmit={handleCreatePost} className="create-post-composer">
          <div className="composer-row">
            <div className="composer-avatar" style={{ background: userProfileListing?.color || "#000000", borderRadius: "50%" }}>
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
                disabled={isUploadingImage}
                aria-label="Write your post"
                placeholder="What's happening in your startup journey?"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="composer-textarea"
              />

              {imagePreviewUrl && (
                <div className="composer-image-preview-wrap">
                  <img src={imagePreviewUrl} alt="Attachment" className="composer-image-preview" />
                  <button type="button" className="remove-composer-img-btn" disabled={isUploadingImage} onClick={handleRemoveImage}>
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
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={isUploadingImage}
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
                    disabled={isUploadingImage}
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
          <div className="stream-composer-avatar" style={{ background: userProfileListing?.color || "#000000", borderRadius: "50%" }}>
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
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                        <svg viewBox="0 0 24 24" className="action-icon" fill={isLiked ? "#000000" : "none"} stroke={isLiked ? "#000000" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {post.likes_count > 0 && <span className="action-count">{post.likes_count}</span>}
                      </button>

                      <button
                        type="button"
                        className={`post-action-btn comment-action ${isReplying ? "active" : ""}`}
                        onClick={() => handleToggleReplySection(post.id, isReplying)}
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
                        style={{ color: isReposted ? "#757575" : "inherit" }}
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
                    onSelectAuthorHandle={onSelectAuthorHandle}
                    onAddReply={handleAddReply}
                    onDeleteReply={handleDeleteReply}
                    isLoadingReplies={loadingReplyPostIds.has(post.id)}
                    replyLoadError={replyLoadErrors[post.id]}
                    onRetryLoadReplies={() => void loadPostReplies(post.id, replyPageCursors[post.id])}
                    hasMoreReplies={Boolean(replyHasMore[post.id])}
                    onLoadMoreReplies={() => void loadPostReplies(post.id, replyPageCursors[post.id])}
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
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#000000" }}>Map Profile Required</h3>
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
                style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#000000", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
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
