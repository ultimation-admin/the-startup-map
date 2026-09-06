"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Listing, ReviewState, UserProfile, CommunityPost, Community } from "@/lib/db";
import {
  CheckIcon,
  AlertTriangleIcon,
  SparklesIcon,
  MapPinIcon,
  SearchIcon,
  GlobeIcon,
  BarChartIcon,
  UsersIcon,
  MessageSquareIcon,
  UploadIcon,
  TrashIcon,
  EditIcon,
  LockIcon,
  FileTextIcon,
} from "@/components/Icons";
import { AdminTableSkeleton } from "@/components/Skeletons";
import { DEFAULT_PRIVACY_POLICY, DEFAULT_TERMS_OF_SERVICE } from "@/lib/legalContent";

type AdminSection = "dashboard" | "profiles" | "users" | "posts" | "communities" | "legal";

export default function TonyStarkAdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");

  // Legal Documents State
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<"privacy_policy" | "terms_of_service">("privacy_policy");
  const [privacyPolicyText, setPrivacyPolicyText] = useState(DEFAULT_PRIVACY_POLICY);
  const [termsOfServiceText, setTermsOfServiceText] = useState(DEFAULT_TERMS_OF_SERVICE);
  const [isLegalLoading, setIsLegalLoading] = useState(false);
  const [isLegalSaving, setIsLegalSaving] = useState(false);
  const [legalSaveMsg, setLegalSaveMsg] = useState("");

  const loadLegalDocs = async () => {
    setIsLegalLoading(true);
    try {
      const res = await fetch("/api/admin/legal");
      if (res.ok) {
        const data = await res.json();
        if (data.privacy_policy) setPrivacyPolicyText(data.privacy_policy);
        if (data.terms_of_service) setTermsOfServiceText(data.terms_of_service);
      }
    } catch (err) {
      console.error("Failed to load legal docs:", err);
    } finally {
      setIsLegalLoading(false);
    }
  };

  const handleSaveLegalDoc = async () => {
    setIsLegalSaving(true);
    setLegalSaveMsg("");
    const content = selectedLegalDoc === "privacy_policy" ? privacyPolicyText : termsOfServiceText;
    try {
      const res = await fetch("/api/admin/legal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passkey": passkeyInput.trim(),
        },
        body: JSON.stringify({ doc: selectedLegalDoc, content }),
      });
      if (res.ok) {
        setLegalSaveMsg(`Saved ${selectedLegalDoc === "privacy_policy" ? "Privacy Policy" : "Terms of Service"} successfully!`);
        setTimeout(() => setLegalSaveMsg(""), 4000);
      }
    } catch (err) {
      alert("Failed to save legal document.");
    } finally {
      setIsLegalSaving(false);
    }
  };

  // Security Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = sessionStorage.getItem("ts_admin_authenticated");
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkeyInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.authorized) {
        setIsAuthenticated(true);
        setAuthError("");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ts_admin_authenticated", "true");
        }
      } else {
        setAuthError(data.error || "ACCESS DENIED: Invalid Security Passkey Code. Incident Logged.");
      }
    } catch (err) {
      setAuthError("ACCESS DENIED: Verification request failed.");
    }
  };

  const handleSignOutAdmin = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ts_admin_authenticated");
    }
  };

  // Data States
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form for creating new community
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [isCreatingComm, setIsCreatingComm] = useState(false);

  // Edit Profile Modal State
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editStage, setEditStage] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Profile Filter States
  const [profileFilterState, setProfileFilterState] = useState<ReviewState | "all">("pending");
  const [profileTypeFilter, setProfileTypeFilter] = useState<string>("all");
  const [profileCityFilter, setProfileCityFilter] = useState<string>("all");
  const [profileSearchQuery, setProfileSearchQuery] = useState("");

  // User Filter States
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Post Filter States
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [postCommunityFilter, setPostCommunityFilter] = useState("all");

  // Load All Data
  const loadAllData = async (isInitial = false) => {
    if (!isAuthenticated) return;
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
      console.error("Failed to load admin data:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData(true);
      const interval = setInterval(() => loadAllData(false), 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeSection === "legal") {
      loadLegalDocs();
    }
  }, [isAuthenticated, activeSection]);

  // Listing Actions
  const handleApproveListing = async (id: string) => {
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
      }
    } catch (err) {
      alert("Failed to approve listing");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectListing = async (id: string) => {
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
      }
    } catch (err) {
      alert("Failed to reject listing");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Permanently delete this profile from the map?")) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      alert("Failed to delete listing");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk Approve
  const handleBulkApprovePending = async () => {
    const pendingListings = listings.filter((l) => (l.review_state || "pending") === "pending");
    if (pendingListings.length === 0) return alert("No pending profile submissions.");
    if (!confirm(`Approve all ${pendingListings.length} pending profiles?`)) return;

    for (const item of pendingListings) {
      await handleApproveListing(item.id);
    }
  };

  // User Role Update
  const handleUpdateUserRole = async (userId: string, newRole: "user" | "moderator" | "admin") => {
    setActionLoadingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      alert("Failed to update user role");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Post Delete
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete post permanently?")) return;
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/admin/posts?id=${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      alert("Failed to delete post");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Community Actions
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

  // Save Edit Profile
  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setActionLoadingId(editingListing.id);
    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          city: editCity,
          sector: editSector,
          stage: editStage,
          description: editDescription,
        }),
      });

      if (res.ok) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === editingListing.id
              ? {
                  ...l,
                  name: editName,
                  city: editCity,
                  sector: editSector,
                  stage: editStage,
                  description: editDescription,
                }
              : l
          )
        );
        setEditingListing(null);
      }
    } catch (err) {
      alert("Failed to update profile");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Type", "Name", "City", "Sector", "Stage", "ReviewState", "OwnerID"];
    const rows = listings.map((l) => [
      l.id,
      l.type,
      `"${l.name.replace(/"/g, '""')}"`,
      l.city,
      l.sector,
      l.stage || "",
      l.review_state,
      l.owner_id,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `startupmap_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Calculations
  const pendingCount = listings.filter((l) => (l.review_state || "pending") === "pending").length;
  const verifiedCount = listings.filter((l) => l.review_state === "verified").length;
  const rejectedCount = listings.filter((l) => l.review_state === "rejected").length;
  const peopleProfilesCount = listings.filter((l) => l.type === "person").length;
  const startupProfilesCount = listings.filter((l) => l.type === "startup").length;

  // Distribution
  const cityCounts: Record<string, number> = {};
  listings.forEach((l) => {
    cityCounts[l.city] = (cityCounts[l.city] || 0) + 1;
  });
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);

  // Filtered Profiles
  const filteredListings = listings.filter((l) => {
    const matchesState = profileFilterState === "all" ? true : (l.review_state || "pending") === profileFilterState;
    const matchesType = profileTypeFilter === "all" ? true : l.type === profileTypeFilter;
    const matchesCity = profileCityFilter === "all" ? true : l.city === profileCityFilter;
    const q = profileSearchQuery.toLowerCase();
    const matchesSearch =
      l.name.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.sector.toLowerCase().includes(q);
    return matchesState && matchesType && matchesCity && matchesSearch;
  });

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  // Filtered Posts
  const filteredPosts = posts.filter((p) => {
    const matchesComm = postCommunityFilter === "all" ? true : p.community_id === postCommunityFilter;
    const q = postSearchQuery.toLowerCase();
    const matchesSearch =
      p.content.toLowerCase().includes(q) ||
      p.user_name.toLowerCase().includes(q) ||
      p.community_name.toLowerCase().includes(q);
    return matchesComm && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0d14",
          color: "#f8fafc",
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            background: "#111726",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "20px",
            padding: "36px 32px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            textAlign: "center",
          }}
        >
          {/* SECURITY BADGE */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              padding: "6px 14px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1px",
              marginBottom: "20px",
            }}
          >
            <LockIcon size={14} /> RESTRICTED ADMIN ZONE — LEVEL 5
          </div>

          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: 800, color: "#ffffff" }}>
            STARK SECURITY GATEWAY
          </h2>
          <p style={{ margin: "0 0 24px 0", fontSize: "13.5px", color: "#94a3b8", lineHeight: "1.5" }}>
            High security restricted area. Only authorized personnel with Level 5 clearance may enter.
          </p>

          <form onSubmit={handleAuthenticate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <input
                type="password"
                required
                placeholder="Enter Admin Security Passkey..."
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {authError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "#10b981",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Verify Security Clearance
            </button>
          </form>

          <div style={{ marginTop: "24px", borderTop: "1px solid #1e293b", paddingTop: "16px" }}>
            <Link
              href="/"
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← Return to Live Startup Map
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0eee6", color: "#111827", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#111827", fontWeight: 800, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#10b981", fontSize: "20px" }}>|||</span> THE STARTUP MAP
          </Link>
          <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 8px", borderRadius: "9999px", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.8px" }}>
            BETA
          </span>
          <span style={{ background: "#111827", color: "#ffffff", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px" }}>
            ADMIN CONTROL PLATFORM
          </span>
        </div>

        {/* SYSTEM STATUS & CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#16a34a", background: "#e6f8ed", padding: "6px 12px", borderRadius: "9999px", fontWeight: 700 }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> D1 Engine Sync (12ms)
          </span>

          <button
            type="button"
            onClick={handleBulkApprovePending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#10b981",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <CheckIcon size={14} /> Bulk Approve ({pendingCount})
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#eeeef2",
              color: "#111827",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <UploadIcon size={14} /> Export CSV
          </button>

          <Link
            href="/"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "#eeeef2",
              color: "#111827",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "12px",
            }}
          >
            ← Live Map
          </Link>

          <button
            type="button"
            onClick={handleSignOutAdmin}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "#fee2e2",
              color: "#dc2626",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <LockIcon size={13} /> Lock Platform
            </span>
          </button>
        </div>
      </header>

      {/* MAIN BODY: SIDEBAR + CONTENT AREA */}
      <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 65px)" }}>
        {/* SIDEBAR NAVIGATION */}
        <aside
          style={{
            width: "240px",
            background: "#ffffff",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "0 12px 12px", fontSize: "11px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.8px" }}>
            MANAGEMENT MODULES
          </div>

          <button
            type="button"
            onClick={() => setActiveSection("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activeSection === "dashboard" ? "#111827" : "transparent",
              color: activeSection === "dashboard" ? "#ffffff" : "#4b5563",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <BarChartIcon size={16} /> Executive Dashboard
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("profiles")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activeSection === "profiles" ? "#111827" : "transparent",
              color: activeSection === "profiles" ? "#ffffff" : "#4b5563",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <MapPinIcon size={16} /> Profiles & Approvals
            </span>
            {pendingCount > 0 && (
              <span style={{ background: "#ef4444", color: "#ffffff", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 800 }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("users")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activeSection === "users" ? "#111827" : "transparent",
              color: activeSection === "users" ? "#ffffff" : "#4b5563",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <UsersIcon size={16} /> Platform Users ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("communities")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activeSection === "communities" ? "#111827" : "transparent",
              color: activeSection === "communities" ? "#ffffff" : "#4b5563",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <SparklesIcon size={16} /> Communities ({communities.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("posts")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activeSection === "posts" ? "#111827" : "transparent",
              color: activeSection === "posts" ? "#ffffff" : "#4b5563",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <MessageSquareIcon size={16} /> Feed Moderation ({posts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("legal")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              background: activeSection === "legal" ? "#111827" : "transparent",
              color: activeSection === "legal" ? "#ffffff" : "#4b5563",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <FileTextIcon size={16} /> Legal Documents
          </button>
        </aside>

        {/* CONTENT CANVAS */}
        <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {/* MODULE 1: DASHBOARD OVERVIEW */}
          {activeSection === "dashboard" && (
            <div>
              <div style={{ marginBottom: "28px" }}>
                <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: 800 }}>Executive Dashboard</h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                  Platform overview, geographic map distribution, and user activity analytics.
                </p>
              </div>

              {/* KPI STAT CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", borderLeft: "4px solid #f59e0b" }}>
                  <small style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Pending Moderation</small>
                  <h2 style={{ margin: "8px 0 0 0", fontSize: "34px", fontWeight: 800, color: "#d97706" }}>{pendingCount}</h2>
                </div>

                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", borderLeft: "4px solid #10b981" }}>
                  <small style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Live Map Profiles</small>
                  <h2 style={{ margin: "8px 0 0 0", fontSize: "34px", fontWeight: 800, color: "#16a34a" }}>{verifiedCount}</h2>
                </div>

                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", borderLeft: "4px solid #6366f1" }}>
                  <small style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Registered Users</small>
                  <h2 style={{ margin: "8px 0 0 0", fontSize: "34px", fontWeight: 800, color: "#4f46e5" }}>{users.length}</h2>
                </div>

                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", borderLeft: "4px solid #ec4899" }}>
                  <small style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Community Feed Posts</small>
                  <h2 style={{ margin: "8px 0 0 0", fontSize: "34px", fontWeight: 800, color: "#db2777" }}>{posts.length}</h2>
                </div>
              </div>

              {/* DISTRIBUTION GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 800 }}>Geographic Ecosystem Share</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {topCities.map(([city, count]) => {
                      const pct = Math.round((count / (listings.length || 1)) * 100);
                      return (
                        <div key={city}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                            <span>{city}</span>
                            <span style={{ color: "#6b7280" }}>{count} profiles ({pct}%)</span>
                          </div>
                          <div style={{ height: "8px", background: "#eeeef2", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#10b981", borderRadius: "4px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 800 }}>Entity Type Share</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f9fafb", borderRadius: "10px" }}>
                      <span style={{ fontWeight: 600 }}>Startups (`s/`)</span>
                      <span style={{ fontWeight: 800, background: "#e6f8ed", color: "#16a34a", padding: "4px 12px", borderRadius: "9999px" }}>{startupProfilesCount}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f9fafb", borderRadius: "10px" }}>
                      <span style={{ fontWeight: 600 }}>People (`p/`)</span>
                      <span style={{ fontWeight: 800, background: "#eeeffe", color: "#4f46e5", padding: "4px 12px", borderRadius: "9999px" }}>{peopleProfilesCount}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f9fafb", borderRadius: "10px" }}>
                      <span style={{ fontWeight: 600 }}>Rejected Submissions</span>
                      <span style={{ fontWeight: 800, background: "#fee2e2", color: "#dc2626", padding: "4px 12px", borderRadius: "9999px" }}>{rejectedCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 2: PROFILES TABLE */}
          {activeSection === "profiles" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: 800 }}>Map Profiles & Moderation Queue</h1>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                    Structured table of map profile submissions awaiting moderation or live on the map.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBulkApprovePending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#10b981",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <CheckIcon size={14} /> Bulk Approve ({pendingCount})
                </button>
              </div>

              {/* FILTER TOOLBAR */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
                <div style={{ display: "flex", background: "#ffffff", padding: "4px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                  <button
                    type="button"
                    onClick={() => setProfileFilterState("pending")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: profileFilterState === "pending" ? "#111827" : "transparent",
                      color: profileFilterState === "pending" ? "#ffffff" : "#4b5563",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileFilterState("verified")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: profileFilterState === "verified" ? "#111827" : "transparent",
                      color: profileFilterState === "verified" ? "#ffffff" : "#4b5563",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Approved ({verifiedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileFilterState("rejected")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: profileFilterState === "rejected" ? "#111827" : "transparent",
                      color: profileFilterState === "rejected" ? "#ffffff" : "#4b5563",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Rejected ({rejectedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileFilterState("all")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: profileFilterState === "all" ? "#111827" : "transparent",
                      color: profileFilterState === "all" ? "#ffffff" : "#4b5563",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    All ({listings.length})
                  </button>
                </div>

                <select
                  value={profileTypeFilter}
                  onChange={(e) => setProfileTypeFilter(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#ffffff",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  <option value="all">All Entity Types</option>
                  <option value="startup">Startups (s/)</option>
                  <option value="person">People (p/)</option>
                </select>

                <div style={{ flex: 1, position: "relative", minWidth: "220px" }}>
                  <input
                    type="text"
                    placeholder="Search by profile name, city, sector..."
                    value={profileSearchQuery}
                    onChange={(e) => setProfileSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#ffffff",
                      fontSize: "13px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  />
                </div>
              </div>

              {/* DATA TABLE */}
              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "12px", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>PROFILE / HANDLE</th>
                      <th style={{ padding: "12px 16px" }}>TYPE & CITY</th>
                      <th style={{ padding: "12px 16px" }}>SECTOR & STAGE</th>
                      <th style={{ padding: "12px 16px" }}>STATUS</th>
                      <th style={{ padding: "12px 16px" }}>PROOF LINKS</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "0" }}><AdminTableSkeleton rows={5} /></td>
                    </tr>
                  ) : filteredListings.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>No profiles found matching filters.</td>
                      </tr>
                    ) : (
                      filteredListings.map((item) => {
                        const handle = item.type === "person" ? `p/${item.name}` : `s/${item.name}`;
                        return (
                          <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div
                                  style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: item.type === "person" ? "50%" : "8px",
                                    background: item.logo_url ? "transparent" : "#10b981",
                                    color: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    overflow: "hidden",
                                    fontSize: "13px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {item.logo_url ? (
                                    <img src={item.logo_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    item.initials || item.name.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", background: "#e6f8ed", padding: "2px 6px", borderRadius: "4px" }}>
                                    {handle}
                                  </span>
                                  <div style={{ fontWeight: 800, fontSize: "14px", marginTop: "2px" }}>{item.name}</div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ fontWeight: 600 }}>{item.type.toUpperCase()}</div>
                              <small style={{ color: "#6b7280" }}>{item.city}, India</small>
                            </td>

                            <td style={{ padding: "14px 16px" }}>
                              <span style={{ background: "#eeeef2", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                                {item.sector}
                              </span>
                              {item.stage && <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{item.stage}</div>}
                            </td>

                            <td style={{ padding: "14px 16px" }}>
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "9999px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  background: item.review_state === "verified" ? "#dcfce7" : item.review_state === "rejected" ? "#fee2e2" : "#fef3c7",
                                  color: item.review_state === "verified" ? "#16a34a" : item.review_state === "rejected" ? "#dc2626" : "#d97706",
                                }}
                              >
                                {item.review_state || "pending"}
                              </span>
                            </td>

                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", gap: "8px" }}>
                                {item.website && (
                                  <a href={item.website} target="_blank" rel="noreferrer" title="Website" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <GlobeIcon size={13} /> Web
                                  </a>
                                )}
                                {item.tweet_url && (
                                  <a href={item.tweet_url} target="_blank" rel="noreferrer" title="Proof Tweet" style={{ color: "#16a34a", textDecoration: "none", fontWeight: 600, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <SparklesIcon size={13} /> Proof
                                  </a>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                {item.review_state !== "verified" && (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === item.id}
                                    onClick={() => handleApproveListing(item.id)}
                                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#10b981", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}
                                  >
                                    Approve
                                  </button>
                                )}
                                {item.review_state !== "rejected" && (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === item.id}
                                    onClick={() => handleRejectListing(item.id)}
                                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}
                                  >
                                    Reject
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingListing(item);
                                    setEditName(item.name);
                                    setEditCity(item.city);
                                    setEditSector(item.sector);
                                    setEditStage(item.stage || "");
                                    setEditDescription(item.description || "");
                                  }}
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "6px", border: "none", background: "#eeeffe", color: "#4f46e5", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
                                >
                                  <EditIcon size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleDeleteListing(item.id)}
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px", borderRadius: "6px", border: "none", background: "#eeeef2", color: "#6b7280", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
                                >
                                  <TrashIcon size={12} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 3: USERS TABLE */}
          {activeSection === "users" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: 800 }}>Registered Users & Security Roles</h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                  Structured table of registered platform accounts synced from Clerk.
                </p>
              </div>

              <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#ffffff",
                    fontSize: "13px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                />
              </div>

              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "12px", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>USER ACCOUNT</th>
                      <th style={{ padding: "12px 16px" }}>EMAIL ADDRESS</th>
                      <th style={{ padding: "12px 16px" }}>SECURITY ROLE</th>
                      <th style={{ padding: "12px 16px" }}>ROLE ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>No registered users found.</td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#eeeef2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>
                                {(u.full_name || u.email).substring(0, 2).toUpperCase()}
                              </div>
                              {u.full_name || "User Account"}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", color: "#4b5563" }}>{u.email}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", background: u.role === "admin" ? "#111827" : u.role === "moderator" ? "#4f46e5" : "#eeeef2", color: u.role === "admin" || u.role === "moderator" ? "#ffffff" : "#374151" }}>
                              {u.role || "user"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <select
                              value={u.role || "user"}
                              disabled={actionLoadingId === u.id}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                              style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#eeeef2", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                            >
                              <option value="user">User</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE: COMMUNITIES MANAGEMENT */}
          {activeSection === "communities" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: 800 }}>Community Management</h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Create, manage and delete ecosystem community hubs</p>
              </div>

              {/* CREATE COMMUNITY FORM CARD */}
              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>+ Create New Community</h3>
                <form onSubmit={handleCreateCommunity} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>COMMUNITY HANDLE / NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. startups, genai, saas, founders"
                      value={newCommName}
                      onChange={(e) => setNewCommName(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>DESCRIPTION (OPTIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. Discussions for founders, updates & launch announcements"
                      value={newCommDesc}
                      onChange={(e) => setNewCommDesc(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingComm || !newCommName.trim()}
                    style={{ padding: "10px 22px", borderRadius: "8px", border: "none", background: "#10b981", color: "#ffffff", fontWeight: 700, fontSize: "14px", cursor: "pointer", height: "42px" }}
                  >
                    {isCreatingComm ? "Creating..." : "+ Add Community"}
                  </button>
                </form>
              </div>

              {/* EXISTING COMMUNITIES TABLE */}
              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a", marginBottom: "16px" }}>
                  EXISTING COMMUNITIES ({communities.length})
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "12px", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>COMMUNITY HANDLE</th>
                      <th style={{ padding: "12px 16px" }}>DESCRIPTION</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communities.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                          No communities added yet. Create one using the form above!
                        </td>
                      </tr>
                    ) : (
                      communities.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "14px 16px", fontWeight: 800, color: "#10b981", fontSize: "15px" }}>
                            /{c.name.replace(/^\//, "")}
                          </td>
                          <td style={{ padding: "14px 16px", color: "#475569" }}>{c.description || "—"}</td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommunity(c.id)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}
                            >
                              <TrashIcon size={12} /> Delete Community
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 4: POSTS MODERATION TABLE */}
          {activeSection === "posts" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: 800 }}>Community Posts & Moderation Table</h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                  Monitor 24-hour community posts and remove policy-violating content.
                </p>
              </div>

              <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#ffffff",
                    fontSize: "13px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                />
              </div>

              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: "12px", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>AUTHOR</th>
                      <th style={{ padding: "12px 16px" }}>COMMUNITY</th>
                      <th style={{ padding: "12px 16px" }}>CONTENT</th>
                      <th style={{ padding: "12px 16px" }}>DATE</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>No community posts found.</td>
                      </tr>
                    ) : (
                      filteredPosts.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "14px 16px", fontWeight: 700, color: "#16a34a" }}>{p.user_name}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ background: "#eeeef2", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>
                              {p.community_name}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", color: "#374151", maxWidth: "400px" }}>{p.content}</td>
                          <td style={{ padding: "14px 16px", color: "#9ca3af", fontSize: "12px" }}>{new Date(p.created_at).toLocaleString()}</td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button
                              type="button"
                              disabled={actionLoadingId === p.id}
                              onClick={() => handleDeletePost(p.id)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}
                            >
                              <TrashIcon size={12} /> Delete Post
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODULE 6: LEGAL DOCUMENTS EDITOR */}
          {activeSection === "legal" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", fontWeight: 800 }}>Legal & Compliance Documents</h1>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                    Manage live terms of service and privacy policy documents displayed across the startup map platform.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isLegalSaving}
                  onClick={handleSaveLegalDoc}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#10b981",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: isLegalSaving ? "not-allowed" : "pointer",
                    opacity: isLegalSaving ? 0.7 : 1,
                  }}
                >
                  <CheckIcon size={16} /> {isLegalSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {legalSaveMsg && (
                <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "10px", background: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "14px", border: "1px solid #bbf7d0" }}>
                  {legalSaveMsg}
                </div>
              )}

              {/* TAB SELECTOR */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "2px solid #e5e7eb", paddingBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedLegalDoc("privacy_policy")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: selectedLegalDoc === "privacy_policy" ? "#111827" : "#f3f4f6",
                    color: selectedLegalDoc === "privacy_policy" ? "#ffffff" : "#4b5563",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Privacy Policy
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedLegalDoc("terms_of_service")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: selectedLegalDoc === "terms_of_service" ? "#111827" : "#f3f4f6",
                    color: selectedLegalDoc === "terms_of_service" ? "#ffffff" : "#4b5563",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Terms of Service
                </button>
              </div>

              {isLegalLoading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading legal content...</div>
              ) : (
                <div style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>
                      EDIT {selectedLegalDoc === "privacy_policy" ? "PRIVACY POLICY" : "TERMS OF SERVICE"} CONTENT
                    </label>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Markdown / Plain text format supported</span>
                  </div>

                  <textarea
                    rows={22}
                    value={selectedLegalDoc === "privacy_policy" ? privacyPolicyText : termsOfServiceText}
                    onChange={(e) => {
                      if (selectedLegalDoc === "privacy_policy") {
                        setPrivacyPolicyText(e.target.value);
                      } else {
                        setTermsOfServiceText(e.target.value);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #d1d5db",
                      fontFamily: "monospace, monospace",
                      fontSize: "13.5px",
                      lineHeight: "1.6",
                      color: "#1f2937",
                      background: "#f9fafb",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* EDIT PROFILE MODAL */}
      {editingListing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <form onSubmit={handleSaveEditProfile} style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", maxWidth: "480px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Edit Map Profile</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>PROFILE NAME</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>CITY</label>
                <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>SECTOR</label>
                <input type="text" value={editSector} onChange={(e) => setEditSector(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>STAGE / ROLE</label>
                <input type="text" value={editStage} onChange={(e) => setEditStage(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>DESCRIPTION</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "4px", fontSize: "14px" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditingListing(null)} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#eeeef2", color: "#374151", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10b981", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
