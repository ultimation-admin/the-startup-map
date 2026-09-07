"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Listing, fetchListings } from "@/lib/db";

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
import { SpotlightStory } from "@/lib/spotlights";
import { JobPostingsModal } from "@/components/JobPostingsModal";
import { FeedOnboardingModal } from "@/components/FeedOnboardingModal";

import { SearchIcon, SearchXIcon, SparklesIcon, MapPinIcon, UserIcon, RocketIcon } from "@/components/Icons";
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
    card: "w-full shadow-none border-0 p-0 bg-transparent",
    headerTitle: "font-sans text-xl font-extrabold text-[#0f172a] tracking-tight",
    headerSubtitle: "text-xs font-medium text-[#475569] mt-0.5",
    formButtonPrimary: "bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-full h-10 shadow-sm text-xs w-full transition-all duration-150 active:scale-[0.98]",
    formFieldLabel: "text-[11px] font-bold text-[#0f172a] uppercase tracking-wider mb-1",
    formFieldInput: "rounded-xl border border-slate-200 bg-white focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 text-xs py-2.5 px-3 text-[#0f172a] font-medium transition-all duration-150",
    socialButtonsBlockButton: "rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#0f172a] text-xs font-bold py-2.5 transition-all duration-150 active:scale-[0.98]",
    socialButtonsBlockButtonText: "font-bold text-xs text-[#0f172a]",
    dividerLine: "bg-slate-200",
    dividerText: "text-[10px] font-bold text-slate-400 uppercase tracking-widest",
    footerActionLink: "text-[#059669] font-bold hover:underline",
  },
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { user: clerkUser, isSignedIn, isLoaded: isClerkLoaded } = useUser();
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
  const [pickedCoords, setPickedCoords] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [loading, setLoading] = useState(true);
  type LeftView = "explore" | "add-listing" | "sign-in" | "sign-up" | "profile" | "studio" | "spotlight-story" | "feed";
  const [leftView, setLeftView] = useState<LeftView>("explore");
  const [activeProfileForStudio, setActiveProfileForStudio] = useState<Listing | null>(null);
  const [activeSpotlightsList, setActiveSpotlightsList] = useState<SpotlightStory[]>([]);
  const [activeSpotlightIndex, setActiveSpotlightIndex] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showFeedOnboarding, setShowFeedOnboarding] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [userJoinedCommunities, setUserJoinedCommunities] = useState<string[]>([]);

  // Airbnb-style touch-draggable bottom sheet state with smooth velocity tracking
  const [isMobileDrawerExpanded, setIsMobileDrawerExpanded] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState<number | null>(null);

  useEffect(() => {
    if (map) {
      const timer = setTimeout(() => {
        map.resize();
      }, 330);
      return () => clearTimeout(timer);
    }
  }, [isMobileDrawerExpanded, map]);
  const touchStartRef = useRef<{ startY: number; startTime: number; initialExpanded: boolean } | null>(null);
  const touchLastRef = useRef<{ lastY: number; lastTime: number; velocityY: number }>({ lastY: 0, lastTime: 0, velocityY: 0 });
  const rafIdRef = useRef<number | null>(null);

  const handleDrawerTouchStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const now = Date.now();
    touchStartRef.current = { startY: clientY, startTime: now, initialExpanded: isMobileDrawerExpanded };
    touchLastRef.current = { lastY: clientY, lastTime: now, velocityY: 0 };
    setDragOffsetY(0);
  };

  const handleDrawerTouchMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const now = Date.now();

    const dt = Math.max(1, now - touchLastRef.current.lastTime);
    const dy = clientY - touchLastRef.current.lastY;
    const velocityY = dy / dt; // px / ms

    touchLastRef.current = { lastY: clientY, lastTime: now, velocityY };
    const deltaY = clientY - touchStartRef.current.startY;

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
    const { initialExpanded } = touchStartRef.current;
    const { velocityY } = touchLastRef.current;

    // Fast flick or drag threshold decision
    if (Math.abs(deltaY) < 8) {
      // Simple tap toggles sheet
      setIsMobileDrawerExpanded(!initialExpanded);
    } else if (velocityY < -0.25 || deltaY < -35) {
      // Swiped up or dragged up -> Expand
      setIsMobileDrawerExpanded(true);
    } else if (velocityY > 0.25 || deltaY > 35) {
      // Swiped down or dragged down -> Collapse
      setIsMobileDrawerExpanded(false);
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
          if (isApproved && !hasOnboarded) {
            setShowFeedOnboarding(true);
          }
        })
        .catch(() => {});

      fetch("/api/profile/sync", { method: "POST" })
        .then((res) => res.json())
        .then(() => {
          if (leftView === "sign-in" || leftView === "sign-up") {
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
  const [showJobsModal, setShowJobsModal] = useState(false);

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
                    }
                  }
                } catch (e) {}
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
    if (view === "studio" || view === "add-listing" || view === "profile" || view === "sign-in" || view === "sign-up") {
      setIsMobileDrawerExpanded(true);
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
          setIsMobileDrawerExpanded(true);
          map?.flyTo({
            center: [match.longitude, match.latitude],
            zoom: 13.5,
            pitch: 60,
            bearing: -10,
          });
        }
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
    setIsMobileDrawerExpanded(true);
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
    setListings((prev) => [...prev, newListing]);
    setSelected(newListing);
    // Center map on the newly added listing
    if (map) {
      map.flyTo({
        center: [newListing.longitude, newListing.latitude],
        zoom: 12,
        duration: 1000,
      });
    }
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

  return (
    <main className={`canvas ${isMobileDrawerExpanded ? "drawer-open" : "drawer-closed"}`}>
      {/* LEFT: Controls */}
      <aside className="controls">
        <header className="top-bar">
          <div className="brand-group">
            <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigateTo("explore"); }}>
              <span className="brand-the">THE</span>
              <span className="brand-startup">STARTUP</span>
              <span className="brand-map">MAP</span>
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

        {leftView !== "spotlight-story" && (
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

        {/* MOBILE DIMMER BACKDROP OVERLAY */}
        {isMobileDrawerExpanded && (
          <div
            className="mobile-sheet-backdrop"
            onClick={() => setIsMobileDrawerExpanded(false)}
          />
        )}

        {/* AIRBNB STYLE TOUCH DRAGGABLE BOTTOM SHEET (MOBILE ONLY CONTAINER) */}
        <div
          className={`mobile-bottom-sheet ${isMobileDrawerExpanded ? "drawer-expanded" : "drawer-collapsed"}`}
          style={
            dragOffsetY !== null && touchStartRef.current
              ? {
                  transform: touchStartRef.current.initialExpanded
                    ? `translateY(${Math.max(0, dragOffsetY)}px)`
                    : `translateY(calc(100% - 56px + ${dragOffsetY}px))`,
                  transition: "none",
                }
              : undefined
          }
        >
          {/* PURE MINIMALIST AIRBNB DRAG HANDLE BAR - NO TEXT */}
          <div
            className="mobile-drawer-handle-bar"
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
            onMouseDown={handleDrawerTouchStart}
            onMouseMove={handleDrawerTouchMove}
            onMouseUp={handleDrawerTouchEnd}
          >
            <div className="drawer-pill-indicator" />
          </div>

          <div
            className="controls-scroll"
            style={
              leftView === "spotlight-story"
                ? { flex: 1, display: "flex", flexDirection: "column", padding: "12px", overflow: "hidden" }
                : { flex: 1, display: "flex", flexDirection: "column" }
            }
          >
            {leftView === "spotlight-story" && activeSpotlightsList.length > 0 && (
              <InlineSpotlightStoryPlayer
                spotlights={activeSpotlightsList}
                currentIndex={activeSpotlightIndex}
                onClose={() => navigateTo("explore")}
                onNavigate={(newIdx) => setActiveSpotlightIndex(newIdx)}
              />
            )}
            {(leftView === "explore" || leftView === "feed") && (
              <CommunityFeed
                userId={clerkUser?.id || "demo_user"}
                userEmail={clerkUser?.primaryEmailAddress?.emailAddress || "founder@startupmap.in"}
                userName={clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : "Ecosystem Founder"}
                userAvatar={clerkUser?.imageUrl}
                isSignedIn={isSignedIn || false}
                userInterests={userInterests}
                userJoinedCommunities={userJoinedCommunities}
                onRequireAuth={() => navigateTo("sign-in")}
                onOpenAddListing={() => navigateTo("add-listing")}
                onSelectAuthorHandle={(handle) => handleOpenProfileByHandle(handle)}
                onOpenFeedOnboarding={() => setShowFeedOnboarding(true)}
              />
            )}
            {leftView === "studio" && activeProfileForStudio && (
              <DedicatedProfileStudio
                profile={activeProfileForStudio}
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
              />
            )}

            {leftView === "profile" && (
              <UserProfilePanel
                userId={clerkUser?.id || "demo_user"}
                userEmail={clerkUser?.primaryEmailAddress?.emailAddress || "founder@startupmap.in"}
                userInitials={
                  clerkUser?.firstName
                    ? clerkUser.firstName.substring(0, 2).toUpperCase()
                    : clerkUser?.primaryEmailAddress?.emailAddress?.substring(0, 2).toUpperCase() || "US"
                }
                onClose={() => navigateTo("explore")}
                onAddListingClick={() => navigateTo("add-listing")}
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

            {leftView === "sign-in" && (
              <div className="inline-panel-container compact-create-profile-container auth-unboxed-panel">
                <div className="create-profile-header">
                  <button type="button" className="back-btn compact-back-btn" onClick={() => navigateTo("explore")}>
                    ← Back
                  </button>
                </div>
                <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" forceRedirectUrl="/" fallbackRedirectUrl="/" appearance={clerkInlineAppearance} />
              </div>
            )}

            {leftView === "sign-up" && (
              <div className="inline-panel-container compact-create-profile-container auth-unboxed-panel">
                <div className="create-profile-header">
                  <button type="button" className="back-btn compact-back-btn" onClick={() => navigateTo("explore")}>
                    ← Back
                  </button>
                </div>
                <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/" fallbackRedirectUrl="/" appearance={clerkInlineAppearance} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* RIGHT: Map fills the panel */}
      <div className="map-panel">
        {/* TOP LEFT FILTERS OVERLAY */}
        <div className="map-top-left-controls">
          {/* 1. CIRCULAR SEARCH BUTTON (FIRST) */}
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

          {/* 4. Progressive Secondary Filters */}
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
        </div>

        {isMounted ? (
          <Map
            center={[78.96, 22.0]}
            zoom={4.3}
            minZoom={3.5}
            maxPitch={60}
            maxBounds={[
              [67.0, 7.0],
              [97.0, 36.0],
            ]}
            className="map-fill"
            onLoad={setMap}
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
        <p className="map-status">
          <i /> <b>{filtered.length}</b> listings
        </p>
      </div>

      {/* Modals */}
      {selected && (
        <JobPostingsModal
          isOpen={showJobsModal}
          onClose={() => setShowJobsModal(false)}
          listing={selected}
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
        onComplete={(interests, communities) => {
          setUserInterests(interests);
          setUserJoinedCommunities(communities);
          setShowFeedOnboarding(false);
          setLeftView("feed");
        }}
      />
    </main>
  );
}



