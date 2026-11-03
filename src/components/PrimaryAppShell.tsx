"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const tabs = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/trending", label: "Trending", icon: "trending" },
  { href: "/map", label: "Map", icon: "map" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/profile", label: "Profile", icon: "profile" },
] as const;

type NavigationIconName = (typeof tabs)[number]["icon"];

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const paths: Record<NavigationIconName, React.ReactNode> = {
    home: <path d="M12 2.8 1.7 11.2l1.5 1.8L5 11.5V21h5.3v-6h3.4v6H19v-9.5l1.8 1.5 1.5-1.8L12 2.8Z" />,
    search: <><path d="M10.8 2a8.8 8.8 0 1 0 5.5 15.7l4.2 4.2 1.5-1.5-4.2-4.2A8.8 8.8 0 0 0 10.8 2Zm0 2.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2Z" /><path d="M10.8 6.2a4.4 4.4 0 0 0-4.4 4.4h2.2a2.2 2.2 0 0 1 2.2-2.2V6.2Z" /></>,
    trending: <path d="M13.4 2.2c.7 4.2-2.1 5.1-1.2 8.2.4 1.2 1.5 1.9 2.7 1.8-.2-1.5.2-3.2 1.8-4.7 3.1 2.3 4.9 5.2 4.5 8.3A9.2 9.2 0 0 1 12 24a9.2 9.2 0 0 1-9.2-9.1c0-3.7 2.2-7.4 6.1-10.5-.4 3.4.1 4.6 1.1 5.5.8-3.2 2.1-5.4 3.4-7.7Z" />,
    map: <path d="m3 5.7 6-2.4 6 2.4 6-2.4v15.4l-6 2.4-6-2.4-6 2.4V5.7Zm6-.1v12.8l6 2.4V8l-6-2.4Zm-4 .9v11.2l2-.8V5.7l-2 .8Zm14-.2-2 .8v12.1l2-.8V6.3Z" />,
    activity: <path d="M12 2a7 7 0 0 0-7 7c0 5.2-2.3 7.1-3.1 8.4-.4.7.1 1.6 1 1.6h18.2c.9 0 1.4-.9 1-1.6C21.3 16.1 19 14.2 19 9a7 7 0 0 0-7-7Zm-3 19a3 3 0 0 0 6 0H9Z" />,
    profile: <path d="M12 12a5.3 5.3 0 1 0 0-10.6A5.3 5.3 0 0 0 12 12Zm0 2c-5.6 0-10 3-10 6.7V23h20v-2.3C22 17 17.6 14 12 14Z" />,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paths[name]}</svg>;
}

export function PrimaryAppShell({ children, logoUrl }: { children: React.ReactNode; logoUrl?: string | null }) {
  const pathname = usePathname() || "/";
  const isApp = tabs.some((tab) => tab.href === pathname) || pathname.startsWith("/p/") || pathname.startsWith("/s/") || pathname === "/explore";
  if (!isApp) return <>{children}</>;

  const active = (href: string) => href === "/map"
    ? pathname === "/map" || pathname === "/explore"
    : href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  const isExploreOrMap = pathname === "/explore" || pathname === "/map" || pathname === "/search";
  const link = (tab: (typeof tabs)[number], mobile = false) => (
    <Link
      key={tab.href}
      href={tab.href}
      className={(mobile ? "primary-mobile-link" : "primary-sidebar-link") + (active(tab.href) ? " active" : "")}
      aria-label={tab.label}
      title={tab.label}
      aria-current={active(tab.href) ? "page" : undefined}
    >
      <NavigationIcon name={tab.icon} />
    </Link>
  );

  return (
    <div className={`primary-app-shell ${isExploreOrMap ? "shell-map shell-explore" : "shell-standard"}`}>
      <aside className="primary-sidebar" aria-label="Primary navigation">
        <Link href="/" className="primary-brand" aria-label="The Startup Map home">
          {logoUrl ? <img className="primary-brand-logo" src={logoUrl} alt="The Startup Map" /> : <span className="primary-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z"/><path d="m4 6.5 8 3.5 8-3.5M12 10v11"/></svg></span>}
        </Link>
        <nav className="primary-sidebar-nav" aria-label="Main sections">{tabs.map((tab) => link(tab))}</nav>
      </aside>

      <div className="primary-app-main">
        <Link href="/" className="primary-mobile-brand" aria-label="The Startup Map home">
          {logoUrl ? <img src={logoUrl} alt="The Startup Map" /> : <><span className="primary-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z"/><path d="m4 6.5 8 3.5 8-3.5M12 10v11"/></svg></span><strong>Startup Map</strong></>}
        </Link>
        <div className="primary-main-content">{children}</div>
        {!isExploreOrMap && <aside className="primary-right-rail" aria-label="Discover the community">
          <form className="rail-search" action="/search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input name="q" aria-label="Search the community" placeholder="Search the community" /></form>
          <div className="rail-section rail-discover-block"><p className="rail-kicker">DISCOVER</p><h2>Find your corner</h2><p className="rail-description">Meet founders, follow new ideas, and see what’s growing across India.</p><div className="rail-topic-list">{[["AI & deep tech","AI"],["SaaS","SaaS"],["Fintech","Fintech"],["Climate","Climate tech"],["Consumer","D2C"]].map(([label, query])=><Link key={label} href={`/search?q=${encodeURIComponent(query)}`} className="rail-topic">#{label.replaceAll(" ", "")}</Link>)}</div></div>
          <div className="rail-map-prompt rail-map-block"><div className="rail-map-content"><span className="rail-map-eyebrow">AROUND YOU</span><h2>Out in the ecosystem?</h2><p>Find startups and people near you.</p><Link href="/map">Explore the map <span aria-hidden="true">→</span></Link></div></div>
          <footer className="rail-footer">
            <nav className="rail-legal-links" aria-label="Legal"><Link href="/terms-of-service" className="rail-legal-link">Terms of Service</Link><span className="rail-legal-separator" aria-hidden="true">·</span><Link href="/privacy-policy" className="rail-legal-link">Privacy Policy</Link></nav>
            <div className="rail-copyright"><span>Made for people building what’s next.</span><span>© {new Date().getFullYear()} The Startup Map</span></div>
          </footer>
        </aside>}
      </div>
      <nav className="primary-mobile-nav" aria-label="Primary navigation">{tabs.map((tab) => link(tab, true))}</nav>
    </div>
  );
}
