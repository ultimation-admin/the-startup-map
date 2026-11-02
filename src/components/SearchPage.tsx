"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Listing } from "@/lib/db";

type Post = {
  id: string;
  content: string;
  user_name: string;
  community_name: string;
  created_at: string;
};

export type ExploreCategory = "All" | "Startups" | "People" | "Posts";

export interface SearchPageProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  selectedListingId?: string | null;
  query?: string;
  onQueryChange?: (q: string) => void;
  selectedCategory?: ExploreCategory;
  onCategoryChange?: (category: ExploreCategory) => void;
  mobileTab?: "feed" | "map";
  onToggleMobileTab?: (tab: "feed" | "map") => void;
  onOpenStudio?: (listing: Listing) => void;
}

export function SearchPage({
  listings,
  onSelectListing,
  selectedListingId,
  query: externalQuery,
  onQueryChange,
  selectedCategory: externalCategory,
  onCategoryChange,
  mobileTab,
  onToggleMobileTab,
  onOpenStudio,
}: SearchPageProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [internalCategory, setInternalCategory] = useState<ExploreCategory>("All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = onQueryChange || setInternalQuery;

  const category = externalCategory !== undefined ? externalCategory : internalCategory;
  const setCategory = onCategoryChange || setInternalCategory;

  useEffect(() => {
    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [setQuery]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts?limit=50")
      .then(async (r) => {
        if (!r.ok) throw new Error("Search is temporarily unavailable.");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setPosts(data.posts || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search is temporarily unavailable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    return listings.filter((item) => {
      const text = [item.name, item.city, item.sector, item.stage, item.description].join(" ").toLowerCase();
      const matchesType =
        category === "All" ||
        category === "Posts" ||
        (category === "Startups" ? item.type === "startup" : item.type === "person");
      return matchesType && (!q || text.includes(q));
    });
  }, [listings, category, q]);

  const postResults = useMemo(() => {
    return posts.filter(
      (post) =>
        !q || [post.content, post.user_name, post.community_name].join(" ").toLowerCase().includes(q)
    );
  }, [posts, q]);

  const trending = useMemo(() => {
    const tally = new Map<string, number>();
    listings.forEach((l) => {
      if (l.sector) tally.set(l.sector, (tally.get(l.sector) || 0) + 1);
    });
    return Array.from(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [listings]);

  return (
    <section className="tab-page search-page explore-page">
      <header className="tab-page-heading">
        <p className="eyebrow">ECOSYSTEM DISCOVERY</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <h1>Explore</h1>
          <span className="explore-pill-count">{results.length} on map</span>
        </div>
        <p>Find people, startups, and conversations across India.</p>
      </header>

      {onToggleMobileTab && (
        <div className="explore-mobile-toggle mobile-only">
          <button
            type="button"
            className={`explore-mode-btn ${mobileTab === "feed" ? "active" : ""}`}
            onClick={() => onToggleMobileTab("feed")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>List ({results.length})</span>
          </button>
          <button
            type="button"
            className={`explore-mode-btn ${mobileTab === "map" ? "active" : ""}`}
            onClick={() => onToggleMobileTab("map")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" />
            </svg>
            <span>Map View</span>
          </button>
        </div>
      )}

      <div className="explore-sticky-header">
        <label className="universal-search-field">
          <span className="sr-only">Search people, startups, and posts</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, startups, posts…"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>

        <div className="search-category-tabs" role="tablist" aria-label="Explore categories">
          {(["All", "Startups", "People", "Posts"] as ExploreCategory[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={item === category}
              className={item === category ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {!q && (
        <section className="trending-section">
          <h2>Popular across the ecosystem</h2>
          <div className="trending-chip-list">
            {trending.length ? (
              trending.map(([sector, count]) => (
                <button key={sector} type="button" onClick={() => setQuery(sector)}>
                  {sector}
                  <span>{count} {count === 1 ? "profile" : "profiles"}</span>
                </button>
              ))
            ) : (
              <p>More topics will appear as the community grows.</p>
            )}
          </div>
        </section>
      )}

      {error && <p className="tab-error" role="alert">{error}</p>}

      <div className="search-results">
        {category !== "Posts" &&
          results.map((item) => (
            <button
              className={`search-result-row ${selectedListingId === item.id ? "selected" : ""}`}
              type="button"
              key={item.id}
              onClick={() => onSelectListing(item)}
            >
              <span className="search-result-avatar">
                {item.logo_url ? <img src={item.logo_url} alt="" /> : item.initials}
              </span>
              <span>
                <strong>
                  {item.name}
                  {item.review_state === "verified" && <span className="verified-badge-mini" title="Verified">✓</span>}
                </strong>
                <small>
                  {item.type === "person" ? "Person" : item.type === "vc" ? "Investor" : "Startup"} · {item.city} · {item.sector}
                </small>
              </span>
              <span className="search-result-arrow" aria-hidden="true">→</span>
            </button>
          ))}

        {category !== "Startups" &&
          category !== "People" &&
          (loading ? (
            <p className="tab-loading" role="status">Loading discussions…</p>
          ) : (
            postResults.map((post) => (
              <a className="search-result-row" key={post.id} href={"/#post-" + post.id}>
                <span className="search-result-avatar search-result-post" aria-hidden="true">
                  P
                </span>
                <span>
                  <strong>{post.user_name} · /{post.community_name}</strong>
                  <small>{post.content}</small>
                </span>
              </a>
            ))
          ))}

        {!results.length && (!postResults.length && !loading) && (
          <div className="tab-empty-state">
            <h2>{q ? "No results found" : "Explore the Startup Map"}</h2>
            <p>{q ? "Try another name, sector, city, or keyword." : "Search for profiles and conversations above."}</p>
          </div>
        )}
      </div>
    </section>
  );
}
