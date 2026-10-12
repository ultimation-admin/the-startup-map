"use client";

import React, { useState } from "react";
import { CommunityPost, PostReply, Listing } from "@/lib/db";
import { UpvoteIcon, ShareSendIcon } from "./Icons";

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
  onShowNoProfileModal: () => void;
  onSelectAuthorHandle?: (handle: string) => void;
  onAddReply: (postId: string, content: string, parentReplyId?: string, replyToUser?: string) => Promise<void>;
}

export function RedditThreadReplies({
  post,
  isSignedIn,
  userId,
  userName,
  userAvatar,
  userProfileListing,
  onRequireAuth,
  onShowNoProfileModal,
  onSelectAuthorHandle,
  onAddReply,
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

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleUpvote = (replyId: string, initialCount = 5) => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    setReplyUpvotes((prev) => {
      const current = prev[replyId] || { count: initialCount, upvoted: false };
      const nextUpvoted = !current.upvoted;
      return {
        ...prev,
        [replyId]: {
          count: current.count + (nextUpvoted ? 1 : -1),
          upvoted: nextUpvoted,
        },
      };
    });
  };

  const handleShareReply = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Comment text copied to clipboard!");
    }
  };

  const effectiveReplies = post.replies ?? [];

  // Robust check for primary replies (top-level direct replies to the post)
  const isPrimaryReply = (r: PostReply) => {
    if (!r.parent_reply_id) return true;
    const pId = String(r.parent_reply_id).trim();
    return pId === "" || pId === "null" || pId === "undefined";
  };

  // Helper to find child replies of a specific parent comment
  const getDirectChildren = (all: PostReply[], parentId: string) => {
    return all.filter(
      (r) => r.parent_reply_id && String(r.parent_reply_id).trim() === String(parentId).trim()
    );
  };

  const primaryReplies = effectiveReplies.filter(isPrimaryReply);

  const handleCreateTopLevelReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }
    if (!mainReplyText.trim()) return;

    setIsSubmittingMain(true);
    try {
      await onAddReply(post.id, mainReplyText.trim());
      setMainReplyText("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingMain(false);
    }
  };

  // Render Secondary Reply Node (Nested under a Primary Reply or another Secondary Reply)
  const renderSecondaryReply = (reply: PostReply, depth = 1) => {
    const isOP =
      reply.user_name.toLowerCase() === post.user_name.toLowerCase() ||
      reply.user_id === post.user_id;

    const isCollapsed = collapsedIds.includes(reply.id);
    const childReplies = getDirectChildren(effectiveReplies, reply.id);

    const upvoteInfo = replyUpvotes[reply.id] || {
      count: reply.upvotes_count ?? 0,
      upvoted: false,
    };

    const isStartup = reply.user_name.startsWith("s/");
    const formattedHandle = reply.user_name;

    return (
      <div key={reply.id} className={`secondary-reply-node depth-${depth} ${isCollapsed ? "collapsed" : ""}`}>
        {/* LEFT THREAD CONNECTOR & SECONDARY AVATAR */}
        <div className="secondary-reply-left">
          <div
            className="secondary-reply-avatar"
            style={{
              background: isOP ? "#f85900" : isStartup ? "#2563eb" : "#8b5cf6",
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

            {isOP && <span className="reddit-op-badge" title="Original Poster">OP</span>}

            <span className="reddit-comment-time">• {formatReplyTimeAgo(reply.created_at)}</span>
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
                  className={`reddit-upvote-btn ${upvoteInfo.upvoted ? "upvoted" : ""}`}
                  onClick={() => handleToggleUpvote(reply.id, upvoteInfo.count)}
                >
                  <UpvoteIcon size={12} filled={upvoteInfo.upvoted} />
                  <span>{upvoteInfo.count}</span>
                </button>

                <button
                  type="button"
                  className="reddit-action-btn"
                  onClick={() => {
                    if (!isSignedIn) { onRequireAuth(); return; }
                    setActiveSubReplyId(activeSubReplyId === reply.id ? null : reply.id);
                    setSubReplyText("");
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Reply</span>
                </button>

                <button
                  type="button"
                  className="reddit-action-btn"
                  onClick={() => handleShareReply(reply.content)}
                >
                  <ShareSendIcon size={12} />
                  <span>Share</span>
                </button>
              </div>

              {/* INLINE SUB-REPLY COMPOSER */}
              {activeSubReplyId === reply.id && (
                <div className="reddit-inline-reply-box">
                  <div className="reply-as-badge">
                    Replying to <b>{reply.user_name}</b> as <span style={{ color: "#f85900", fontWeight: 700 }}>{userName}</span>
                  </div>
                  <textarea
                    autoFocus
                    rows={2}
                    placeholder={`Reply to ${reply.user_name}...`}
                    value={subReplyText}
                    onChange={(e) => setSubReplyText(e.target.value)}
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
                      onClick={async () => {
                        if (!subReplyText.trim()) return;
                        setIsSubmittingSub(true);
                        try {
                          await onAddReply(post.id, subReplyText.trim(), reply.id, reply.user_name);
                          setActiveSubReplyId(null);
                          setSubReplyText("");
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsSubmittingSub(false);
                        }
                      }}
                    >
                      {isSubmittingSub ? "Replying..." : "Reply"}
                    </button>
                  </div>
                </div>
              )}

              {/* NESTED SUB-SECONDARY REPLIES */}
              {childReplies.length > 0 && (
                <div className={`secondary-replies-list depth-${Math.min(depth, 3)}`}>
                  {childReplies.map((child) => renderSecondaryReply(child, depth + 1))}
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
        <span>Replies</span>
        <span className="reddit-reply-count">{effectiveReplies.length}</span>
      </div>
      {/* PRIMARY REPLY COMPOSER (Avatar perfectly aligned with 44px primary avatar column) */}
      <form onSubmit={handleCreateTopLevelReply} className="primary-reply-composer-row">
        <div className="primary-avatar-col">
          <div
            className="primary-reply-avatar composer-avatar"
            style={{ background: userProfileListing?.color || "#f85900" }}
          >
            {userProfileListing?.logo_url ? (
              <img src={userProfileListing.logo_url} alt={userProfileListing.name} />
            ) : userAvatar ? (
              <img src={userAvatar} alt={userName} />
            ) : (
              <span>{userName.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
        </div>

        <div className="primary-composer-box">
          <div className="reddit-comment-user-badge">
            Comment as <b>{userName}</b>
          </div>
          <textarea
            rows={2}
            placeholder="What are your thoughts?"
            value={mainReplyText}
            onChange={(e) => setMainReplyText(e.target.value)}
            className="reddit-main-textarea"
          />
          <div className="reddit-main-footer">
            {mainReplyText && (
              <button
                type="button"
                className="reddit-cancel-btn"
                onClick={() => setMainReplyText("")}
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="reddit-submit-btn"
              disabled={isSubmittingMain || !mainReplyText.trim()}
            >
              {isSubmittingMain ? "Commenting..." : "Comment"}
            </button>
          </div>
        </div>
      </form>

      {/* PRIMARY REPLIES LIST */}
      <div className="primary-replies-list">
        {primaryReplies.length === 0 ? (
          <p className="reddit-replies-empty">No replies yet. Be the first to reply.</p>
        ) : primaryReplies.map((priReply, index) => {
          const isOP =
            priReply.user_name.toLowerCase() === post.user_name.toLowerCase() ||
            priReply.user_id === post.user_id;

          const isCollapsed = collapsedIds.includes(priReply.id);
          const secondaryReplies = getDirectChildren(effectiveReplies, priReply.id);

          const upvoteInfo = replyUpvotes[priReply.id] || {
            count: priReply.upvotes_count ?? 0,
            upvoted: false,
          };

          const isStartup = priReply.user_name.startsWith("s/");
          const formattedHandle = priReply.user_name;
          const isLastPrimary = index === primaryReplies.length - 1;

          return (
            <div key={priReply.id} className={`primary-reply-card ${secondaryReplies.length > 0 ? "has-branch" : ""}`}>
              {/* PRIMARY REPLY ROW: AVATAR ALIGNED WITH MAIN POST AVATAR + VERTICAL CONNECTION LINE */}
              <div className="primary-reply-row">
                <div className="primary-avatar-col">
                  <div
                    className="primary-reply-avatar"
                    style={{
                      background: isOP ? "#f85900" : isStartup ? "#2563eb" : "#8b5cf6",
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

                    {isOP && <span className="reddit-op-badge" title="Original Poster">OP</span>}

                    <span className="reddit-comment-time">• {formatReplyTimeAgo(priReply.created_at)}</span>
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
                          className={`reddit-upvote-btn ${upvoteInfo.upvoted ? "upvoted" : ""}`}
                          onClick={() => handleToggleUpvote(priReply.id, upvoteInfo.count)}
                        >
                          <UpvoteIcon size={12} filled={upvoteInfo.upvoted} />
                          <span>{upvoteInfo.count}</span>
                        </button>

                        <button
                          type="button"
                          className="reddit-action-btn"
                          onClick={() => {
                            if (!isSignedIn) { onRequireAuth(); return; }
                            setActiveSubReplyId(activeSubReplyId === priReply.id ? null : priReply.id);
                            setSubReplyText("");
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>Reply</span>
                        </button>

                        <button
                          type="button"
                          className="reddit-action-btn"
                          onClick={() => handleShareReply(priReply.content)}
                        >
                          <ShareSendIcon size={12} />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* INLINE SUB-REPLY COMPOSER FOR PRIMARY REPLY */}
                      {activeSubReplyId === priReply.id && (
                        <div className="reddit-inline-reply-box">
                          <div className="reply-as-badge">
                            Replying to <b>{priReply.user_name}</b> as <span style={{ color: "#f85900", fontWeight: 700 }}>{userName}</span>
                          </div>
                          <textarea
                            autoFocus
                            rows={2}
                            placeholder={`Reply to ${priReply.user_name}...`}
                            value={subReplyText}
                            onChange={(e) => setSubReplyText(e.target.value)}
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
                              onClick={async () => {
                                if (!subReplyText.trim()) return;
                                setIsSubmittingSub(true);
                                try {
                                  await onAddReply(post.id, subReplyText.trim(), priReply.id, priReply.user_name);
                                  setActiveSubReplyId(null);
                                  setSubReplyText("");
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setIsSubmittingSub(false);
                                }
                              }}
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
                  {secondaryReplies.map((secReply) => renderSecondaryReply(secReply, 1))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
