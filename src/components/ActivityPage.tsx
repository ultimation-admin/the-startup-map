"use client";

import React, { useEffect, useState } from "react";

type ActivityItem = { id: string; actor_name: string; actor_avatar?: string | null; type: "like" | "reply" | "repost"; post_preview?: string | null; created_at: string; is_read: number };

export function ActivityPage({ userId, isSignedIn, onRequireAuth }: { userId: string; isSignedIn: boolean; onRequireAuth: () => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"All" | "Unread">("All");

  useEffect(() => {
    let cancelled = false;
    if (!isSignedIn) { setItems([]); setLoading(false); return; }
    setLoading(true);
    fetch("/api/notifications")
      .then(async (response) => { if (!response.ok) throw new Error("Couldn’t load activity. Try again."); return response.json(); })
      .then((data) => { if (!cancelled) setItems(data.notifications || []); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Couldn’t load activity. Try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isSignedIn, userId]);

  const markAllRead = async () => {
    setError("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) throw new Error("Couldn’t update activity. Try again.");
      setItems((current) => current.map((item) => ({ ...item, is_read: 1 })));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn’t update activity. Try again."); }
  };

  const visibleItems = filter === "Unread" ? items.filter((item) => !item.is_read) : items;
  return (
    <section className="tab-page activity-page">
      <header className="tab-page-heading activity-heading"><div><p className="eyebrow">YOUR NETWORK</p><h1>Activity</h1><p>Replies and reactions to your posts.</p></div>{isSignedIn && items.some((item) => !item.is_read) && <button type="button" className="text-action" onClick={markAllRead}>Mark all read</button>}</header>
      {!isSignedIn ? <div className="tab-empty-state"><h2>Sign in to see your activity</h2><p>Replies and reactions to your posts will show up here.</p><button className="primary-action" type="button" onClick={onRequireAuth}>Sign in</button></div> : <>
        <div className="activity-filters" role="tablist" aria-label="Activity filter">{(["All", "Unread"] as const).map((item) => <button type="button" role="tab" aria-selected={filter === item} className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        {error && <p className="tab-error" role="alert">{error}</p>}
        {loading ? <p className="tab-loading" role="status">Loading activity…</p> : visibleItems.length ? <div className="activity-list">{visibleItems.map((item) => <article key={item.id} className={"activity-row" + (!item.is_read ? " unread" : "")}><span className="activity-avatar">{item.actor_avatar ? <img src={item.actor_avatar} alt="" /> : item.actor_name.slice(0, 1).toUpperCase()}</span><span className="activity-copy"><strong>{item.actor_name}</strong> {item.type === "like" ? "liked your post" : item.type === "reply" ? "replied to your post" : "reposted your post"}<small>{item.post_preview || "View the conversation"}</small><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></span><span className="activity-unread-dot" aria-label={!item.is_read ? "Unread" : undefined} /></article>)}</div> : <div className="tab-empty-state"><h2>{filter === "Unread" ? "You’re all caught up" : "No activity yet"}</h2><p>When someone replies to, likes, or reposts one of your posts, you’ll see it here.</p></div>}
      </>}
    </section>
  );
}
