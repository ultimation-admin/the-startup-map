"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const tabs = [
 { href: "/", label: "Home", icon: "home" },
 { href: "/search", label: "Search", icon: "search" },
 { href: "/map", label: "Map", icon: "map" },
 { href: "/activity", label: "Activity", icon: "activity" },
 { href: "/profile", label: "Profile", icon: "profile" },
];

export function PrimaryAppShell({ children, logoUrl }: { children: React.ReactNode; logoUrl?: string | null }) {
 const pathname = usePathname() || "/";
 const isApp = tabs.some((tab) => tab.href === pathname) || pathname.startsWith("/p/") || pathname.startsWith("/s/");
 if (!isApp) return <>{children}</>;
 const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
 const link = (tab: (typeof tabs)[number], mobile = false) => <Link key={tab.href} href={tab.href} className={(mobile ? "primary-mobile-link" : "primary-sidebar-link") + (active(tab.href) ? " active" : "")} aria-label={tab.label} title={tab.label} aria-current={active(tab.href) ? "page" : undefined}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{tab.icon === "home" && <path d="M12 2.8 1.7 11.2l1.5 1.8L5 11.5V21h5.3v-6h3.4v6H19v-9.5l1.8 1.5 1.5-1.8L12 2.8Z"/>}{tab.icon === "search" && <><path d="M10.5 2a8.5 8.5 0 1 0 5.2 15.2l5 5 1.7-1.7-5-5A8.5 8.5 0 0 0 10.5 2Zm0 2.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" fillRule="evenodd"/><path d="m16.7 15.3 5.6 5.6-1.4 1.4-5.6-5.6z"/></>}{tab.icon === "map" && <path d="m2 5.8 6.5-3 7 3 6.5-3v15.4l-6.5 3-7-3-6.5 3V5.8Zm8-1.2v12.4l4 1.7V6.3l-4-1.7Zm-5 .9v10.9l2.5-1.2V4.4L5 5.5Zm12 1.3v12.2l2.5-1.2V5.7L17 6.8Z"/>}{tab.icon === "activity" && <><path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 7.2-3 9.3h18c0-2.1-3-2.3-3-9.3Z"/><path d="M9 20a3 3 0 0 0 6 0H9Z"/></>}{tab.icon === "profile" && <><circle cx="12" cy="7.5" r="4.5"/><path d="M3 21a9 9 0 0 1 18 0H3Z"/></>}</svg></Link>;
 return <div className="primary-app-shell">
   <aside className="primary-sidebar" aria-label="Primary navigation">
     <Link href="/" className="primary-brand" aria-label="The Startup Map home">{logoUrl ? <img className="primary-brand-logo" src={logoUrl} alt="The Startup Map" /> : <span className="primary-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z"/><path d="m4 6.5 8 3.5 8-3.5M12 10v11"/></svg></span>}</Link>
     <nav className="primary-sidebar-nav">{tabs.map((tab) => link(tab))}</nav>
   </aside>
   <div className="primary-app-main">
     <Link href="/" className="primary-mobile-brand" aria-label="The Startup Map home">{logoUrl ? <img src={logoUrl} alt="The Startup Map" /> : <><span className="primary-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z"/><path d="m4 6.5 8 3.5 8-3.5M12 10v11"/></svg></span><strong>Startup Map</strong></>}</Link>
     <div className="primary-main-content">{children}</div>
     {pathname !== "/map" && <aside className="primary-right-rail" aria-label="Discover the community">
       <form className="rail-search" action="/search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input name="q" aria-label="Search the community" placeholder="Search the community" /></form>
       <section className="rail-section"><p className="rail-kicker">DISCOVER</p><h2>Find your corner</h2><p className="rail-description">Meet founders, follow new ideas, and see what’s growing across India.</p><div className="rail-topic-list">{[["AI & deep tech","AI"],["SaaS","SaaS"],["Fintech","Fintech"],["Climate","Climate tech"],["Consumer","D2C"]].map(([label, query])=><Link key={label} href={`/search?q=${encodeURIComponent(query)}`} className="rail-topic">#{label.replaceAll(" ", "")}</Link>)}</div></section>
       <section className="rail-map-prompt"><span className="rail-map-icon" aria-hidden="true">⌖</span><div><h2>Out in the ecosystem?</h2><p>Find startups and people near you.</p><Link href="/map">Explore the map <span aria-hidden="true">→</span></Link></div></section>
       <footer className="rail-footer"><span>Made for people building what’s next.</span><span>© Startup Map</span></footer>
     </aside>}
   </div>
   <nav className="primary-mobile-nav" aria-label="Primary navigation">{tabs.map((tab) => link(tab, true))}</nav>
 </div>;
}
