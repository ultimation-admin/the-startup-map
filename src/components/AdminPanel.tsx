"use client";

import React, { useState, useEffect, useRef } from "react";
import { Listing, ReviewState, UserProfile, CommunityPost, Community } from "@/lib/db";
import {
  CheckIcon,
  AlertTriangleIcon,
  SparklesIcon,
  MapPinIcon,
  SearchIcon,
  BarChartIcon,
  UsersIcon,
  MessageSquareIcon,
  TrashIcon,
  PlusIcon,
} from "./Icons";

interface AdminPanelProps {
  onClose: () => void;
  onSelectListingOnMap?: (listing: Listing) => void;
  onListingsUpdated?: () => void;
}

type AdminSection = "dashboard" | "profiles" | "users" | "posts" | "communities";

export function AdminPanel({
  onClose,
  onSelectListingOnMap,
  onListingsUpdated,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminSection>("profiles");
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [listingCounts, setListingCounts] = useState({ total: 0, pending: 0, verified: 0, rejected: 0 });

  // Form for creating new community
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [isCreatingComm, setIsCreatingComm] = useState(false);

  const [filterState, setFilterState] = useState<ReviewState | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pageState, setPageState] = useState({
    listingCursor: null as string | null,
    userCursor: null as string | null,
    postCursor: null as string | null,
    hasMoreListings: false,
    hasMoreUsers: false,
    hasMorePosts: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const listingParams = new URLSearchParams({ status: filterState });
      if (searchQuery.trim()) listingParams.set("q", searchQuery.trim());
      const [listingsRes, usersRes, postsRes, commsRes] = await Promise.all([
        fetch(`/api/admin/listings?${listingParams.toString()}`).catch(() => null),
        fetch("/api/admin/users").catch(() => null),
        fetch("/api/admin/posts").catch(() => null),
        fetch("/api/communities").catch(() => null),
      ]);

      if (listingsRes && listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(Array.isArray(data) ? data : (data.listings || []));
        if (data.counts) setListingCounts(data.counts);
        setPageState((current) => ({ ...current, listingCursor: data.next_cursor || null, hasMoreListings: Boolean(data.has_more) }));
      }
      if (usersRes && usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : (data.users || []));
        setPageState((current) => ({ ...current, userCursor: data.next_cursor || null, hasMoreUsers: Boolean(data.has_more) }));
      }
      if (postsRes && postsRes.ok) {
        const data = await postsRes.json();
        const rawPosts = Array.isArray(data) ? data : (data.posts || []);
        setPageState((current) => ({ ...current, postCursor: data.next_cursor || null, hasMorePosts: Boolean(data.has_more) }));
        setPosts(rawPosts);
      }
      if (commsRes && commsRes.ok) {
        const data = await commsRes.json();
        setCommunities(Array.isArray(data) ? data : (data.communities || []));
      }
    } catch (err) {
      console.error("Failed to load admin listings:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const listingsFilterInitialized = useRef(false);
  useEffect(() => {
    if (!listingsFilterInitialized.current) {
      listingsFilterInitialized.current = true;
      return;
    }
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ status: filterState });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      try {
        const response = await fetch(`/api/admin/listings?${params.toString()}`);
        if (!response.ok) return;
        const data = await response.json();
        setListings(data.listings || []);
        if (data.counts) setListingCounts(data.counts);
        setPageState((current) => ({ ...current, listingCursor: data.next_cursor || null, hasMoreListings: Boolean(data.has_more) }));
      } catch (error) {
        console.error("Failed to load filtered admin listings:", error);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filterState, searchQuery]);

  const loadMore = async (kind: "listings" | "users" | "posts") => {
    const cursor = kind === "listings" ? pageState.listingCursor : kind === "users" ? pageState.userCursor : pageState.postCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ cursor });
      if (kind === "listings") {
        params.set("status", filterState);
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
      }
      const response = await fetch(`/api/admin/${kind}?${params.toString()}`);
      if (!response.ok) throw new Error("More records could not be loaded.");
      const data = await response.json();
      const key = kind === "listings" ? "listings" : kind;
      if (kind === "listings") setListings((current) => [...current, ...(data[key] || [])]);
      if (kind === "users") setUsers((current) => [...current, ...(data[key] || [])]);
      if (kind === "posts") setPosts((current) => [...current, ...(data[key] || [])]);
      setPageState((current) => ({
        ...current,
        listingCursor: kind === "listings" ? data.next_cursor || null : current.listingCursor,
        userCursor: kind === "users" ? data.next_cursor || null : current.userCursor,
        postCursor: kind === "posts" ? data.next_cursor || null : current.postCursor,
        hasMoreListings: kind === "listings" ? Boolean(data.has_more) : current.hasMoreListings,
        hasMoreUsers: kind === "users" ? Boolean(data.has_more) : current.hasMoreUsers,
        hasMorePosts: kind === "posts" ? Boolean(data.has_more) : current.hasMorePosts,
      }));
    } catch (error) {
      console.error(`Failed to load more admin ${kind}:`, error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, state: "verified" }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, review_state: "verified" } : l))
        );
        onListingsUpdated?.();
      }
    } catch (err) {
      alert("Failed to approve listing");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, state: "rejected" }),
      });
      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, review_state: "rejected" } : l))
        );
        onListingsUpdated?.();
      }
    } catch (err) {
      alert("Failed to reject listing");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing permanently?")) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        onListingsUpdated?.();
      }
    } catch (err) {
      alert("Failed to delete listing");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete post permanently?")) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      alert("Failed to delete post");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;
    setIsCreatingComm(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCommName.trim(), description: newCommDesc.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.community) {
          setCommunities((prev) => [data.community, ...prev.filter((c) => c.id !== data.community.id)]);
          setNewCommName("");
          setNewCommDesc("");
        }
      }
    } catch (err) {
      alert("Failed to create community");
    } finally {
      setIsCreatingComm(false);
    }
  };

  const handleDeleteCommunity = async (id: string) => {
    if (!confirm(`Delete community /${id}?`)) return;
    try {
      const res = await fetch(`/api/communities?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setCommunities((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      alert("Failed to delete community");
    }
  };

  const filteredListings = listings;

  const pendingCount = listingCounts.pending;
  const verifiedCount = listingCounts.verified;
  const rejectedCount = listingCounts.rejected;

  return (
    <div className="admin-panel-slide" style={{ background: "#ffffff", color: "#000000" }}>
      <div className="admin-panel-header" style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div>
          <h3 style={{ margin: 0, color: "#000000", fontWeight: 800 }}>Platform Admin Panel</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>Realtime approvals, user management & feed moderations</p>
        </div>
        <button type="button" className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* ADMIN NAV TABS */}
      <div style={{ display: "flex", gap: "6px", padding: "12px 20px", background: "#ffffff" }}>
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "dashboard" ? "#000000" : "#eeeef2", color: activeTab === "dashboard" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <BarChartIcon size={13} /> Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profiles")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "profiles" ? "#000000" : "#eeeef2", color: activeTab === "profiles" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <MapPinIcon size={13} /> Profiles ({listingCounts.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "users" ? "#000000" : "#eeeef2", color: activeTab === "users" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <UsersIcon size={13} /> Users ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("communities")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "communities" ? "#000000" : "#eeeef2", color: activeTab === "communities" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <SparklesIcon size={13} /> Communities ({communities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "posts" ? "#000000" : "#eeeef2", color: activeTab === "posts" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <MessageSquareIcon size={13} /> Posts ({posts.length})
        </button>
      </div>

      <div className="admin-panel-content">
        {/* SECTION: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ padding: "16px" }}>
            <div className="admin-stats-grid">
              <div className="stat-card yellow">
                <span>Pending Approvals</span>
                <h3>{pendingCount}</h3>
              </div>
              <div className="stat-card green">
                <span>Live Map Profiles</span>
                <h3>{verifiedCount}</h3>
              </div>
              <div className="stat-card black">
                <span>Registered Users</span>
                <h3>{users.length}</h3>
              </div>
              <div className="stat-card yellow">
                <span>Active Community Posts</span>
                <h3>{posts.length}</h3>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: PROFILES TABLE */}
        {activeTab === "profiles" && (
          <>
            <div className="admin-filter-tabs">
              <button type="button" className={`admin-tab ${filterState === "pending" ? "active" : ""}`} onClick={() => setFilterState("pending")}>
                Pending
              </button>
              <button type="button" className={`admin-tab ${filterState === "verified" ? "active" : ""}`} onClick={() => setFilterState("verified")}>
                Approved
              </button>
              <button type="button" className={`admin-tab ${filterState === "rejected" ? "active" : ""}`} onClick={() => setFilterState("rejected")}>
                Rejected
              </button>
              <button type="button" className={`admin-tab ${filterState === "all" ? "active" : ""}`} onClick={() => setFilterState("all")}>
                All
              </button>
            </div>

            <div className="admin-search-box" style={{ margin: "0 20px 16px" }}>
              <SearchIcon size={14} />
              <input type="text" placeholder="Search profiles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div style={{ padding: "0 20px 20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                    <th style={{ padding: "8px 10px" }}>PROFILE</th>
                    <th style={{ padding: "8px 10px" }}>CITY & SECTOR</th>
                    <th style={{ padding: "8px 10px" }}>STATUS</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((item) => {
                    const handle = item.type === "person" ? `p/${item.name}` : `s/${item.name}`;
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#757575", background: "#e6f8ed", padding: "1px 5px", borderRadius: "4px" }}>
                            {handle}
                          </span>
                          <div style={{ fontWeight: 800 }}>{item.name}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div>{item.city}</div>
                          <small style={{ color: "#6b7280" }}>{item.sector}</small>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "9999px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", background: item.review_state === "verified" ? "#dcfce7" : "#fef3c7", color: item.review_state === "verified" ? "#757575" : "#d97706" }}>
                            {item.review_state}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          {item.review_state !== "verified" && (
                            <button type="button" onClick={() => handleApprove(item.id)} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#757575", color: "#ffffff", fontWeight: 700, fontSize: "11px", cursor: "pointer", marginRight: "4px" }}>
                              Approve
                            </button>
                          )}
                          <button type="button" onClick={() => handleDelete(item.id)} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#eeeef2", color: "#6b7280", fontWeight: 600, fontSize: "11px", cursor: "pointer" }}>
                            Del
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pageState.hasMoreListings && (
                <button type="button" className="btn-outline-pill" disabled={loadingMore} onClick={() => void loadMore("listings")} style={{ display: "block", margin: "16px auto 0" }}>
                  {loadingMore ? "Loading…" : "Load more profiles"}
                </button>
              )}
            </div>
          </>
        )}

        {/* SECTION: USERS */}
        {activeTab === "users" && (
          <div style={{ padding: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "11px" }}>
                  <th style={{ padding: "8px" }}>USER</th>
                  <th style={{ padding: "8px" }}>ROLE</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px" }}>
                      <div style={{ fontWeight: 700 }}>{u.full_name || "User"}</div>
                      <small style={{ color: "#6b7280" }}>{u.email}</small>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ background: "#eeeef2", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                        {u.role || "user"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageState.hasMoreUsers && (
              <button type="button" className="btn-outline-pill" disabled={loadingMore} onClick={() => void loadMore("users")} style={{ display: "block", margin: "16px auto 0" }}>
                {loadingMore ? "Loading…" : "Load more users"}
              </button>
            )}
          </div>
        )}

        {/* SECTION: COMMUNITIES (CREATE & MANAGE) */}
        {activeTab === "communities" && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* CREATE COMMUNITY FORM */}
            <form onSubmit={handleCreateCommunity} style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "#000000" }}>+ Create New Community</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  required
                  placeholder="Name (e.g. startups, genai, saas)"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  style={{ flex: 2, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
                <button
                  type="submit"
                  disabled={isCreatingComm || !newCommName.trim()}
                  style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#757575", color: "#ffffff", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                >
                  {isCreatingComm ? "Creating..." : "+ Add"}
                </button>
              </div>
            </form>

            {/* COMMUNITIES LIST TABLE */}
            <div>
              <div style={{ fontWeight: 800, fontSize: "13px", color: "#757575", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                EXISTING COMMUNITIES ({communities.length})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "11px" }}>
                    <th style={{ padding: "8px" }}>COMMUNITY HANDLE</th>
                    <th style={{ padding: "8px" }}>DESCRIPTION</th>
                    <th style={{ padding: "8px", textAlign: "right" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {communities.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px", fontWeight: 800, color: "#757575" }}>
                        /{c.name.replace(/^\//, "")}
                      </td>
                      <td style={{ padding: "8px", color: "#475569" }}>{c.description || "—"}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteCommunity(c.id)}
                          style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#000000", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <TrashIcon size={11} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {communities.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                        No communities added yet. Create one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION: POSTS */}
        {activeTab === "posts" && (
          <div style={{ padding: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "11px" }}>
                  <th style={{ padding: "8px" }}>AUTHOR</th>
                  <th style={{ padding: "8px" }}>CONTENT</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px", fontWeight: 700, color: "#757575" }}>{p.user_name}</td>
                    <td style={{ padding: "8px", color: "#374151" }}>{p.content}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      <button type="button" onClick={() => handleDeletePost(p.id)} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#fee2e2", color: "#000000", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <TrashIcon size={11} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageState.hasMorePosts && (
              <button type="button" className="btn-outline-pill" disabled={loadingMore} onClick={() => void loadMore("posts")} style={{ display: "block", margin: "16px auto 0" }}>
                {loadingMore ? "Loading…" : "Load more posts"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
