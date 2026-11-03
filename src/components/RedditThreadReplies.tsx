"use client";

import React, { useMemo, useState } from "react";
import type { CommunityPost, PostReply, Listing } from "@/lib/db";
import { ShareSendIcon } from "./Icons";

const EMPTY_REPLIES: PostReply[] = [];

function formatReplyTimeAgo(dateString?: string): string {
  if (!dateString) return "1h";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "1h";
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${Math.max(1, diffSecs)}s`;
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  } catch {
    return "1h";
  }
}

interface RedditThreadRepliesProps {
  post: CommunityPost;
  isSignedIn: boolean;
  userId: string;
  userName: string;
  userAvatar?: string;
  userProfileListing?: Listing | null;
  onRequireAuth: () => void;
  onSelectAuthorHandle?: (handle: string) => void;
  onAddReply: (postId: string, content: string, parentReplyId?: string, replyToUser?: string) => Promise<boolean>;
  onDeleteReply?: (postId: string, replyId: string) => Promise<boolean>;
  isLoadingReplies?: boolean;
  replyLoadError?: string;
  onRetryLoadReplies?: () => void;
  hasMoreReplies?: boolean;
  onLoadMoreReplies?: () => void;
}

export function RedditThreadReplies({
  post,
  isSignedIn,
  userId,
  userName,
  userAvatar,
  userProfileListing,
  onRequireAuth,
  onSelectAuthorHandle,
  onAddReply,
  onDeleteReply,
  isLoadingReplies = false,
  replyLoadError,
  onRetryLoadReplies,
  hasMoreReplies = false,
  onLoadMoreReplies,
}: RedditThreadRepliesProps) {
  const [mainReplyText, setMainReplyText] = useState("");
  const [isSubmittingMain, setIsSubmittingMain] = useState(false);
  const [activeSubReplyId, setActiveSubReplyId] = useState<string | null>(null);
  const [subReplyText, setSubReplyText] = useState("");
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Collapse state for thread branches
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  // Local upvotes tracking
  const [replyUpvotes, setReplyUpvotes] = useState<Record<string, { count: number; upvoted: boolean }>>({});
  const [pendingReplyLikes, setPendingReplyLikes] = useState<Set<string>>(() => new Set());
  const [replyActionError, setReplyActionError] = useState<string | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleUpvote = async (reply: PostReply) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    if (pendingReplyLikes.has(reply.id)) return;
    const previous = replyUpvotes[reply.id] || {
      count: reply.upvotes_count ?? 0,
      upvoted: Boolean(reply.viewer_liked),
    };
    const optimistic = { count: Math.max(0, previous.count + (previous.upvoted ? -1 : 1)), upvoted: !previous.upvoted };
    setReplyUpvotes((current) => ({ ...current, [reply.id]: optimistic }));
    setPendingReplyLikes((current) => new Set(current).add(reply.id));
    setReplyActionError(null);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/replies/${encodeURIComponent(reply.id)}/like`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Reply like could not be updated.");
      setReplyUpvotes((current) => ({
        ...current,
        [reply.id]: { count: data.result.likes_count, upvoted: data.result.liked },
      }));
    } catch (error) {
      setReplyUpvotes((current) => ({ ...current, [reply.id]: previous }));
      setReplyActionError(error instanceof Error ? error.message : "Reply like could not be updated.");
    } finally {
      setPendingReplyLikes((current) => {
        const next = new Set(current);
        next.delete(reply.id);
        return next;
      });
    }
  };

  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const handleShareReply = async (text: string) => {
    const permalink = new URL(window.location.href);
    permalink.hash = `post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.user_name, text, url: permalink.toString() });
      } else {
        await navigator.clipboard.writeText(permalink.toString());
        setShareMessage("Post link copied.");
        window.setTimeout(() => setShareMessage(null), 2500);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setReplyActionError("Could not share this reply.");
    }
  };

  const { effectiveReplies, primaryReplies, childrenByParent } = useMemo(() => {
    const uniqueReplies = Array.from(new Map((post.replies ?? EMPTY_REPLIES).map((reply) => [reply.id, reply])).values());
    const replyIds = new Set(uniqueReplies.map((reply) => reply.id));
    const childrenByParent = new Map<string, PostReply[]>();
    const primaryReplies: PostReply[] = [];

    for (const reply of uniqueReplies) {
      const parentId = String(reply.parent_reply_id || "").trim();
      if (!parentId || parentId === "null" || parentId === "undefined" || !replyIds.has(parentId) || parentId === reply.id) {
        primaryReplies.push(reply);
        continue;
      }
      const children = childrenByParent.get(parentId) || [];
      children.push(reply);
      childrenByParent.set(parentId, children);
    }

    // Break corrupt cycles into visible roots so no reply disappears or recurses forever.
    const visited = new Set<string>();
    const visitFrom = (start: PostReply) => {
      const stack = [start.id];
      while (stack.length) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        for (const child of childrenByParent.get(currentId) || []) stack.push(child.id);
      }
    };
    primaryReplies.forEach(visitFrom);
    for (const reply of uniqueReplies) {
      if (!visited.has(reply.id)) {
        primaryReplies.push(reply);
        visitFrom(reply);
      }
    }
    return { effectiveReplies: uniqueReplies, primaryReplies, childrenByParent };
  }, [post.replies]);

  // Compute active user display handle
  const activeUserHandle = userProfileListing
    ? (userProfileListing.type === "person" ||
       userProfileListing.type?.toLowerCase().includes("person") ||
       userProfileListing.type?.toLowerCase().includes("people")
        ? `p/${userProfileListing.slug || userProfileListing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
        : `s/${userProfileListing.slug || userProfileListing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
    : (userName.startsWith("p/") || userName.startsWith("s/")
        ? userName
        : `p/${userName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "founder"}`);

  const getDirectChildren = (parentId: string) => childrenByParent.get(parentId) || [];

  const handleCreateTopLevelReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    if (!mainReplyText.trim()) return;

    setIsSubmittingMain(true);
    try {
      const ok = await onAddReply(post.id, mainReplyText.trim());
      if (ok) {
        setMainReplyText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingMain(false);
    }
  };

  const handleCreateSubReply = async (parentReply: PostReply) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    if (!subReplyText.trim()) return;

    setIsSubmittingSub(true);
    try {
      const ok = await onAddReply(post.id, subReplyText.trim(), parentReply.id, parentReply.user_name);
      if (ok) {
        setActiveSubReplyId(null);
        setSubReplyText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  // Render Secondary Reply Node (Nested under a Primary Reply or another Secondary Reply)
  const renderSecondaryReply = (reply: PostReply, depth = 1, ancestors = new Set<string>()) => {
    const isOP =
      reply.user_name.toLowerCase() === post.user_name.toLowerCase() ||
      reply.user_id === post.user_id;

    const isCollapsed = collapsedIds.includes(reply.id);
    const nextAncestors = new Set(ancestors).add(reply.id);
    const childReplies = getDirectChildren(reply.id).filter((child) => !nextAncestors.has(child.id));

    const upvoteInfo = replyUpvotes[reply.id] || {
      count: reply.upvotes_count ?? 0,
      upvoted: Boolean(reply.viewer_liked),
    };

    const isStartup = reply.user_name.startsWith("s/");
    const formattedHandle = reply.user_name;
    const isAuthor = Boolean(isSignedIn && userId && reply.user_id === userId);

    return (
      <div key={reply.id} className={`secondary-reply-node depth-${depth} ${isCollapsed ? "collapsed" : ""}`}>
        {/* LEFT THREAD CONNECTOR & SECONDARY AVATAR */}
        <div className="secondary-reply-left">
          <div
            className="secondary-reply-avatar"
            style={{
              background: isOP ? "#000000" : isStartup ? "#757575" : "#757575",
            }}
          >
            {reply.user_avatar ? (
              <img src={reply.user_avatar} alt={reply.user_name} />
            ) : (
              <span>{reply.user_initials}</span>
            )}
          </div>
          {childReplies.length > 0 && (
            <div className="secondary-thread-line" aria-hidden="true" />
          )}
        </div>

        {/* SECONDARY REPLY CONTENT */}
        <div className="secondary-reply-right">
          <div className="secondary-reply-header">
            <button
              type="button"
              className="reddit-comment-author"
              onClick={() => onSelectAuthorHandle?.(formattedHandle)}
            >
              {formattedHandle}
            </button>

            {isOP && <span className="reddit-author-badge">• Author</span>}

            <span className="post-dot-sep" aria-hidden="true">·</span>
            <span className="reddit-comment-time">{formatReplyTimeAgo(reply.created_at)}</span>
            {childReplies.length > 0 && (
              <button
                type="button"
                className="reddit-collapse-btn"
                onClick={() => toggleCollapse(reply.id)}
              >
                {isCollapsed ? `Show ${childReplies.length} replies` : "Hide thread"}
              </button>
            )}
          </div>

          {!isCollapsed && (
            <>
              <div className="secondary-reply-body">
                {reply.reply_to_user && (
                  <span className="reply-mention-tag">@{reply.reply_to_user} </span>
                )}
                {reply.content}
              </div>

              <div className="reddit-comment-actions">
                <button
                  type="button"
                  className={`reddit-action-btn like-action ${upvoteInfo.upvoted ? "liked" : ""}`}
                  disabled={pendingReplyLikes.has(reply.id)}
                  aria-pressed={upvoteInfo.upvoted}
                  onClick={() => void handleToggleUpvote(reply)}
                  title="Like"
                  aria-label="Like"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={upvoteInfo.upvoted ? "#F85900" : "none"} stroke={upvoteInfo.upvoted ? "#F85900" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {upvoteInfo.count > 0 && <span className="action-count">{upvoteInfo.count}</span>}
                </button>

                <button
                  type="button"
                  className="reddit-action-btn reply-action"
                  onClick={() => {
                    if (!isSignedIn) {
                      onRequireAuth();
                      return;
                    }
                    setActiveSubReplyId(activeSubReplyId === reply.id ? null : reply.id);
                    setSubReplyText("");
                  }}
                  title="Reply"
                  aria-label="Reply"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="reddit-action-btn share-action"
                  onClick={() => handleShareReply(reply.content)}
                  title="Share"
                  aria-label="Share"
                >
                  <ShareSendIcon size={16} />
                </button>

                {isAuthor && onDeleteReply && (
                  <button
                    type="button"
                    className="reddit-action-btn reddit-delete-btn"
                    onClick={() => onDeleteReply(post.id, reply.id)}
                    title="Delete reply"
                    aria-label="Delete reply"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>

              {/* INLINE SUB-REPLY COMPOSER */}
              {activeSubReplyId === reply.id && (
                <div className="reddit-inline-reply-box">
                  <div className="reply-as-badge">
                    Replying to <b>{reply.user_name}</b> as <span style={{ color: "#000000", fontWeight: 700 }}>{activeUserHandle}</span>
                  </div>
                  <textarea
                    autoFocus
                    rows={2}
                    placeholder={`Reply to ${reply.user_name}... (Ctrl+Enter to post)`}
                    value={subReplyText}
                    onChange={(e) => setSubReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleCreateSubReply(reply);
                      }
                    }}
                    className="reddit-reply-textarea"
                  />
                  <div className="reddit-inline-reply-footer">
                    <button type="button" className="reddit-cancel-btn" onClick={() => setActiveSubReplyId(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="reddit-submit-btn"
                      disabled={isSubmittingSub || !subReplyText.trim()}
                      onClick={() => handleCreateSubReply(reply)}
                    >
                      {isSubmittingSub ? "Replying..." : "Reply"}
                    </button>
                  </div>
                </div>
              )}

              {/* NESTED SUB-SECONDARY REPLIES */}
              {childReplies.length > 0 && (
                <div className={`secondary-replies-list depth-${Math.min(depth, 3)}`}>
                  {childReplies.map((child) => renderSecondaryReply(child, depth + 1, nextAncestors))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="reddit-thread-container" aria-label="Post replies">
      <div className="reddit-thread-heading">
        <div className="reddit-sort-filter">
          <span>↓↑ Top</span>
        </div>
        <div className="reddit-activity-link">
          {(() => {
            const replyCount = Math.max(post.replies_count || 0, effectiveReplies.length);
            return <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>;
          })()}
        </div>
      </div>

      {/* PRIMARY REPLY COMPOSER (Threads desktop inline pill) */}
      <form onSubmit={handleCreateTopLevelReply} className="primary-reply-composer-row threads-reply-composer">
        <div className="primary-avatar-col">
          <div
            className="primary-reply-avatar composer-avatar"
            style={{ background: userProfileListing?.color || "#000000" }}
          >
            {userProfileListing?.logo_url ? (
              <img src={userProfileListing.logo_url} alt={userProfileListing.name} />
            ) : userAvatar ? (
              <img src={userAvatar} alt={userName} />
            ) : (
              <span>{(userName || "FO").substring(0, 2).toUpperCase()}</span>
            )}
          </div>
        </div>

        <div className="primary-composer-pill">
          <input
            type="text"
            placeholder={isSignedIn ? `Reply to ${post.user_name}...` : "Sign in to join the discussion..."}
            value={mainReplyText}
            onChange={(e) => setMainReplyText(e.target.value)}
            onFocus={() => {
              if (!isSignedIn) {
                onRequireAuth();
              }
            }}
            className="threads-reply-input"
          />
          {mainReplyText.trim() && (
            <button
              type="submit"
              className="threads-reply-submit-btn"
              disabled={isSubmittingMain}
            >
              {isSubmittingMain ? "..." : "Reply"}
            </button>
          )}
        </div>
      </form>

      {/* PRIMARY REPLIES LIST */}
      <div className="primary-replies-list">
        {shareMessage && <p className="reply-action-feedback" role="status">{shareMessage}</p>}
        {replyActionError && <p className="reply-action-feedback is-error" role="alert">{replyActionError}</p>}
        {replyLoadError && (
          <div className="reply-load-error" role="alert">
            <span>{replyLoadError}</span>
            <button type="button" disabled={isLoadingReplies} onClick={onRetryLoadReplies}>{isLoadingReplies ? "Loading…" : "Retry"}</button>
          </div>
        )}
        {isLoadingReplies && effectiveReplies.length === 0 ? (
          <p className="reddit-replies-empty">Loading replies…</p>
        ) : primaryReplies.length === 0 ? (
          <p className="reddit-replies-empty">No replies yet. Be the first to reply.</p>
        ) : primaryReplies.map((priReply, index) => {
          const isOP =
            priReply.user_name.toLowerCase() === post.user_name.toLowerCase() ||
            priReply.user_id === post.user_id;

          const isCollapsed = collapsedIds.includes(priReply.id);
          const secondaryReplies = getDirectChildren(priReply.id).filter((child) => child.id !== priReply.id);

          const upvoteInfo = replyUpvotes[priReply.id] || {
            count: priReply.upvotes_count ?? 0,
            upvoted: Boolean(priReply.viewer_liked),
          };

          const isStartup = priReply.user_name.startsWith("s/");
          const formattedHandle = priReply.user_name;
          const isLastPrimary = index === primaryReplies.length - 1;
          const isAuthor = Boolean(isSignedIn && userId && priReply.user_id === userId);

          return (
            <div key={priReply.id} className={`primary-reply-card ${secondaryReplies.length > 0 ? "has-branch" : ""}`}>
              {/* PRIMARY REPLY ROW: AVATAR ALIGNED WITH MAIN POST AVATAR + VERTICAL CONNECTION LINE */}
              <div className="primary-reply-row">
                <div className="primary-avatar-col">
                  <div
                    className="primary-reply-avatar"
                    style={{
                      background: isOP ? "#000000" : isStartup ? "#757575" : "#757575",
                    }}
                  >
                    {priReply.user_avatar ? (
                      <img src={priReply.user_avatar} alt={priReply.user_name} />
                    ) : (
                      <span>{priReply.user_initials}</span>
                    )}
                  </div>
                  {(!isLastPrimary || (!isCollapsed && secondaryReplies.length > 0)) && (
                    <div className="primary-thread-line" aria-hidden="true" />
                  )}
                </div>

                <div className="primary-reply-content">
                  <div className="reddit-comment-header">
                    <button
                      type="button"
                      className="reddit-comment-author"
                      onClick={() => onSelectAuthorHandle?.(formattedHandle)}
                    >
                      {formattedHandle}
                    </button>

                    {isOP && <span className="reddit-author-badge">• Author</span>}

                    <span className="post-dot-sep" aria-hidden="true">·</span>
                    <span className="reddit-comment-time">{formatReplyTimeAgo(priReply.created_at)}</span>
                    {secondaryReplies.length > 0 && (
                      <button
                        type="button"
                        className="reddit-collapse-btn"
                        onClick={() => toggleCollapse(priReply.id)}
                      >
                        {isCollapsed ? `Show ${secondaryReplies.length} replies` : "Hide thread"}
                      </button>
                    )}
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="primary-reply-body">{priReply.content}</div>

                      <div className="reddit-comment-actions">
                        <button
                          type="button"
                          className={`reddit-action-btn like-action ${upvoteInfo.upvoted ? "liked" : ""}`}
                          disabled={pendingReplyLikes.has(priReply.id)}
                          aria-pressed={upvoteInfo.upvoted}
                          onClick={() => void handleToggleUpvote(priReply)}
                          title="Like"
                          aria-label="Like"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill={upvoteInfo.upvoted ? "#F85900" : "none"} stroke={upvoteInfo.upvoted ? "#F85900" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {upvoteInfo.count > 0 && <span className="action-count">{upvoteInfo.count}</span>}
                        </button>

                        <button
                          type="button"
                          className="reddit-action-btn reply-action"
                          onClick={() => {
                            if (!isSignedIn) {
                              onRequireAuth();
                              return;
                            }
                            setActiveSubReplyId(activeSubReplyId === priReply.id ? null : priReply.id);
                            setSubReplyText("");
                          }}
                          title="Reply"
                          aria-label="Reply"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="reddit-action-btn share-action"
                          onClick={() => handleShareReply(priReply.content)}
                          title="Share"
                          aria-label="Share"
                        >
                          <ShareSendIcon size={16} />
                        </button>

                        {isAuthor && onDeleteReply && (
                          <button
                            type="button"
                            className="reddit-action-btn reddit-delete-btn"
                            onClick={() => onDeleteReply(post.id, priReply.id)}
                            title="Delete reply"
                            aria-label="Delete reply"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* INLINE SUB-REPLY COMPOSER FOR PRIMARY REPLY */}
                      {activeSubReplyId === priReply.id && (
                        <div className="reddit-inline-reply-box">
                          <div className="reply-as-badge">
                            Replying to <b>{priReply.user_name}</b> as <span style={{ color: "#000000", fontWeight: 700 }}>{activeUserHandle}</span>
                          </div>
                          <textarea
                            autoFocus
                            rows={2}
                            placeholder={`Reply to ${priReply.user_name}... (Ctrl+Enter to post)`}
                            value={subReplyText}
                            onChange={(e) => setSubReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                e.preventDefault();
                                handleCreateSubReply(priReply);
                              }
                            }}
                            className="reddit-reply-textarea"
                          />
                          <div className="reddit-inline-reply-footer">
                            <button type="button" className="reddit-cancel-btn" onClick={() => setActiveSubReplyId(null)}>
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="reddit-submit-btn"
                              disabled={isSubmittingSub || !subReplyText.trim()}
                              onClick={() => handleCreateSubReply(priReply)}
                            >
                              {isSubmittingSub ? "Replying..." : "Reply"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* SECONDARY REPLIES THREAD (INDENTED INLINE THREAD WITH REDDIT VERTICAL CONNECTOR) */}
              {!isCollapsed && secondaryReplies.length > 0 && (
                <div className="secondary-replies-thread">
                  {secondaryReplies.map((secReply) => renderSecondaryReply(secReply, 1, new Set([priReply.id])))}
                </div>
              )}
            </div>
          );
        })}
        {hasMoreReplies && (
          <button type="button" className="btn-outline-pill" disabled={isLoadingReplies} onClick={onLoadMoreReplies} style={{ display: "block", margin: "12px auto" }}>
            {isLoadingReplies ? "Loading…" : "Load more replies"}
          </button>
        )}
      </div>
    </div>
  );
}
