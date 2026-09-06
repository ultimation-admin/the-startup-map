"use client";

import React, { useState, useEffect } from "react";
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
import { TermsAgreementCheckbox } from "./TermsAgreementCheckbox";

interface FeedOnboardingModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: (selectedInterests: string[], joinedCommunities: string[]) => void;
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

export function FeedOnboardingModal({ isOpen, userId, onComplete }: FeedOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(["startups"]);
  const [communitiesList, setCommunitiesList] = useState(DEFAULT_COMMUNITIES);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  const canProceedStep1 = selectedInterests.length >= 3;
  const canFinishStep2 = joinedCommunities.length >= 3 && agreedToTerms;

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
    <div className="onboarding-modal-backdrop">
      <div className="onboarding-modal-card">
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
            <h2 className="onboarding-title">What do you want to see on your feed?</h2>
            <p className="onboarding-subtitle">
              Select at least <b>3 topics</b> to personalize your algorithm and discover relevant startups & peers.
            </p>

            <div className="interest-counter-bar">
              <span className={`count-badge ${canProceedStep1 ? "ready" : ""}`}>
                {selectedInterests.length >= 3
                  ? `✓ ${selectedInterests.length} Topics Selected (Ready)`
                  : `Selected ${selectedInterests.length} of 3 minimum`}
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
                {canProceedStep1 ? "Next" : "Select at least 3 topics to continue"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: JOIN COMMUNITIES */}
        {step === 2 && (
          <div className="onboarding-step-body">
            <h2 className="onboarding-title">Join communities to follow discussions</h2>
            <p className="onboarding-subtitle">
              Join at least <b>3 ecosystem communities</b> to populate your Joined feed and receive active discussion updates.
            </p>

            <div className="interest-counter-bar">
              <span className={`count-badge ${canFinishStep2 ? "ready" : ""}`}>
                {joinedCommunities.length >= 3
                  ? `✓ ${joinedCommunities.length} Communities Joined (Ready)`
                  : `Joined ${joinedCommunities.length} of 3 minimum`}
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

            <div style={{ marginTop: "16px", marginBottom: "8px" }}>
              <TermsAgreementCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} />
            </div>

            <div className="onboarding-footer dual-buttons">
              <button
                type="button"
                className="onboarding-secondary-btn"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="onboarding-primary-btn"
                disabled={!canFinishStep2}
                onClick={handleFinish}
              >
                {canFinishStep2
                  ? "Finish setup"
                  : joinedCommunities.length < 3
                  ? "Join min. 3 communities"
                  : "Agree to terms to finish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

