"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Listing, fetchListings } from "@/lib/db";
import { getPublicMediaUrl, getFaviconMimeType } from "@/lib/r2";

const Map = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.Map),
  { ssr: false }
);
const MapMarker = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.MapMarker),
  { ssr: false }
);
const MarkerContent = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.MarkerContent),
  { ssr: false }
);
import { AddListingForm } from "@/components/AddListingForm";
import { UserProfilePanel } from "@/components/UserProfilePanel";
import { ProfileAvatarStack } from "@/components/ProfileAvatarStack";
import { DedicatedProfileStudio } from "@/components/DedicatedProfileStudio";
import { SpotlightsBar } from "@/components/SpotlightsBar";
import { InlineSpotlightStoryPlayer } from "@/components/InlineSpotlightStoryPlayer";
import { CommunityFeed } from "@/components/CommunityFeed";
import { SearchPage } from "@/components/SearchPage";
import { ActivityPage } from "@/components/ActivityPage";
import { SpotlightStory } from "@/lib/spotlights";
import { JobPostingsModal } from "@/components/JobPostingsModal";
import { FeedOnboardingModal } from "@/components/FeedOnboardingModal";
import { SignInHeaderIllustration, SignUpHeaderIllustration } from "@/components/AuthIllustrations";

import { SearchIcon, MapPinIcon } from "@/components/Icons";
import {
  CityDropdownSelector,
  CITIES,
  CITY_COORDS,
  CITY_BOUNDS,
} from "@/components/CityDropdown";

import {
  SignIn,
  SignUp,
  useUser,
} from "@clerk/nextjs";

import {
  FilterDropdown,
  TYPE_OPTIONS,
  STARTUP_STAGE_OPTIONS,
  STARTUP_SECTOR_OPTIONS,
  PEOPLE_ROLE_OPTIONS,
  PEOPLE_SECTOR_OPTIONS,
  VC_STAGE_OPTIONS,
  VC_TYPE_OPTIONS,
} from "@/components/FilterDropdowns";

const clerkInlineAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-0 p-0 bg-transparent",
    card: "w-full shadow-none border-0 p-0 bg-transparent flex flex-col",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    main: "flex flex-col gap-0 p-0 m-0",
    form: "order-1 flex flex-col p-0 m-0",
    formFieldRow: "mb-1.5",
    formField: "mb-1.5",
    formFieldLabelRow: "block mb-0.5",
    formFieldLabel: "text-[11.5px] font-semibold text-[#5B6368] normal-case block mb-0.5",
    formFieldInput:
      "rounded-[10px] border border-transparent bg-[#F0F2F5] focus:bg-white focus:border-[#f85900] focus:ring-2 focus:ring-[#f85900]/25 text-[13px] px-3 text-black font-medium transition-all duration-100 placeholder:text-[#666666] h-[38px]",
    formButtonPrimary:
      "bg-[#f85900] hover:bg-[#e04f00] text-white font-semibold rounded-full h-[38px] text-[13.5px] normal-case shadow-none transition-all duration-100 hover:scale-[1.01] active:scale-[0.98] mt-1",
    dividerRow: "order-2 my-2",
    dividerLine: "bg-[#E7EAED]",
    dividerText: "text-[11px] font-medium text-[#5B6368] lowercase px-2 bg-white",
    socialButtons: "order-3 flex flex-col gap-1.5 m-0",
    socialButtonsRoot: "order-3 m-0",
    socialButtonsBlockButton:
      "rounded-full border border-[#E7EAED] bg-white hover:bg-[#F0F2F5] text-black text-[13px] font-semibold h-[38px] px-4 transition-all duration-100 hover:scale-[1.01] active:scale-[0.98] shadow-xs",
    socialButtonsBlockButtonText: "font-semibold text-[13px] text-black",
    footer: "hidden",
    footerAction: "hidden",
    identityPreview: "rounded-[10px] border border-[#E7EAED] bg-[#F0F2F5] p-2 text-xs",
  },
};

function ClerkUserSubscriber({
  onAuthChange,
}: {
  onAuthChange: (auth: { user: any; isSignedIn: boolean; isLoaded: boolean }) => void;
}) {
  const { user, isSignedIn, isLoaded } = useUser();
  const prevRef = useRef<{ userId: string; isSignedIn: boolean; isLoaded: boolean }>({
    userId: "",
    isSignedIn: false,
    isLoaded: false,
  });

  useEffect(() => {
    const currentUserId = user?.id || "";
    const currentIsSignedIn = !!isSignedIn;
    const currentIsLoaded = !!isLoaded;

    if (
      currentUserId !== prevRef.current.userId ||
      currentIsSignedIn !== prevRef.current.isSignedIn ||
      currentIsLoaded !== prevRef.current.isLoaded
    ) {
      prevRef.current = { userId: currentUserId, isSignedIn: currentIsSignedIn, isLoaded: currentIsLoaded };
      onAuthChange({ user: user || null, isSignedIn: currentIsSignedIn, isLoaded: currentIsLoaded });
    }
  }, [user, isSignedIn, isLoaded, onAuthChange]);

  return null;
}

interface HomeClientProps {
  initialBranding?: {
    logo_url: string | null;
    favicon_url: string | null;
  };
  initialTab?: "home" | "explore" | "search" | "map" | "activity" | "profile";
}

export default function HomeClient({ initialBranding, initialTab = "home" }: HomeClientProps) {
  const tab = initialTab;
  const isExploreTab = tab === "explore" || tab === "map" || tab === "search";
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [authData, setAuthData] = useState<{ user: any; isSignedIn: boolean; isLoaded: boolean }>({
    user: null,
    isSignedIn: false,
    isLoaded: false,
  });
  const { user: clerkUser, isSignedIn, isLoaded: isClerkLoaded } = authData;

  const handleAuthChange = useCallback((auth: { user: any; isSignedIn: boolean; isLoaded: boolean }) => {
    setAuthData(auth);
  }, []);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [query, setQuery] = useState("");

  // Primary Type selection
  const [selectedType, setSelectedType] = useState("All Types");

  // Secondary Type-Specific filter selections
  const [selectedStage, setSelectedStage] = useState("All Stages");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedVcStage, setSelectedVcStage] = useState("All Investment Stages");
  const [selectedVcType, setSelectedVcType] = useState("All Fund Types");
  const [selectedCity, setSelectedCity] = useState("All Cities");

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setSelectedStage("All Stages");
    setSelectedSector("All Sectors");
    setSelectedRole("All Roles");
    setSelectedVcStage("All Investment Stages");
    setSelectedVcType("All Fund Types");
  };
  const [mobileTab, setMobileTab] = useState<"feed" | "map">(initialTab === "map" ? "map" : "feed");
  const [pickedCoords, setPickedCoords] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const [profileLookupError, setProfileLookupError] = useState(false);
  const authDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMounted || map) return;
    const timer = window.setTimeout(() => setMapError(true), 12000);
    return () => window.clearTimeout(timer);
  }, [isMounted, map, mapRetryKey]);


  const [loading, setLoading] = useState(true);
  type LeftView = "explore" | "add-listing" | "sign-in" | "sign-up" | "profile" | "studio" | "spotlight-story" | "feed";
  const [leftView, setLeftView] = useState<LeftView>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get("view");
      if (v === "sign-in" || v === "sign-up") return v as LeftView;
      const pathname = window.location.pathname.replace(/^\/|\/$/g, "");
      if (pathname === "sign-in" || pathname === "sign-up") return pathname as LeftView;
    }
    return "explore";
  });
  useEffect(() => {
    if (leftView === "sign-in" || leftView === "sign-up") authDialogRef.current?.focus();
  }, [leftView]);

  const [activeProfileForStudio, setActiveProfileForStudio] = useState<Listing | null>(null);
  const [activeSpotlightsList, setActiveSpotlightsList] = useState<SpotlightStory[]>([]);
  const [activeSpotlightIndex, setActiveSpotlightIndex] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showFeedOnboarding, setShowFeedOnboarding] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [userJoinedCommunities, setUserJoinedCommunities] = useState<string[]>([]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCity !== "All Cities" ||
      selectedType !== "All Types" ||
      selectedStage !== "All Stages" ||
      selectedSector !== "All Sectors" ||
      selectedRole !== "All Roles" ||
      selectedVcStage !== "All Investment Stages" ||
      selectedVcType !== "All Fund Types" ||
      query !== ""
    );
  }, [selectedCity, selectedType, selectedStage, selectedSector, selectedRole, selectedVcStage, selectedVcType, query]);

  const handleResetFilters = () => {
    setSelectedCity("All Cities");
    setSelectedType("All Types");
    setSelectedStage("All Stages");
    setSelectedSector("All Sectors");
    setSelectedRole("All Roles");
    setSelectedVcStage("All Investment Stages");
    setSelectedVcType("All Fund Types");
    setQuery("");
  };

  // Branding (Logo & Favicon) Real-Time Sync State initialized with SSR initialBranding or localStorage cache
  const [branding, setBranding] = useState<{ logo_url: string | null; favicon_url: string | null }>(() => {
    if (initialBranding?.logo_url || initialBranding?.favicon_url) {
      return {
        logo_url: getPublicMediaUrl(initialBranding.logo_url) || null,
        favicon_url: getPublicMediaUrl(initialBranding.favicon_url) || null,
      };
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("startupmap_branding_cache");
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            logo_url: getPublicMediaUrl(parsed.logo_url) || null,
            favicon_url: getPublicMediaUrl(parsed.favicon_url) || null,
          };
        }
      } catch {}
    }
    return { logo_url: null, favicon_url: null };
  });
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const updateFaviconHeadLink = (faviconUrl: string | null) => {
    if (typeof document === "undefined") return;
    const resolvedUrl = getPublicMediaUrl(faviconUrl) || "/favicon.ico";
    const mimeType = getFaviconMimeType(resolvedUrl);

    try {
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      if (existingLinks.length > 0) {
        existingLinks.forEach((el: Element) => {
          try {
            el.setAttribute("href", resolvedUrl);
            if (mimeType) el.setAttribute("type", mimeType);
          } catch {}
        });
      } else {
        const linkIcon = document.createElement("link");
        linkIcon.rel = "icon";
        linkIcon.type = mimeType;
        linkIcon.href = resolvedUrl;
        document.head.appendChild(linkIcon);
      }
    } catch (e) {
      console.error("Failed to update favicon head links:", e);
    }
  };

  const applyBrandingUpdate = (data: { logo_url?: string | null; favicon_url?: string | null }) => {
    const logo = getPublicMediaUrl(data.logo_url) || null;
    const favicon = getPublicMediaUrl(data.favicon_url) || null;
    const nextObj = { logo_url: logo, favicon_url: favicon };
    setBranding(nextObj);
    setLogoLoadFailed(false);
    updateFaviconHeadLink(favicon);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("startupmap_branding_cache", JSON.stringify(nextObj));
      } catch {}
    }
  };

  useEffect(() => {
    // Initial fetch of site branding with cache-busting
    fetch("/api/branding", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          applyBrandingUpdate(data);
        }
      })
      .catch(() => {});

    // Listen to BroadcastChannel for cross-tab real-time sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("startupmap_branding_channel");
      bc.onmessage = (e) => {
        if (e.data && e.data.type === "BRANDING_UPDATED") {
          applyBrandingUpdate(e.data);
        }
      };
    }

    // Listen to CustomEvent for same-tab instant sync
    const handleCustomBrandingEvent = (e: any) => {
      if (e.detail) {
        applyBrandingUpdate(e.detail);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("startupmap_branding_updated", handleCustomBrandingEvent);
    }

    return () => {
      if (bc) bc.close();
      if (typeof window !== "undefined") {
        window.removeEventListener("startupmap_branding_updated", handleCustomBrandingEvent);
      }
    };
  }, []);

  // 3-State touch-draggable bottom sheet ("collapsed" | "default" | "max")
  const [mobileDrawerState, setMobileDrawerState] = useState<"collapsed" | "default" | "max">("default");
  const [dragOffsetY, setDragOffsetY] = useState<number | null>(null);

  useEffect(() => {
    if (map) {
      const timer = setTimeout(() => {
        map.resize();
      }, 330);
      return () => clearTimeout(timer);
    }
  }, [mobileDrawerState, map]);

  const touchStartRef = useRef<{ startY: number; startTime: number; initialState: "collapsed" | "default" | "max" } | null>(null);
  const touchLastRef = useRef<{ lastY: number; lastTime: number; velocityY: number }>({ lastY: 0, lastTime: 0, velocityY: 0 });
  const rafIdRef = useRef<number | null>(null);

  const handleDrawerTouchStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const targetEl = e.target as HTMLElement;
    const isHandle = !!targetEl.closest(".mobile-drawer-handle-bar");

    // Prevent sheet drag initiation if scrolling content inside controls-scroll unless touch starts on handle bar or scrollTop is 0
    if (!isHandle) {
      const scrollEl = targetEl.closest(".controls-scroll") as HTMLElement;
      if (scrollEl && scrollEl.scrollTop > 0) {
        return;
      }
    }

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const now = Date.now();
    touchStartRef.current = { startY: clientY, startTime: now, initialState: mobileDrawerState };
    touchLastRef.current = { lastY: clientY, lastTime: now, velocityY: 0 };
    setDragOffsetY(0);
  };

  const handleDrawerTouchMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - touchStartRef.current.startY;

    const targetEl = e.target as HTMLElement;
    const isHandle = !!targetEl.closest(".mobile-drawer-handle-bar");
    if (!isHandle && deltaY < 0 && mobileDrawerState === "max") {
      // User is scrolling content upwards in max state, let native scroll handle it
      return;
    }

    const now = Date.now();
    const dt = Math.max(1, now - touchLastRef.current.lastTime);
    const dy = clientY - touchLastRef.current.lastY;
    const velocityY = dy / dt; // px / ms

    touchLastRef.current = { lastY: clientY, lastTime: now, velocityY };

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      setDragOffsetY(deltaY);
    });
  };

  const handleDrawerTouchEnd = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (!touchStartRef.current || dragOffsetY === null) {
      touchStartRef.current = null;
      setDragOffsetY(null);
      return;
    }

    const deltaY = dragOffsetY;
    const { initialState } = touchStartRef.current;
    const { velocityY } = touchLastRef.current;

    if (Math.abs(deltaY) < 8) {
      if (initialState === "collapsed") setMobileDrawerState("default");
      else if (initialState === "default") setMobileDrawerState("max");
      else setMobileDrawerState("default");
    } else if (velocityY < -0.2 || deltaY < -30) {
      if (initialState === "collapsed") setMobileDrawerState("default");
      else if (initialState === "default") setMobileDrawerState("max");
      else setMobileDrawerState("max");
    } else if (velocityY > 0.2 || deltaY > 30) {
      if (initialState === "max") setMobileDrawerState("default");
      else if (initialState === "default") setMobileDrawerState("collapsed");
      else setMobileDrawerState("collapsed");
    }

    touchStartRef.current = null;
    setDragOffsetY(null);
  };

  // Automatically sync Clerk user profile with D1 database upon sign-in/up and check feed onboarding status
  useEffect(() => {
    if (isSignedIn && clerkUser) {
      const onboardedKey = `startupmap_feed_onboarded_${clerkUser.id}`;
      const hasOnboarded = typeof window !== "undefined" ? localStorage.getItem(onboardedKey) : "true";

      if (typeof window !== "undefined") {
        const savedInt = localStorage.getItem(`startupmap_interests_${clerkUser.id}`);
        if (savedInt) {
          try { setUserInterests(JSON.parse(savedInt)); } catch {}
        }
        const savedCom = localStorage.getItem(`startupmap_communities_${clerkUser.id}`);
        if (savedCom) {
          try { setUserJoinedCommunities(JSON.parse(savedCom)); } catch {}
        }
      }

      fetch(`/api/listings?owner_id=${encodeURIComponent(clerkUser.id)}`)
        .then((res) => res.json())
        .then((data) => {
          const listings = Array.isArray(data) ? data : (data.listings || []);
          const isApproved = listings.some((l: any) => l.review_state === "verified" || l.review_state === "approved");
          const dismissedAt = Number(localStorage.getItem(`startupmap_feed_onboarding_dismissed_${clerkUser.id}`) || 0);
          const recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
          if (isApproved && !hasOnboarded && !recentlyDismissed) {
            setShowFeedOnboarding(true);
          }
        })
        .catch(() => {});

      fetch("/api/profile/sync", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.hasProfile === false) {
            // New sign up without profile -> Auto-prompt 1-step profile creation
            if (leftView === "sign-in" || leftView === "sign-up") {
              setLeftView("add-listing");
            }
          } else if (leftView === "sign-in" || leftView === "sign-up") {
            setLeftView("explore");
          }
        })
        .catch((err) => {
          console.error("Failed to sync Clerk user profile:", err);
          if (leftView === "sign-in" || leftView === "sign-up") {
            setLeftView("explore");
          }
        });
    } else if (isSignedIn && (leftView === "sign-in" || leftView === "sign-up")) {
      setLeftView("explore");
    }
  }, [isSignedIn, clerkUser, leftView]);

  // Parse filters from URL search params on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const city = searchParams.get("city");
      const type = searchParams.get("type");
      const stage = searchParams.get("stage");
      const sector = searchParams.get("sector");
      const role = searchParams.get("role");
      const vcStage = searchParams.get("vc_stage");
      const vcType = searchParams.get("vc_type");
      const q = searchParams.get("q");
      const viewParam = searchParams.get("view");

      if (viewParam && ["sign-in", "sign-up", "add-listing"].includes(viewParam)) {
        setLeftView(viewParam as LeftView);
      }
      if (city) setSelectedCity(city);
      if (type) setSelectedType(type);
      if (stage) setSelectedStage(stage);
      if (sector) setSelectedSector(sector);
      if (role) setSelectedRole(role);
      if (vcStage) setSelectedVcStage(vcStage);
      if (vcType) setSelectedVcType(vcType);
      if (q) {
        setQuery(q);
        setIsSearchOpen(true);
      }
    }
  }, []);

  // Sync active filters to URL search parameters without triggering a full page reload
  const isFilterMounted = useRef(false);
  useEffect(() => {
    if (!isFilterMounted.current) {
      isFilterMounted.current = true;
      return;
    }
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    if (selectedCity && selectedCity !== "All Cities") searchParams.set("city", selectedCity);
    else searchParams.delete("city");

    if (selectedType && selectedType !== "All Types") searchParams.set("type", selectedType);
    else searchParams.delete("type");

    if (selectedStage && selectedStage !== "All Stages") searchParams.set("stage", selectedStage);
    else searchParams.delete("stage");

    if (selectedSector && selectedSector !== "All Sectors") searchParams.set("sector", selectedSector);
    else searchParams.delete("sector");

    if (selectedRole && selectedRole !== "All Roles") searchParams.set("role", selectedRole);
    else searchParams.delete("role");

    if (selectedVcStage && selectedVcStage !== "All Investment Stages") searchParams.set("vc_stage", selectedVcStage);
    else searchParams.delete("vc_stage");

    if (selectedVcType && selectedVcType !== "All Fund Types") searchParams.set("vc_type", selectedVcType);
    else searchParams.delete("vc_type");

    if (query && query.trim() !== "") searchParams.set("q", query);
    else searchParams.delete("q");

    const newSearch = searchParams.toString();
    const newPath = url.pathname + (newSearch ? `?${newSearch}` : "");
    window.history.replaceState(window.history.state, "", newPath);
  }, [selectedCity, selectedType, selectedStage, selectedSector, selectedRole, selectedVcStage, selectedVcType, query]);

  const loadListings = async () => {
    try {
      const data = await fetchListings();
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings:", err);
    }
  };
  const selectedCardRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [jobsListing, setJobsListing] = useState<Listing | null>(null);

  const isProgrammaticFlyRef = useRef(false);
  const selectedCityRef = useRef(selectedCity);
  useEffect(() => {
    selectedCityRef.current = selectedCity;
  }, [selectedCity]);

  const flyToCity = (city: string, mapObj: MapLibreMap | null) => {
    if (!mapObj) return;
    isProgrammaticFlyRef.current = true;

    if (city === "All Cities") {
      mapObj.flyTo({
        center: [78.96, 22.0],
        zoom: 4.3,
        pitch: 0,
        bearing: 0,
        speed: 0.9,
        curve: 1.42,
        duration: 1200,
        essential: true,
      });
    } else {
      const bounds = CITY_BOUNDS[city];
      if (bounds) {
        mapObj.fitBounds(bounds, {
          padding: 12,
          maxZoom: 13.7,
          pitch: 60,
          bearing: -10,
          speed: 0.9,
          curve: 1.42,
          duration: 1200,
          essential: true,
        });
      } else {
        const coords = CITY_COORDS[city];
        if (coords) {
          mapObj.flyTo({
            center: coords,
            zoom: 13.2,
            pitch: 60,
            bearing: -10,
            speed: 0.9,
            curve: 1.42,
            duration: 1200,
            essential: true,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (!map) return;

    const handleMapMove = () => {
      if (isProgrammaticFlyRef.current) {
        isProgrammaticFlyRef.current = false;
        return;
      }
      const city = selectedCityRef.current;
      if (city === "All Cities") return;

      const bounds = CITY_BOUNDS[city];
      if (!bounds) return;

      const center = map.getCenter();
      const currentZoom = map.getZoom();
      const [[swLng, swLat], [neLng, neLat]] = bounds;

      const isOutsideCity =
        center.lng < swLng || center.lng > neLng || center.lat < swLat || center.lat > neLat;
      const isZoomedOut = currentZoom < 9.2;

      if (isOutsideCity || isZoomedOut) {
        setSelectedCity("All Cities");
      }
    };

    map.on("moveend", handleMapMove);

    // Initial camera positioning if reload specifies a city in URL
    const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const cityParam = searchParams.get("city") || selectedCity;
    const pathParts = typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean) : [];
    const isProfileRoute = pathParts.length === 2 && (pathParts[0] === "p" || pathParts[0] === "s");

    if (cityParam && cityParam !== "All Cities" && !isProfileRoute) {
      flyToCity(cityParam, map);
    }

    return () => {
      map.off("moveend", handleMapMove);
    };
  }, [map]);

  // Configure Map Labels:
  // 1. "All Cities" view: ONLY display the 6 cities in our selector.
  // 2. Zoomed city view: City name in H2 sizing (20px), ONLY Tier-1 key startup hub area names in fixed H4 sizing (11px).
  useEffect(() => {
    if (!map) return;

    const ALLOWED_ALL_CITIES = [
      "Bengaluru", "Bangalore",
      "Delhi", "New Delhi", "Delhi NCR",
      "Mumbai", "Bombay",
      "Hyderabad",
      "Pune",
      "Chennai", "Madras"
    ];

    const IMPORTANT_AREAS = [
      // ===== BENGALURU =====
      "Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "Electronic City",
      "Jayanagar", "JP Nagar", "Marathahalli", "Bellandur", "MG Road", "Hebbal",
      "Yelahanka", "Rajajinagar", "Malleshwaram", "Banashankari", "Sarjapur",
      "Sarjapur Road", "BTM Layout", "Domlur", "Kalyan Nagar", "Richmond Town",
      "Vasanth Nagar", "Sadashivnagar", "Frazer Town", "Ulsoor", "Cunningham Road",
      "Commercial Street", "Lavelle Road", "Residency Road", "Old Airport Road",
      "CV Raman Nagar", "Kammanahalli", "Banaswadi", "HRBR Layout", "Kaggadasapura",
      "Doddanekundi", "Hoodi", "KR Puram", "Kadubeesanahalli", "Brookefield",
      "Varthur", "Bannerghatta Road", "Arekere", "Hulimavu", "Gottigere",
      "Kumaraswamy Layout", "Padmanabhanagar", "Uttarahalli", "Kengeri", "Nagarbhavi",
      "Vijayanagar", "Basaveshwaranagar", "Yeshwanthpur", "Peenya", "Mathikere",
      "RMV 2nd Stage", "Sanjay Nagar", "RT Nagar", "Sahakar Nagar", "Thanisandra",
      "Hennur", "Horamavu", "Ramamurthy Nagar", "Electronic City Phase 1", "Electronic City Phase 2",

      // ===== DELHI NCR =====
      "Gurgaon", "Gurugram", "Cyber City", "DLF Cyber City", "DLF Phase 1", "DLF Phase 2",
      "DLF Phase 3", "DLF Phase 4", "DLF Phase 5", "Golf Course Road", "Golf Course Extension",
      "Sohna Road", "MG Road Gurgaon", "Udyog Vihar", "Noida", "Greater Noida", "Noida Sector 62",
      "Noida Sector 18", "Noida Sector 63", "Noida Sector 125", "Noida Sector 132", "Noida Sector 142",
      "Connaught Place", "South Delhi", "Hauz Khas", "Okhla", "Faridabad", "Ghaziabad",
      "Dwarka", "Saket", "Nehru Place", "Cyber Hub", "Vasant Kunj", "Aerocity", "Vasant Vihar",
      "Greater Kailash", "GK 1", "GK 2", "Defence Colony", "Lajpat Nagar", "Karol Bagh",
      "Pitampura", "Rohini", "Janakpuri", "Rajouri Garden", "Netaji Subhash Place", "NSP",
      "Laxmi Nagar", "Preet Vihar", "Mayur Vihar", "Indirapuram", "Vaishali", "Crossings Republik",

      // ===== MUMBAI =====
      "Bandra", "Bandra East", "Bandra West", "BKC", "Bandra Kurla Complex", "Powai",
      "Lower Parel", "Andheri", "Andheri East", "Andheri West", "Worli", "Juhu",
      "Nariman Point", "Thane", "Navi Mumbai", "Malad", "Goregaon", "Vashi", "Prabhadevi",
      "Mahalaxmi", "Dadar", "Matunga", "Sion", "Kurla", "Ghatkopar", "Vikhroli",
      "Kanjurmarg", "Bhandup", "Mulund", "Thane West", "Thane East", "Belapur", "CBD Belapur",
      "Kharghar", "Nerul", "Airoli", "Ghansoli", "Juhu Scheme", "Santacruz", "Vile Parle",
      "Borivali", "Kandivali", "Chembur", "Trombay", "Colaba", "Fort", "Marine Lines", "Churchgate",

      // ===== HYDERABAD =====
      "HITEC City", "Hitech City", "Gachibowli", "Madhapur", "Jubilee Hills", "Banjara Hills",
      "Kondapur", "Kukatpally", "Begumpet", "Secunderabad", "Financial District", "Nanakramguda",
      "Raidurg", "Manikonda", "Khajaguda", "Puppalguda", "Hafeezpet", "Miyapur", "KPHB",
      "Ameerpet", "SR Nagar", "Panjagutta", "Somajiguda", "Himayatnagar", "Abids", "Koti",
      "LB Nagar", "Dilsukhnagar", "Uppal", "Nacharam", "Tarnaka", "Malkajgiri", "Kompally",

      // ===== PUNE =====
      "Baner", "Hinjewadi", "Hinjawadi", "Viman Nagar", "Kharadi", "Kothrud", "Aundh",
      "Hadapsar", "Wakad", "Pimple Saudagar", "Magarpatta", "Balewadi", "Pashan", "Bavdhan",
      "Kalyani Nagar", "Koregaon Park", "Camp", "JM Road", "FC Road", "Shivajinagar",
      "Deccan", "Swargate", "Katraj", "Bibwewadi", "Wanowrie", "Nibm", "Kondhwa",
      "Undri", "Pimpri", "Chinchwad", "Tathawade", "Ravet", "Pimple Nilakh", "Bhosari",

      // ===== CHENNAI =====
      "OMR", "Guindy", "Velachery", "T. Nagar", "T Nagar", "Adyar", "Nungambakkam",
      "Taramani", "Perungudi", "Anna Nagar", "Sholinganallur", "Egmore", "Mylapore",
      "Alwarpet", "Besant Nagar", "Kotturpuram", "Royapettah", "Mount Road", "Porur",
      "Vadapalani", "Kodambakkam", "Koyambedu", "Ambattur", "Chromepet", "Tambaram",
      "Navalur", "Siruseri", "Karapakkam", "Thoraipakkam", "Pallavaram"
    ];

    const configureMapLabels = () => {
      try {
        const style = map.getStyle();
        if (!style || !style.layers) return;

        const bounds = selectedCity !== "All Cities" ? CITY_BOUNDS[selectedCity] : null;

        let cityPolygonGeoJSON: any = null;
        if (bounds) {
          const [[swLng, swLat], [neLng, neLat]] = bounds;
          cityPolygonGeoJSON = {
            type: "Polygon",
            coordinates: [[
              [swLng, swLat],
              [neLng, swLat],
              [neLng, neLat],
              [swLng, neLat],
              [swLng, swLat],
            ]],
          };
        }

        style.layers.forEach((layer) => {
          if (layer.type === "symbol") {
            const id = layer.id.toLowerCase();

            // 1. MAIN CITY LABEL LAYER (matches place_city, place_city_large, place_city_medium, place_city_small, place_capital)
            const isMainCityLayer =
              id.includes("city") ||
              id.includes("capital") ||
              id.includes("metropolis");

            // 2. ROAD / HIGHWAY / EXPRESSWAY LABEL LAYER
            const isRoadLayer =
              id.includes("road") ||
              id.includes("highway") ||
              id.includes("transportation") ||
              id.includes("street") ||
              id.includes("way");

            // 3. AREA / SUBURB / LOCALITY / TOWN LAYER
            const isAreaLayer =
              id.includes("suburb") ||
              id.includes("neighbourhood") ||
              id.includes("locality") ||
              id.includes("town") ||
              id.includes("village") ||
              id.includes("district") ||
              id.includes("place");

            if (selectedCity === "All Cities") {
              if (isMainCityLayer) {
                // In All Cities view: display the 6 selector cities cleanly in subtle 13px size
                map.setLayoutProperty(layer.id, "visibility", "visible");
                try {
                  map.setLayoutProperty(layer.id, "text-size", 13);
                  map.setLayoutProperty(layer.id, "text-allow-overlap", true);
                  map.setFilter(layer.id, [
                    "match",
                    ["get", "name"],
                    ALLOWED_ALL_CITIES,
                    true,
                    false,
                  ]);
                } catch (e) {
                  map.setFilter(layer.id, null);
                }
              } else if (isRoadLayer) {
                // Keep major highways/expressways visible for context
                map.setLayoutProperty(layer.id, "visibility", "visible");
                map.setFilter(layer.id, null);
              } else {
                // Hide minor area/suburb labels in national view
                map.setLayoutProperty(layer.id, "visibility", "none");
              }
            } else {
              // Zoomed into a specific city:
              if (isMainCityLayer) {
                // Main City Name displayed in H2 sizing (22px bold) - ONLY selector cities
                map.setLayoutProperty(layer.id, "visibility", "visible");
                try {
                  map.setLayoutProperty(layer.id, "text-size", ["interpolate", ["linear"], ["zoom"], 0, 22, 24, 22]);
                  map.setFilter(layer.id, [
                    "match",
                    ["get", "name"],
                    ALLOWED_ALL_CITIES,
                    true,
                    false,
                  ]);
                } catch (e) {
                  map.setFilter(layer.id, null);
                }
              } else if (isRoadLayer) {
                // Road & expressway names preserved for navigation
                map.setLayoutProperty(layer.id, "visibility", "visible");
                map.setFilter(layer.id, null);
              } else if (isAreaLayer) {
                // Tier-1 & Tier-2 Area Names in fixed H4 sizing (11.5px)
                map.setLayoutProperty(layer.id, "visibility", "visible");
                try {
                  map.setLayoutProperty(layer.id, "text-size", ["interpolate", ["linear"], ["zoom"], 0, 11.5, 24, 11.5]);
                  map.setFilter(layer.id, [
                    "all",
                    ["match", ["get", "name"], IMPORTANT_AREAS, true, false],
                    cityPolygonGeoJSON ? ["within", cityPolygonGeoJSON] : true
                  ]);
                } catch (e) {
                  try {
                    map.setFilter(layer.id, [
                      "match",
                      ["get", "name"],
                      IMPORTANT_AREAS,
                      true,
                      false,
                    ]);
                  } catch (e2) {
                    map.setFilter(layer.id, null);
                  }
                }
              } else {
                // Hide all other minor cluttering POI/hamlet layers
                map.setLayoutProperty(layer.id, "visibility", "none");
              }
            }
          }
        });
      } catch (err) {
        console.warn("Could not configure map labels:", err);
      }
    };

    if (map.isStyleLoaded()) {
      configureMapLabels();
    } else {
      map.once("style.load", configureMapLabels);
    }
  }, [map, selectedCity]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    flyToCity(city, map);
  };

  // Fetch listings on mount and check URL slug deep-link
  useEffect(() => {
    async function initData() {
      try {
        const res = await fetch("/api/listings");
        if (res.ok) {
          const data = await res.json();
          const listingsData: Listing[] = Array.isArray(data) ? data : (data.listings || []);
          setListings(listingsData);

          // Check browser pathname or URL query params for profile slug
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const personQuery = urlParams.get("p");
            const startupQuery = urlParams.get("s");
            const pathParts = window.location.pathname.split("/").filter(Boolean);

            let targetType = "";
            let targetSlug = "";

            if (personQuery) {
              targetType = "person";
              targetSlug = personQuery;
            } else if (startupQuery) {
              targetType = "startup";
              targetSlug = startupQuery;
            } else if (pathParts.length === 2 && (pathParts[0] === "p" || pathParts[0] === "s")) {
              targetType = pathParts[0] === "p" ? "person" : "startup";
              targetSlug = pathParts[1];
            } else if (urlParams.get("view") === "sign-in" || urlParams.get("view") === "sign-up") {
              setLeftView(urlParams.get("view") as LeftView);
            } else if (pathParts.length === 1 && (pathParts[0] === "sign-in" || pathParts[0] === "sign-up")) {
              setLeftView(pathParts[0] as LeftView);
            }

            if (targetSlug) {
              setProfileLookupError(false);
              const matching = listingsData.find(
                (l) => l.slug === targetSlug && (targetType ? l.type === targetType : true)
              );
              if (matching) {
                setSelected(matching);
                setActiveProfileForStudio(matching);
                setLeftView("studio");
                if (map) {
                  map.flyTo({
                    center: [matching.longitude, matching.latitude],
                    zoom: 13.5,
                    pitch: 60,
                    bearing: -10,
                  });
                }
              } else {
                // Fetch from backend API
                try {
                  const slugRes = await fetch(`/api/listings/slug?type=${targetType || "startup"}&slug=${targetSlug}`);
                  if (slugRes.ok) {
                    const slugData = await slugRes.json();
                    if (slugData.listing) {
                      setSelected(slugData.listing);
                      setActiveProfileForStudio(slugData.listing);
                      setLeftView("studio");
                      if (map) {
                        map.flyTo({
                          center: [slugData.listing.longitude, slugData.listing.latitude],
                          zoom: 13.5,
                          pitch: 60,
                          bearing: -10,
                        });
                      }
                    } else {
                      setProfileLookupError(true);
                    }
                  } else {
                    setProfileLookupError(true);
                  }
                } catch (e) {
                  setProfileLookupError(true);
                }
              }
            } else if (listingsData.length > 0) {
              setSelected(listingsData[0]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize map data:", err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [map]);

  // ===== CENTRALIZED NAVIGATION HELPER =====
  // Single source of truth for URL + state transitions.
  // All navigation goes through here — no scattered pushState calls.
  const navigateTo = (view: LeftView, profile?: Listing | null) => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    if (view === "add-listing") {
      setMobileDrawerState("collapsed");
    } else if (view === "studio" || view === "profile" || view === "sign-in" || view === "sign-up" || view === "feed" || view === "spotlight-story") {
      setMobileDrawerState("default");
    }
    if (view === "studio" && profile) {
      setActiveProfileForStudio(profile);
      setSelected(profile);
      setLeftView("studio");
      if (typeof window !== "undefined") {
        const prefix = profile.type === "person" ? "p" : "s";
        window.history.pushState({ view: "studio", slug: `${prefix}/${profile.slug}` }, "", `/${prefix}/${profile.slug}${search}`);
      }
      map?.flyTo({
        center: [profile.longitude, profile.latitude],
        zoom: 13.5,
        pitch: 60,
        bearing: -10,
      });
    } else if (view === "sign-in" || view === "sign-up") {
      setActiveProfileForStudio(null);
      setLeftView(view);
      if (typeof window !== "undefined") {
        window.history.pushState({ view }, "", `/${view}${search}`);
      }
    } else if (view === "explore" || view === "feed") {
      setActiveProfileForStudio(null);
      setLeftView(view);
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.history.pushState({ view }, "", `/${search}`);
      }
    } else {
      setLeftView(view);
    }
  };

  // ===== BROWSER BACK/FORWARD SUPPORT =====
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const path = window.location.pathname;
      const parts = path.split("/").filter(Boolean);
      const searchParams = new URLSearchParams(window.location.search);

      // Restore filter states from search params on popstate
      setSelectedCity(searchParams.get("city") || "All Cities");
      setSelectedType(searchParams.get("type") || "All Types");
      setSelectedStage(searchParams.get("stage") || "All Stages");
      setSelectedSector(searchParams.get("sector") || "All Sectors");
      setSelectedRole(searchParams.get("role") || "All Roles");
      setSelectedVcStage(searchParams.get("vc_stage") || "All Investment Stages");
      setSelectedVcType(searchParams.get("vc_type") || "All Fund Types");
      setQuery(searchParams.get("q") || "");

      if (parts.length === 2 && (parts[0] === "p" || parts[0] === "s")) {
        const type = parts[0] === "p" ? "person" : "startup";
        const slug = parts[1];
        const match = listings.find((l) => l.type === type && l.slug === slug);
        if (match) {
          setActiveProfileForStudio(match);
          setSelected(match);
          setLeftView("studio");
          setMobileDrawerState("default");
          map?.flyTo({
            center: [match.longitude, match.latitude],
            zoom: 13.5,
            pitch: 60,
            bearing: -10,
          });
        }
      } else if (parts.length === 1 && (parts[0] === "sign-in" || parts[0] === "sign-up")) {
        setActiveProfileForStudio(null);
        setLeftView(parts[0] as LeftView);
        setMobileDrawerState("default");
      } else {
        setActiveProfileForStudio(null);
        setLeftView("explore");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [listings, map]);

  // Map pin click = highlight only, no URL change.
  // URL only changes when user opens the full profile studio.
  const handleSelectListing = (item: Listing) => {
    setSelected(item);
    setMobileDrawerState("default");
    if (selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleOpenProfileByHandle = async (handle: string) => {
    const typePrefix = handle.startsWith("p/") ? "person" : "startup";
    const rawName = handle.substring(2);
    const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const matching = listings.find((l) => l.type === typePrefix && (l.slug === slug || l.name.toLowerCase() === rawName.toLowerCase()));
    if (matching) {
      navigateTo("studio", matching);
    } else {
      try {
        const res = await fetch(`/api/listings/slug?type=${typePrefix}&slug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.listing) {
            navigateTo("studio", data.listing);
          }
        }
      } catch (e) {}
    }
  };

  const handleAddListingSuccess = (newListing: Listing) => {
    setListings((prev) => [newListing, ...prev.filter((l) => l.id !== newListing.id)]);
    setSelected(newListing);
    // Center map on the newly added listing
    if (map) {
      map.flyTo({
        center: [newListing.longitude, newListing.latitude],
        zoom: 13.5,
        pitch: 60,
        duration: 1000,
      });
    }
    navigateTo("studio", newListing);
  };

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      // Primary Type filter
      const matchesType =
        selectedType === "All Types" ||
        (selectedType === "Startups" && item.type === "startup") ||
        (selectedType === "People" && item.type === "person") ||
        (selectedType === "VCs" && item.type === "vc");

      // Secondary Stage filter (for Startups)
      const matchesStage =
        selectedStage === "All Stages" ||
        (item.stage && item.stage.toLowerCase() === selectedStage.toLowerCase());

      // Secondary Sector filter (for Startups & People)
      const matchesSector =
        selectedSector === "All Sectors" ||
        item.sector.toLowerCase() === selectedSector.toLowerCase() ||
        (selectedSector === "Others" &&
          !["ai", "saas", "d2c", "e-commerce", "fintech", "edtech", "healthtech", "ev/mobility", "gaming", "logistics", "entertainment", "manufacturing"].includes(item.sector.toLowerCase()));

      // Secondary Role filter (for People)
      const matchesRole =
        selectedRole === "All Roles" ||
        (item.description && item.description.toLowerCase().includes(selectedRole.toLowerCase())) ||
        (item.sector && item.sector.toLowerCase().includes(selectedRole.toLowerCase()));

      // Secondary VC Type filter
      const matchesVcType =
        selectedVcType === "All Fund Types" ||
        (item.sector && item.sector.toLowerCase().includes(selectedVcType.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(selectedVcType.toLowerCase()));

      // Secondary VC Stage filter
      const matchesVcStage =
        selectedVcStage === "All Investment Stages" ||
        (item.stage && item.stage.toLowerCase().includes(selectedVcStage.toLowerCase()));

      // City filter
      const matchesCity =
        selectedCity === "All Cities" ||
        item.city.toLowerCase() === selectedCity.toLowerCase() ||
        (selectedCity === "Delhi NCR" &&
          (item.city.toLowerCase().includes("delhi") ||
            item.city.toLowerCase().includes("ncr") ||
            item.city.toLowerCase().includes("gurugram") ||
            item.city.toLowerCase().includes("noida")));

      // Search query
      const matchesQuery = `${item.name} ${item.city} ${item.sector} ${item.stage || ""} ${item.description || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());

      return (
        matchesType &&
        matchesStage &&
        matchesSector &&
        matchesRole &&
        matchesVcType &&
        matchesVcStage &&
        matchesCity &&
        matchesQuery
      );
    });
  }, [listings, selectedType, selectedStage, selectedSector, selectedRole, selectedVcType, selectedVcStage, selectedCity, query]);

  const renderHeader = (isMobile: boolean) => (
    <header className={`top-bar ${isMobile ? "mobile-only" : "desktop-only"}`}>
      <div className="brand-group">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigateTo("explore"); }}>
          {branding.logo_url && !logoLoadFailed ? (
            <img
              src={branding.logo_url}
              alt="The Startup Map"
              className="header-custom-logo-img"
              onError={() => setLogoLoadFailed(true)}
            />
          ) : (
            <>
              <span className="brand-the">THE</span>
              <span className="brand-startup">STARTUP</span>
              <span className="brand-map">MAP</span>
            </>
          )}
        </a>
        <span className="beta-badge">BETA</span>
      </div>

      <div className="header-actions">
        {!isClerkLoaded ? (
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#eeeef2" }} />
        ) : !isSignedIn ? (
          <>
            <button
              type="button"
              className={`signin-btn ${leftView === "sign-in" ? "active" : ""}`}
              onClick={() => navigateTo("sign-in")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`signin-btn ${leftView === "sign-up" ? "active" : ""}`}
              onClick={() => navigateTo("sign-up")}
            >
              Sign Up
            </button>
          </>
        ) : (
          <ProfileAvatarStack
            userId={clerkUser?.id || "demo_user"}
            userEmail={clerkUser?.primaryEmailAddress?.emailAddress || "founder@startupmap.in"}
            userInitials={
              clerkUser?.firstName
                ? clerkUser.firstName.substring(0, 2).toUpperCase()
                : clerkUser?.primaryEmailAddress?.emailAddress?.substring(0, 2).toUpperCase() || "US"
            }
            userAvatarUrl={clerkUser?.imageUrl}
            activeListingId={leftView === "studio" ? activeProfileForStudio?.id || null : null}
            onSelectProfile={(profile) => navigateTo("studio", profile)}
            onAddNewClick={() => navigateTo("add-listing")}
          />
        )}
      </div>
    </header>
  );

  return (
    <main className={`canvas tab-${tab} ${isExploreTab ? "tab-map tab-explore" : ""} drawer-${mobileDrawerState}${isExploreTab && leftView === "studio" ? " map-detail-open" : ""}`}>
      {isMounted && <ClerkUserSubscriber onAuthChange={handleAuthChange} />}
      {renderHeader(true)}
      {/* CONTROLS SIDEBAR / FEED CONTENT */}
      <aside className={`controls ${mobileTab === "feed" ? "mobile-visible" : "mobile-hidden"}`}>
        {renderHeader(false)}

        {tab === "home" && leftView !== "spotlight-story" && (
          <SpotlightsBar
            userId={clerkUser?.id || "demo_user"}
            isSignedIn={isSignedIn || false}
            onRequireAuth={() => navigateTo("sign-in")}
            onSelectSpotlight={(stories, index) => {
              setActiveSpotlightsList(stories);
              setActiveSpotlightIndex(index);
              navigateTo("spotlight-story");
            }}
          />
        )}
          <div
            className="controls-scroll"
            style={
              leftView === "spotlight-story"
                ? { flex: 1, display: "flex", flexDirection: "column", padding: "12px", overflow: "hidden" }
                : { flex: 1, display: "flex", flexDirection: "column" }
            }
          >
            {profileLookupError && (
              <div role="alert" style={{ margin: 16, padding: 18, border: "1px solid #fed7aa", borderRadius: 12, background: "#fff7ed", color: "#7c2d12" }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Profile not found</h2>
                <p style={{ margin: "0 0 12px" }}>This profile link may be invalid or the profile may have been removed.</p>
                <button type="button" className="submit-form-btn" onClick={() => { setProfileLookupError(false); navigateTo("explore"); }}>Back to map</button>
              </div>
            )}
            {leftView === "spotlight-story" && activeSpotlightsList.length > 0 && (
              <InlineSpotlightStoryPlayer
                spotlights={activeSpotlightsList}
                currentIndex={activeSpotlightIndex}
                onClose={() => navigateTo("explore")}
                onNavigate={(newIdx) => setActiveSpotlightIndex(newIdx)}
              />
            )}
            {isExploreTab && leftView !== "studio" && (
              <SearchPage
                listings={listings}
                selectedListingId={selected?.id || null}
                query={query}
                onQueryChange={setQuery}
                selectedCategory={selectedType === "Startups" ? "Startups" : selectedType === "People" ? "People" : "All"}
                onCategoryChange={(cat) => {
                  if (cat === "Startups") handleTypeSelect("Startups");
                  else if (cat === "People") handleTypeSelect("People");
                  else handleTypeSelect("All Types");
                }}
                onSelectListing={(item) => {
                  handleSelectListing(item);
                  map?.flyTo({
                    center: [item.longitude, item.latitude],
                    zoom: 13.5,
                    pitch: 45,
                    bearing: 0,
                    duration: 700,
                  });
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setMobileTab("map");
                  }
                }}
                onOpenStudio={(item) => {
                  setSelected(item);
                  setActiveProfileForStudio(item);
                  navigateTo("studio", item);
                }}
                mobileTab={mobileTab}
                onToggleMobileTab={setMobileTab}
              />
            )}
            {tab === "activity" && <ActivityPage userId={clerkUser?.id || "demo_user"} isSignedIn={!!isSignedIn} onRequireAuth={() => navigateTo("sign-in")} />}

            {tab === "home" && (leftView === "explore" || leftView === "feed" || leftView === "sign-in" || leftView === "sign-up") && (
              <CommunityFeed
                userId={clerkUser?.id || "demo_user"}
                userEmail={clerkUser?.primaryEmailAddress?.emailAddress || "founder@startupmap.in"}
                userName={clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : "Ecosystem Founder"}
                userAvatar={clerkUser?.imageUrl}
                isSignedIn={isSignedIn || false}
                userInterests={userInterests}
                userJoinedCommunities={userJoinedCommunities}
                mobileTab={mobileTab}
                onToggleMobileTab={(tab) => setMobileTab(tab)}
                onRequireAuth={() => navigateTo("sign-in")}
                onOpenAddListing={() => navigateTo("add-listing")}
                onSelectAuthorHandle={(handle) => handleOpenProfileByHandle(handle)}
              />
            )}
            {leftView === "studio" && activeProfileForStudio && (
              <DedicatedProfileStudio
                profile={activeProfileForStudio}
                canManageProfile={Boolean(clerkUser?.id && clerkUser.id === activeProfileForStudio.owner_id)}
                canManageArticles={Boolean(clerkUser?.id && clerkUser.id === activeProfileForStudio.owner_id)}
                onClose={() => navigateTo("explore")}
                onSelectListingOnMap={(item) => {
                  setSelected(item);
                  navigateTo("explore");
                  map?.flyTo({
                    center: [item.longitude, item.latitude],
                    zoom: 12.5,
                    duration: 700,
                  });
                }}
                onProfileUpdated={loadListings}
                onOpenJobs={(listing) => setJobsListing(listing)}
              />
            )}

            {(tab === "profile" || leftView === "profile") && (
              <UserProfilePanel
                userId={clerkUser?.id || "demo_user"}
                isSignedIn={Boolean(isSignedIn)}
                onRequireAuth={() => navigateTo("sign-in")}
                userEmail={clerkUser?.primaryEmailAddress?.emailAddress || "founder@startupmap.in"}
                userInitials={
                  clerkUser?.firstName
                    ? clerkUser.firstName.substring(0, 2).toUpperCase()
                    : clerkUser?.primaryEmailAddress?.emailAddress?.substring(0, 2).toUpperCase() || "US"
                }
                onClose={() => navigateTo("explore")}
                onAddListingClick={() => navigateTo("add-listing")}
                onOpenJobs={(listing) => setJobsListing(listing)}
                onSelectListingOnMap={(item) => {
                  setSelected(item);
                  navigateTo("explore");
                  map?.flyTo({
                    center: [item.longitude, item.latitude],
                    zoom: 12.5,
                    duration: 700,
                  });
                }}
              />
            )}

            {leftView === "add-listing" && (
              <AddListingForm
                userId={clerkUser?.id || "clerk_user"}
                pickedCoords={pickedCoords}
                setPickedCoords={setPickedCoords}
                onCancel={() => {
                  setPickedCoords(null);
                  navigateTo("explore");
                }}
                onSuccess={(newListing) => {
                  handleAddListingSuccess(newListing);
                  setPickedCoords(null);
                  navigateTo("explore");
                }}
              />
            )}
          </div>
        </aside>

      {/* RIGHT: Map fills the panel */}
      {isExploreTab && <div className={`map-panel ${mobileTab === "map" ? "mobile-visible" : "mobile-hidden"}`}>
        {/* MOBILE FLOATING PIN PREVIEW CARD */}
        {selected && (
          <div className="mobile-map-selected-card mobile-only">
            <button
              type="button"
              className="mobile-card-close-btn"
              onClick={() => setSelected(null)}
              aria-label="Close preview"
            >
              ✕
            </button>
            <div
              className="mobile-card-header"
              onClick={() => {
                setMobileTab("feed");
                navigateTo("studio", selected);
              }}
            >
              {selected.logo_url ? (
                <img src={selected.logo_url} alt={selected.name} className="mobile-card-avatar" />
              ) : (
                <div className="mobile-card-avatar-initials" style={{ backgroundColor: selected.color || "#f85900" }}>
                  {selected.initials}
                </div>
              )}
              <div className="mobile-card-info">
                <div className="mobile-card-title-row">
                  <h4 className="mobile-card-name">{selected.name}</h4>
                  {selected.review_state === "verified" && <span className="verified-badge-mini">✓</span>}
                  <span className="mobile-card-category-badge">{selected.type}</span>
                </div>
                <p className="mobile-card-tagline">
                  {selected.description || `${selected.city || "India"} • ${selected.sector || selected.stage || ""}`}
                </p>
              </div>
            </div>
            <div className="mobile-card-footer">
              <button
                type="button"
                className="mobile-card-view-btn"
                onClick={() => {
                  setMobileTab("feed");
                  navigateTo("studio", selected);
                }}
              >
                View Profile →
              </button>
            </div>
          </div>
        )}
        {/* MOBILE MAP PIN PICKER FLOATING INSTRUCTION BANNER */}
        {leftView === "add-listing" && (
          <div className="mobile-map-pick-banner">
            <span>{pickedCoords ? "📍 Location pin set!" : "📍 Tap anywhere on map to set pin location"}</span>
            <button
              type="button"
              className="confirm-pin-btn"
              onClick={() => {
                setMobileTab("feed");
                setMobileDrawerState("default");
              }}
            >
              {pickedCoords ? "Confirm Location ✓" : "Open Form ↑"}
            </button>
          </div>
        )}

        {/* TOP LEFT SECTION BAR */}
        <div className="map-top-left-controls">
          {/* INLINE FEED / MAP MODE TOGGLE (MOBILE ONLY) */}
          <div className="inline-section-mode-toggle mobile-only">
            <button
              type="button"
              className={`mode-toggle-btn ${mobileTab === "feed" ? "active" : ""}`}
              onClick={() => setMobileTab("feed")}
              title="Feed View"
              aria-label="Feed View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${mobileTab === "map" ? "active" : ""}`}
              onClick={() => setMobileTab("map")}
              title="Map View"
              aria-label="Map View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" />

              </svg>
            </button>
          </div>

          {/* 1. CIRCULAR SEARCH BUTTON */}
          <div className={`circular-search-container ${isSearchOpen || query ? "expanded" : ""}`}>
            <button
              type="button"
              className="circle-search-btn"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              title="Search Map"
            >
              <SearchIcon size={14} />
            </button>
            {(isSearchOpen || query) && (
              <input
                type="text"
                className="circular-search-input"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            )}
            {query && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setQuery("");
                  setIsSearchOpen(false);
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* 2. City Selector */}
          <CityDropdownSelector
            selectedCity={selectedCity}
            onSelectCity={handleCitySelect}
          />

          {/* 3. Type Selector */}
          <FilterDropdown
            label="Type"
            options={TYPE_OPTIONS}
            selected={selectedType}
            onSelect={handleTypeSelect}
          />

          {/* DESKTOP SECONDARY FILTERS INLINE (DESKTOP ONLY) */}
          <div className="desktop-secondary-filters desktop-only">
            {selectedType === "Startups" && (
              <>
                <FilterDropdown
                  label="Stage"
                  options={STARTUP_STAGE_OPTIONS}
                  selected={selectedStage}
                  onSelect={setSelectedStage}
                />
                <FilterDropdown
                  label="Sector"
                  options={STARTUP_SECTOR_OPTIONS}
                  selected={selectedSector}
                  onSelect={setSelectedSector}
                />
              </>
            )}

            {selectedType === "People" && (
              <>
                <FilterDropdown
                  label="Role"
                  options={PEOPLE_ROLE_OPTIONS}
                  selected={selectedRole}
                  onSelect={setSelectedRole}
                />
                <FilterDropdown
                  label="Sector"
                  options={PEOPLE_SECTOR_OPTIONS}
                  selected={selectedSector}
                  onSelect={setSelectedSector}
                />
              </>
            )}

            {selectedType === "VCs" && (
              <>
                <FilterDropdown
                  label="Fund Type"
                  options={VC_TYPE_OPTIONS}
                  selected={selectedVcType}
                  onSelect={setSelectedVcType}
                />
                <FilterDropdown
                  label="Stage"
                  options={VC_STAGE_OPTIONS}
                  selected={selectedVcStage}
                  onSelect={setSelectedVcStage}
                />
              </>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                className="reset-filters-chip"
                onClick={handleResetFilters}
                title="Reset active filters"
              >
                <span>Reset</span>
                <span className="reset-x-icon">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* TOP LEFT SECONDARY MAP FILTERS (MOBILE ONLY FLOATING ON TOP LEFT CORNER OF MAP CANVAS) */}
        <div className="map-top-left-secondary-controls mobile-only">
          {selectedType === "Startups" && (
            <>
              <FilterDropdown
                label="Stage"
                options={STARTUP_STAGE_OPTIONS}
                selected={selectedStage}
                onSelect={setSelectedStage}
              />
              <FilterDropdown
                label="Sector"
                options={STARTUP_SECTOR_OPTIONS}
                selected={selectedSector}
                onSelect={setSelectedSector}
              />
            </>
          )}

          {selectedType === "People" && (
            <>
              <FilterDropdown
                label="Role"
                options={PEOPLE_ROLE_OPTIONS}
                selected={selectedRole}
                onSelect={setSelectedRole}
              />
              <FilterDropdown
                label="Sector"
                options={PEOPLE_SECTOR_OPTIONS}
                selected={selectedSector}
                onSelect={setSelectedSector}
              />
            </>
          )}

          {selectedType === "VCs" && (
            <>
              <FilterDropdown
                label="Fund Type"
                options={VC_TYPE_OPTIONS}
                selected={selectedVcType}
                onSelect={setSelectedVcType}
              />
              <FilterDropdown
                label="Stage"
                options={VC_STAGE_OPTIONS}
                selected={selectedVcStage}
                onSelect={setSelectedVcStage}
              />
            </>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              className="reset-filters-chip"
              onClick={handleResetFilters}
              title="Reset active filters"
            >
              <span>Reset</span>
              <span className="reset-x-icon">✕</span>
            </button>
          )}
        </div>

        {isMounted ? (
          <Map
            key={mapRetryKey}
            center={[78.96, 22.0]}
            zoom={4.3}
            minZoom={3.5}
            maxPitch={60}
            maxBounds={[
              [67.0, 7.0],
              [97.0, 36.0],
            ]}
            className="map-fill"
            onLoad={(loadedMap) => { setMap(loadedMap); setMapError(false); }}
            onError={() => setMapError(true)}
            theme="light"
            onClick={(e: { lngLat: { lng: number; lat: number } }) => {
              if (leftView === "add-listing") {
                setPickedCoords([e.lngLat.lng, e.lngLat.lat]);
              }
            }}
          >
            {/* Live Picked Location Marker during Listing Creation */}
            {leftView === "add-listing" && pickedCoords && (
              <MapMarker
                longitude={pickedCoords[0]}
                latitude={pickedCoords[1]}
                draggable
                onDragEnd={(lngLat) => setPickedCoords([lngLat.lng, lngLat.lat])}
              >
                <MarkerContent>
                  <div className="location-pin-marker">
                    <MapPinIcon size={14} /> Drop Pin
                  </div>
                </MarkerContent>
              </MapMarker>
            )}

            {filtered.map((item: Listing) => (
              <MapMarker
                key={item.id}
                longitude={item.longitude}
                latitude={item.latitude}
              >
                <MarkerContent>
                  <button
                    className="startup-marker"
                    style={{ background: item.color }}
                    onClick={() => {
                      handleSelectListing(item);
                      map?.flyTo({
                        center: [item.longitude, item.latitude],
                        zoom: 13.5,
                        pitch: 60,
                        bearing: -10,
                        duration: 700,
                      });
                    }}
                  >
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      item.initials
                    )}
                  </button>
                </MarkerContent>
              </MapMarker>
            ))}
          </Map>
        ) : (
          <div className="map-fill bg-slate-900 flex items-center justify-center text-slate-400 font-sans text-xs font-semibold">
            Loading Map...
          </div>
        )}
        {isMounted && !map && (
          <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div role={mapError ? "alert" : "status"} style={{ pointerEvents: "auto", background: "rgba(255,255,255,0.96)", padding: "16px 20px", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.12)", textAlign: "center", color: "#111827" }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700 }}>{mapError ? "The map could not load." : "Loading map…"}</p>
              {mapError && <button type="button" className="submit-form-btn" onClick={() => { setMapError(false); setMap(null); setMapRetryKey((key) => key + 1); }}>Retry map</button>}
            </div>
          </div>
        )}
        <p className="map-status">
          <i /> <b>{filtered.length}</b> listings
        </p>
      </div>}

      {/* Modals */}
      {jobsListing && (
        <JobPostingsModal
          isOpen={true}
          onClose={() => setJobsListing(null)}
          listing={jobsListing}
          currentUser={
            clerkUser
              ? {
                  id: clerkUser.id,
                  email: clerkUser.primaryEmailAddress?.emailAddress || "",
                  initials:
                    clerkUser.firstName?.substring(0, 1) ||
                    clerkUser.primaryEmailAddress?.emailAddress?.substring(0, 1) ||
                    "U",
                }
              : null
          }
        />
      )}

      {/* Twitter/X Style Feed Onboarding Modal */}
      <FeedOnboardingModal
        isOpen={showFeedOnboarding}
        userId={clerkUser?.id || "demo_user"}
        onDismiss={() => {
          if (clerkUser?.id) localStorage.setItem(`startupmap_feed_onboarding_dismissed_${clerkUser.id}`, String(Date.now()));
          setShowFeedOnboarding(false);
        }}
        onComplete={(interests, communities) => {
          if (clerkUser?.id) localStorage.removeItem(`startupmap_feed_onboarding_dismissed_${clerkUser.id}`);
          setUserInterests(interests);
          setUserJoinedCommunities(communities);
          setShowFeedOnboarding(false);
          setLeftView("feed");
        }}
      />

      {/* Centered Auth Overlay Modal - Strict DESIGN.md Tokens */}
      {/* Centered Auth Overlay Modal - Strict DESIGN.md Tokens */}
      {(leftView === "sign-in" || leftView === "sign-up") && (
        <div
          className="auth-modal-backdrop"
          onClick={() => navigateTo("explore")}
          onKeyDown={(event) => {
            if (event.key === "Escape") navigateTo("explore");
            if (event.key === "Tab") {
              const dialog = event.currentTarget.querySelector<HTMLElement>('[role="dialog"]');
              const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')) : [];
              if (focusable.length) {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
              }
            }
          }}
        >
          <div
            className="auth-modal-card"
            ref={authDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chrome Navigation: Segmented Switcher Pill + Dismiss Button */}
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center p-0.5 bg-[#F0F2F5] rounded-full text-xs font-semibold">
                <button
                  type="button"
                  className={`py-1 px-3.5 rounded-full transition-all duration-100 ${
                    leftView === "sign-in"
                      ? "bg-white text-black shadow-xs font-semibold"
                      : "text-[#5B6368] hover:text-black font-medium"
                  }`}
                  onClick={() => navigateTo("sign-in")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`py-1 px-3.5 rounded-full transition-all duration-100 ${
                    leftView === "sign-up"
                      ? "bg-white text-black shadow-xs font-semibold"
                      : "text-[#5B6368] hover:text-black font-medium"
                  }`}
                  onClick={() => navigateTo("sign-up")}
                >
                  Create Account
                </button>
              </div>

              <button
                type="button"
                className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F0F2F5] hover:bg-[#E7EAED] text-[#5B6368] hover:text-black transition-colors text-xs font-semibold"
                onClick={() => navigateTo("explore")}
                title="Close"
                aria-label="Close sign in dialog"
              >
                ✕
              </button>
            </div>

            {/* Editorial Greeting */}
            <div className="mb-2 text-center flex flex-col items-center">
              {leftView === "sign-in" ? (
                <SignInHeaderIllustration className="mb-1" />
              ) : (
                <SignUpHeaderIllustration className="mb-1" />
              )}
              <h2 id="auth-modal-title" className="text-[17px] font-bold tracking-tight text-black">
                {leftView === "sign-in" ? "Welcome back" : "Join The Startup Map"}
              </h2>
              <p className="text-[11.5px] text-[#5B6368] mt-0.5">
                {leftView === "sign-in" ? "Enter your email to continue" : "Create your account in seconds"}
              </p>
            </div>

            {/* Auth Form Container - Email first, Divider second, OAuth third */}
            <div className="auth-modal-content">
              {leftView === "sign-in" ? (
                <SignIn
                  routing="hash"
                  signUpUrl="/sign-up"
                  forceRedirectUrl="/"
                  fallbackRedirectUrl="/"
                  appearance={clerkInlineAppearance}
                />
              ) : (
                <SignUp
                  routing="hash"
                  signInUrl="/sign-in"
                  forceRedirectUrl="/"
                  fallbackRedirectUrl="/"
                  appearance={clerkInlineAppearance}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* THUMB-ZONE MOBILE BOTTOM NAVIGATION */}
      <nav className="mobile-bottom-nav mobile-only" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${mobileTab === "feed" && leftView !== "add-listing" ? "active" : ""}`}
          onClick={() => {
            setMobileTab("feed");
            if (leftView !== "feed" && leftView !== "explore") {
              navigateTo("explore");
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          <span>Feed</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" />

          </svg>
          <span>Explore</span>
        </button>

        <button
          type="button"
          className="mobile-nav-item mobile-nav-action-btn"
          onClick={() => {
            if (!isSignedIn) {
              navigateTo("sign-in");
            } else {
              navigateTo("add-listing");
              setMobileTab("feed");
            }
          }}
          aria-label="Add Listing"
        >
          <div className="mobile-action-pill-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span>Add</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${leftView === "studio" || leftView === "sign-in" || leftView === "sign-up" ? "active" : ""}`}
          onClick={() => {
            if (!isSignedIn) {
              navigateTo("sign-in");
            } else {
              navigateTo("studio", activeProfileForStudio || null);
              setMobileTab("feed");
            }
          }}
        >
          {isSignedIn && clerkUser?.imageUrl ? (
            <img src={clerkUser.imageUrl} alt="Profile" className="mobile-nav-avatar" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
          <span>{isSignedIn ? "Profile" : "Sign In"}</span>
        </button>
      </nav>
    </main>
  );
}



