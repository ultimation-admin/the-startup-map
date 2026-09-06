"use client";

import React, { useState, useEffect } from "react";
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

  // Form for creating new community
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [isCreatingComm, setIsCreatingComm] = useState(false);

  const [filterState, setFilterState] = useState<ReviewState | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [listingsRes, usersRes, postsRes, commsRes] = await Promise.all([
        fetch("/api/admin/listings").catch(() => null),
        fetch("/api/admin/users").catch(() => null),
        fetch("/api/admin/posts").catch(() => null),
        fetch("/api/communities").catch(() => null),
      ]);

      if (listingsRes && listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(Array.isArray(data) ? data : (data.listings || []));
      }
      if (usersRes && usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : (data.users || []));
      }
      if (postsRes && postsRes.ok) {
        const data = await postsRes.json();
        const rawPosts = Array.isArray(data) ? data : (data.posts || []);
        setPosts(
          rawPosts.map((p: any) => ({
            ...p,
            liked_by: typeof p.liked_by === "string" ? JSON.parse(p.liked_by || "[]") : (p.liked_by || []),
            replies: typeof p.replies === "string" ? JSON.parse(p.replies || "[]") : (p.replies || []),
          }))
        );
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
    const interval = setInterval(() => {
      loadData(false);
      if (onListingsUpdated) onListingsUpdated();
    }, 15000);
    return () => clearInterval(interval);
  }, [onListingsUpdated]);

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

  const filteredListings = listings.filter((l) => {
    const matchesTab = filterState === "all" ? true : (l.review_state || "pending") === filterState;
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.sector.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = listings.filter((l) => (l.review_state || "pending") === "pending").length;
  const verifiedCount = listings.filter((l) => l.review_state === "verified").length;
  const rejectedCount = listings.filter((l) => l.review_state === "rejected").length;

  return (
    <div className="admin-panel-slide" style={{ background: "#ffffff", color: "#111827" }}>
      <div className="admin-panel-header" style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div>
          <h3 style={{ margin: 0, color: "#111827", fontWeight: 800 }}>Platform Admin Panel</h3>
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
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "dashboard" ? "#111827" : "#eeeef2", color: activeTab === "dashboard" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <BarChartIcon size={13} /> Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profiles")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "profiles" ? "#111827" : "#eeeef2", color: activeTab === "profiles" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <MapPinIcon size={13} /> Profiles ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "users" ? "#111827" : "#eeeef2", color: activeTab === "users" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <UsersIcon size={13} /> Users ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("communities")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "communities" ? "#111827" : "#eeeef2", color: activeTab === "communities" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
        >
          <SparklesIcon size={13} /> Communities ({communities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: activeTab === "posts" ? "#111827" : "#eeeef2", color: activeTab === "posts" ? "#ffffff" : "#374151", fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
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
                Pending ({pendingCount})
              </button>
              <button type="button" className={`admin-tab ${filterState === "verified" ? "active" : ""}`} onClick={() => setFilterState("verified")}>
                Approved ({verifiedCount})
              </button>
              <button type="button" className={`admin-tab ${filterState === "rejected" ? "active" : ""}`} onClick={() => setFilterState("rejected")}>
                Rejected ({rejectedCount})
              </button>
              <button type="button" className={`admin-tab ${filterState === "all" ? "active" : ""}`} onClick={() => setFilterState("all")}>
                All ({listings.length})
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
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", background: "#e6f8ed", padding: "1px 5px", borderRadius: "4px" }}>
                            {handle}
                          </span>
                          <div style={{ fontWeight: 800 }}>{item.name}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div>{item.city}</div>
                          <small style={{ color: "#6b7280" }}>{item.sector}</small>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "9999px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", background: item.review_state === "verified" ? "#dcfce7" : "#fef3c7", color: item.review_state === "verified" ? "#16a34a" : "#d97706" }}>
                            {item.review_state}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "right" }}>
                          {item.review_state !== "verified" && (
                            <button type="button" onClick={() => handleApprove(item.id)} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#10b981", color: "#ffffff", fontWeight: 700, fontSize: "11px", cursor: "pointer", marginRight: "4px" }}>
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
          </div>
        )}

        {/* SECTION: COMMUNITIES (CREATE & MANAGE) */}
        {activeTab === "communities" && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* CREATE COMMUNITY FORM */}
            <form onSubmit={handleCreateCommunity} style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>+ Create New Community</div>
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
                  style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#10b981", color: "#ffffff", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                >
                  {isCreatingComm ? "Creating..." : "+ Add"}
                </button>
              </div>
            </form>

            {/* COMMUNITIES LIST TABLE */}
            <div>
              <div style={{ fontWeight: 800, fontSize: "13px", color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
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
                      <td style={{ padding: "8px", fontWeight: 800, color: "#10b981" }}>
                        /{c.name.replace(/^\//, "")}
                      </td>
                      <td style={{ padding: "8px", color: "#475569" }}>{c.description || "—"}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteCommunity(c.id)}
                          style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
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
                    <td style={{ padding: "8px", fontWeight: 700, color: "#16a34a" }}>{p.user_name}</td>
                    <td style={{ padding: "8px", color: "#374151" }}>{p.content}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      <button type="button" onClick={() => handleDeletePost(p.id)} style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <TrashIcon size={11} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
