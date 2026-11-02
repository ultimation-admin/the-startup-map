"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const tabs = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "compass" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

export function PrimaryAppShell({ children, logoUrl }: { children: React.ReactNode; logoUrl?: string | null }) {
  const pathname = usePathname() || "/";
  const isApp = tabs.some((tab) => tab.href === pathname) || pathname.startsWith("/p/") || pathname.startsWith("/s/") || pathname === "/map" || pathname === "/search";
  if (!isApp) return <>{children}</>;
  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/explore") return pathname === "/explore" || pathname.startsWith("/explore/") || pathname === "/map" || pathname === "/search";
    return pathname === href || pathname.startsWith(href + "/");
  };
  const link = (tab: (typeof tabs)[number], mobile = false) => <Link key={tab.href} href={tab.href} className={(mobile ? "primary-mobile-link" : "primary-sidebar-link") + (active(tab.href) ? " active" : "")} aria-label={tab.label} title={tab.label} aria-current={active(tab.href) ? "page" : undefined}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{tab.icon === "home" && <path d="M12 2.8 1.7 11.2l1.5 1.8L5 11.5V21h5.3v-6h3.4v6H19v-9.5l1.8 1.5 1.5-1.8L12 2.8Z"/>}{tab.icon === "compass" && <><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"/></>}{tab.icon === "activity" && <><path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 7.2-3 9.3h18c0-2.1-3-2.3-3-9.3Z"/><path d="M9 20a3 3 0 0 0 6 0H9Z"/></>}{tab.icon === "profile" && <><circle cx="12" cy="7.5" r="4.5"/><path d="M3 21a9 9 0 0 1 18 0H3Z"/></>}</svg></Link>;
  const isExploreOrMap = pathname === "/explore" || pathname === "/map" || pathname.startsWith("/explore/") || pathname === "/search";
  return <div className={`primary-app-shell ${isExploreOrMap ? "shell-map shell-explore" : "shell-standard"}`}>
    <aside className="primary-sidebar" aria-label="Primary navigation">
      <Link href="/" className="primary-brand" aria-label="The Startup Map home">{logoUrl ? <img className="primary-brand-logo" src={logoUrl} alt="The Startup Map" /> : <span className="primary-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z"/><path d="m4 6.5 8 3.5 8-3.5M12 10v11"/></svg></span>}</Link>
      <nav className="primary-sidebar-nav">{tabs.map((tab) => link(tab))}</nav>
    </aside>
    <div className="primary-app-main">
      <Link href="/" className="primary-mobile-brand" aria-label="The Startup Map home">{logoUrl ? <img src={logoUrl} alt="The Startup Map" /> : <><span className="primary-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z"/><path d="m4 6.5 8 3.5 8-3.5M12 10v11"/></svg></span><strong>Startup Map</strong></>}</Link>
      <div className="primary-main-content">{children}</div>
      {!isExploreOrMap && <aside className="primary-right-rail" aria-label="Discover the community">
        <form className="rail-search" action="/explore"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input name="q" aria-label="Search the community" placeholder="Search the community" /></form>
        <div className="rail-section rail-discover-block"><p className="rail-kicker">DISCOVER</p><h2>Find your corner</h2><p className="rail-description">Meet founders, follow new ideas, and see what’s growing across India.</p><div className="rail-topic-list">{[["AI & deep tech","AI"],["SaaS","SaaS"],["Fintech","Fintech"],["Climate","Climate tech"],["Consumer","D2C"]].map(([label, query])=><Link key={label} href={`/explore?q=${encodeURIComponent(query)}`} className="rail-topic">#{label.replaceAll(" ", "")}</Link>)}</div></div>
        <div className="rail-map-prompt rail-map-block"><div className="rail-map-content"><span className="rail-map-eyebrow">AROUND YOU</span><h2>Out in the ecosystem?</h2><p>Find startups and people near you.</p><Link href="/explore">Explore the map <span aria-hidden="true">→</span></Link></div></div>
        <footer className="rail-footer">
          <nav className="rail-legal-links" aria-label="Legal">
            <Link href="/terms-of-service" className="rail-legal-link">Terms of Service</Link>
            <span className="rail-legal-separator" aria-hidden="true">·</span>
            <Link href="/privacy-policy" className="rail-legal-link">Privacy Policy</Link>
          </nav>
          <div className="rail-copyright">
            <span>Made for people building what’s next.</span>
            <span>© {new Date().getFullYear()} The Startup Map</span>
          </div>
        </footer>
      </aside>}
    </div>
    <nav className="primary-mobile-nav" aria-label="Primary navigation">{tabs.map((tab) => link(tab, true))}</nav>
  </div>;
}
