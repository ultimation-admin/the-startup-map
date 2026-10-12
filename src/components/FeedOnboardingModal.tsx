"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SparklesIcon,
  CheckIcon,
  UserGroupIcon,
  FlameIcon,
  BotIcon,
  ZapIcon,
  ShoppingBagIcon,
  CarIcon,
  HandshakeIcon,
  BanknoteIcon,
  RocketIcon,
  WrenchIcon,
  ActivityIcon,
  GamepadIcon,
} from "./Icons";

interface FeedOnboardingModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: (selectedInterests: string[], joinedCommunities: string[]) => void;
  onDismiss: () => void;
}

export const INTEREST_TOPICS = [
  { id: "genai", label: "AI & GenAI", icon: BotIcon, desc: "LLMs, Agents & Neural Nets", color: "#8b5cf6" },
  { id: "saas", label: "SaaS & Enterprise", icon: ZapIcon, desc: "B2B Software & Cloud", color: "#d97706" },
  { id: "d2c", label: "D2C & E-Commerce", icon: ShoppingBagIcon, desc: "Consumer Brands & Retail", color: "#db2777" },
  { id: "ev_mobility", label: "EV & Mobility", icon: CarIcon, desc: "Electric Vehicles & Tech", color: "#0891b2" },
  { id: "co_founders", label: "Co-Founders & Hiring", icon: HandshakeIcon, desc: "Talent & Co-Founder Matching", color: "#059669" },
  { id: "vc_deals", label: "VC Deals & Funding", icon: BanknoteIcon, desc: "Angel Rounds & Term Sheets", color: "#16a34a" },
  { id: "growth", label: "Growth & Marketing", icon: RocketIcon, desc: "User Acquisition & Distribution", color: "#ea580c" },
  { id: "engineering", label: "Engineering & Tech", icon: WrenchIcon, desc: "Architecture & Code", color: "#4f46e5" },
  { id: "healthtech", label: "HealthTech & Bio", icon: ActivityIcon, desc: "Digital Health & Biotech", color: "#dc2626" },
  { id: "gaming", label: "Gaming & Web3", icon: GamepadIcon, desc: "Interactive & Emerging Tech", color: "#c026d3" },
];

export const DEFAULT_COMMUNITIES = [
  { id: "startups", name: "/startups", desc: "General startup ecosystem discussions" },
  { id: "genai", name: "/genai", desc: "Building & scaling AI products" },
  { id: "saas", name: "/saas", desc: "SaaS metrics, pricing & GTM strategies" },
  { id: "founders", name: "/founders", desc: "Founder-only peer support & stories" },
  { id: "vc-deals", name: "/vc-deals", desc: "Pitch decks, term sheets & angel investing" },
  { id: "engineering", name: "/engineering", desc: "Full-stack code, infra & system design" },
  { id: "d2c", name: "/d2c", desc: "Supply chain, branding & D2C growth" },
  { id: "hiring", name: "/hiring", desc: "Early stage startup hiring & job posts" },
];

export function FeedOnboardingModal({ isOpen, userId, onComplete, onDismiss }: FeedOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [communitiesList, setCommunitiesList] = useState(DEFAULT_COMMUNITIES);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/communities")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.communities || [];
        if (list.length > 0) {
          const formatted = list.map((c: any) => ({
            id: c.id,
            name: c.name.startsWith("/") ? c.name : `/${c.name}`,
            desc: c.description || "Startup ecosystem community",
          }));
          setCommunitiesList(formatted);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCommunity = (id: string) => {
    setJoinedCommunities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const canProceedStep1 = true;
  const canFinishStep2 = true;

  const handleFinish = () => {
    if (!canFinishStep2) return;
    if (typeof window !== "undefined" && userId) {
      localStorage.setItem(`startupmap_feed_onboarded_${userId}`, "true");
      localStorage.setItem(`startupmap_interests_${userId}`, JSON.stringify(selectedInterests));
      localStorage.setItem(`startupmap_communities_${userId}`, JSON.stringify(joinedCommunities));
    }
    onComplete(selectedInterests, joinedCommunities);
  };

  return (
    <div className="onboarding-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onDismiss(); }}>
      <div className="onboarding-modal-card" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" tabIndex={-1}>
        <button type="button" className="onboarding-dismiss-btn" onClick={onDismiss} aria-label="Close feed setup">×</button>
        {/* STEP INDICATOR HEADER */}
        <div className="onboarding-modal-header">
          <div className="onboarding-step-pills">
            <span className="step-pill active">
              {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
            </span>
          </div>

          <span className="twitter-x-badge">
            <SparklesIcon size={13} /> Profile Feed Setup
          </span>
        </div>

        {/* STEP 1: CHOOSE INTERESTS */}
        {step === 1 && (
          <div className="onboarding-step-body">
            <h2 id="onboarding-title" className="onboarding-title">What do you want to see on your feed?</h2>
            <p id="onboarding-description" className="onboarding-subtitle">
              Pick any topics you like to personalize your feed. You can change these later.
            </p>

            <div className="interest-counter-bar">
              <span className={`count-badge ${canProceedStep1 ? "ready" : ""}`}>
                {selectedInterests.length ? `${selectedInterests.length} topics selected` : "No topics selected"}
              </span>
            </div>

            <div className="interests-grid">
              {INTEREST_TOPICS.map((topic) => {
                const isSelected = selectedInterests.includes(topic.id);
                const IconComponent = topic.icon;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={`interest-chip-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleInterest(topic.id)}
                  >
                    <span
                      className="chip-icon"
                      style={{
                        color: topic.color,
                      }}
                    >
                      <IconComponent size={20} />
                    </span>
                    <div className="chip-text">
                      <b>{topic.label}</b>
                      <small>{topic.desc}</small>
                    </div>
                    <span className="chip-check-wrap">
                      {isSelected ? <CheckIcon size={14} /> : "+"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="onboarding-footer">
              <button
                type="button"
                className="onboarding-primary-btn"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: JOIN COMMUNITIES */}
        {step === 2 && (
          <div className="onboarding-step-body">
            <h2 id="onboarding-title" className="onboarding-title">Join communities to follow discussions</h2>
            <p id="onboarding-description" className="onboarding-subtitle">
              Join any communities you want to follow. This step is optional.
            </p>

            <div className="interest-counter-bar">
              <span className={`count-badge ${canFinishStep2 ? "ready" : ""}`}>
                {joinedCommunities.length ? `${joinedCommunities.length} communities joined` : "No communities joined"}
              </span>
            </div>

            <div className="communities-onboarding-grid">
              {communitiesList.map((c) => {
                const isJoined = joinedCommunities.includes(c.id);
                return (
                  <div key={c.id} className={`onboarding-community-card ${isJoined ? "joined" : ""}`}>
                    <div className="community-card-info">
                      <b>{c.name}</b>
                      <p>{c.desc}</p>
                    </div>
                    <button
                      type="button"
                      className={`join-action-btn ${isJoined ? "active" : ""}`}
                      onClick={() => toggleCommunity(c.id)}
                    >
                      {isJoined ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <CheckIcon size={13} /> Joined
                        </span>
                      ) : (
                        "+ Join"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="onboarding-footer dual-buttons">
              <button
                type="button"
                className="onboarding-secondary-btn"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button type="button" className="onboarding-secondary-btn" onClick={onDismiss}>
                Skip for now
              </button>
              <button type="button" className="onboarding-primary-btn" onClick={handleFinish}>
                Finish setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

