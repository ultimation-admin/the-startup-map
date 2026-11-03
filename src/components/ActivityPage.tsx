"use client";

import React, { useCallback, useEffect, useState } from "react";

type ActivityItem = {
  id: string;
  actor_name: string;
  actor_avatar?: string | null;
  type: "like" | "reply" | "repost";
  post_id: string;
  post_preview?: string | null;
  created_at: string;
  is_read: number;
};

export function ActivityPage({ userId, isSignedIn, onRequireAuth }: { userId: string; isSignedIn: boolean; onRequireAuth: () => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadActivity = useCallback(async (signal?: AbortSignal) => {
    if (!isSignedIn) {
      setItems([]);
      setLoadError("");
      setActionError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/notifications", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Couldn’t load activity. Try again.");
      const data = await response.json();
      if (!signal?.aborted) setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (reason) {
      if (signal?.aborted || (reason instanceof DOMException && reason.name === "AbortError")) return;
      setLoadError(reason instanceof Error ? reason.message : "Couldn’t load activity. Try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    const controller = new AbortController();
    void loadActivity(controller.signal);
    return () => controller.abort();
  }, [loadActivity, userId]);

  const markAllRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    setActionError("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) throw new Error("Couldn’t update activity. Try again.");
      setItems((current) => current.map((item) => ({ ...item, is_read: 1 })));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Couldn’t update activity. Try again.");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleFilterKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: "All" | "Unread") => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" || event.key === "ArrowLeft"
      ? "All"
      : event.key === "End" || event.key === "ArrowRight"
        ? "Unread"
        : current;
    setFilter(next);
    document.getElementById(`activity-filter-${next.toLowerCase()}`)?.focus();
  };

  const visibleItems = filter === "Unread" ? items.filter((item) => !item.is_read) : items;

  return (
    <section className="tab-page activity-page" aria-labelledby="activity-title">
      <header className="tab-page-heading activity-heading">
        <div>
          <p className="eyebrow">YOUR NETWORK</p>
          <h1 id="activity-title">Activity</h1>
          <p>Replies and reactions to your posts.</p>
        </div>
        {isSignedIn && items.some((item) => !item.is_read) && (
          <button type="button" className="text-action" disabled={markingAllRead} onClick={() => void markAllRead()}>
            {markingAllRead ? "Marking read…" : "Mark all read"}
          </button>
        )}
      </header>

      {!isSignedIn ? (
        <div className="tab-empty-state">
          <h2>Sign in to see your activity</h2>
          <p>Replies and reactions to your posts will show up here.</p>
          <button className="primary-action" type="button" onClick={onRequireAuth}>Sign in</button>
        </div>
      ) : (
        <>
          <div className="activity-filters" role="tablist" aria-label="Activity filter">
            {(["All", "Unread"] as const).map((item) => (
              <button
                id={`activity-filter-${item.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={filter === item}
                aria-controls="activity-panel"
                tabIndex={filter === item ? 0 : -1}
                className={filter === item ? "active" : ""}
                key={item}
                onClick={() => setFilter(item)}
                onKeyDown={(event) => handleFilterKeyDown(event, item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loadError && (
            <div className="tab-error" role="alert">
              <p>{loadError}</p>
              <button type="button" onClick={() => void loadActivity()}>Try again</button>
            </div>
          )}
          {actionError && <p className="tab-error" role="alert">{actionError}</p>}

          <div id="activity-panel" role="tabpanel" tabIndex={0} aria-labelledby={`activity-filter-${filter.toLowerCase()}`}>
            {loading ? (
              <div className="activity-loading" role="status" aria-label="Loading activity">
                {Array.from({ length: 4 }, (_, index) => <div className="activity-loading-row" key={index}><span /><div><i /><i /><i /></div></div>)}
              </div>
            ) : loadError ? null : visibleItems.length ? (
              <div className="activity-list">
                {visibleItems.map((item) => (
                  <a
                    key={item.id}
                    href={`/#post-${encodeURIComponent(item.post_id)}`}
                    className={`activity-row${!item.is_read ? " unread" : ""}`}
                    aria-label={`${item.actor_name} ${item.type === "like" ? "liked" : item.type === "reply" ? "replied to" : "reposted"} your post`}
                  >
                    <span className="activity-avatar" aria-hidden="true">
                      {item.actor_avatar ? <img src={item.actor_avatar} alt="" loading="lazy" decoding="async" /> : item.actor_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="activity-copy">
                      <span><strong>{item.actor_name}</strong> {item.type === "like" ? "liked your post" : item.type === "reply" ? "replied to your post" : "reposted your post"}</span>
                      <small>{item.post_preview || "View the conversation"}</small>
                      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                    </span>
                    {!item.is_read && <span className="activity-unread-dot" aria-label="Unread" />}
                  </a>
                ))}
              </div>
            ) : (
              <div className="tab-empty-state">
                <h2>{filter === "Unread" ? "You’re all caught up" : "No activity yet"}</h2>
                <p>{filter === "Unread" ? "New replies and reactions will appear here." : "When someone replies to, likes, or reposts one of your posts, you’ll see it here."}</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
