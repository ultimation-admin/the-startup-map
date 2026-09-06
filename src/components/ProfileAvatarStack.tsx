"use client";

import React, { useState, useEffect, useRef } from "react";
import { Listing } from "@/lib/db";
import { UserIcon, RocketIcon, PlusIcon, ChevronDownIcon, CheckIcon, SettingsIcon, LogOutIcon } from "./Icons";
import { useClerk } from "@clerk/nextjs";

interface ProfileAvatarStackProps {
  userId: string;
  userEmail?: string;
  userInitials?: string;
  userAvatarUrl?: string;
  activeListingId: string | null;
  onSelectProfile: (listing: Listing) => void;
  onAddNewClick: () => void;
  onOpenAccountSettings?: () => void;
}

export function ProfileAvatarStack({
  userId,
  userEmail = "user@startupmap.in",
  userInitials = "US",
  userAvatarUrl,
  activeListingId,
  onSelectProfile,
  onAddNewClick,
  onOpenAccountSettings,
}: ProfileAvatarStackProps) {
  const { openUserProfile, signOut } = useClerk();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadUserProfiles = async () => {
    try {
      const res = await fetch(`/api/listings?owner_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.listings || []);
        setListings(items);
      }
    } catch (err) {
      console.error("Failed to load user profiles:", err);
    }
  };

  useEffect(() => {
    loadUserProfiles();
    const interval = setInterval(() => loadUserProfiles(), 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProfile = listings.find((l) => l.id === activeListingId) || (listings.length > 0 ? listings[0] : null);

  return (
    <div className="profile-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
      {/* TRIGGER CLUSTER: Unified cluster container. Avatar click opens studio, chevron click opens dropdown popover */}
      <div
        className={`profile-trigger-cluster ${isOpen ? "open" : ""}`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".trigger-chevron-wrap") || target.closest(".trigger-chevron")) {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          } else {
            if (activeProfile) {
              onSelectProfile(activeProfile);
            } else {
              onAddNewClick();
            }
          }
        }}
      >
        {/* IF NO PROFILES CREATED YET, DISPLAY '+' BUTTON */}
        {listings.length === 0 && (
          <button
            type="button"
            className="create-profile-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddNewClick();
            }}
            title="Create your startup or person profile (+)"
          >
            <PlusIcon size={13} />
            <span>Create Profile</span>
          </button>
        )}

        {/* AVATAR WRAPPER */}
        <div
          className="trigger-avatar-wrapper"
          title={activeProfile ? `Open Profile Studio (${activeProfile.name})` : "Create Profile (+)"}
        >
          {activeProfile ? (
            activeProfile.logo_url ? (
              <img src={activeProfile.logo_url} alt={activeProfile.name} className="trigger-avatar-img" loading="lazy" decoding="async" />
            ) : (
              <span className="trigger-avatar-content" style={{ background: activeProfile.color }}>
                {activeProfile.initials}
              </span>
            )
          ) : userAvatarUrl ? (
            <img src={userAvatarUrl} alt="Account" className="trigger-avatar-img" loading="lazy" decoding="async" />
          ) : (
            <span className="trigger-avatar-content master">
              {userInitials}
            </span>
          )}
        </div>

        {/* CHEVRON SPAN - NOT A SEPARATE BUTTON ELEMENT */}
        <span
          className={`trigger-chevron-wrap ${isOpen ? "open" : ""}`}
          title="Account & Profile Menu"
        >
          <ChevronDownIcon size={12} className={`trigger-chevron ${isOpen ? "open" : ""}`} />
        </span>
      </div>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="profile-menu-popover">
          {/* Section 1: ACCOUNT HEADER + BESIDE SETTINGS & LOGOUT ICONS */}
          <div className="menu-section-header">ACCOUNT</div>
          <div className="menu-account-card">
            <div className="account-user-info">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="User" className="account-user-avatar" loading="lazy" decoding="async" />
              ) : (
                <span className="account-user-initials">{userInitials}</span>
              )}
              <div className="account-details">
                <span className="account-name">Account</span>
                <span className="account-email">{userEmail}</span>
              </div>
            </div>

            <div className="account-icon-actions">
              <button
                type="button"
                className="account-icon-btn"
                onClick={() => {
                  setIsOpen(false);
                  if (openUserProfile) {
                    openUserProfile();
                  } else if (onOpenAccountSettings) {
                    onOpenAccountSettings();
                  }
                }}
                title="Account Settings"
              >
                <SettingsIcon size={13} />
              </button>

              <button
                type="button"
                className="account-icon-btn logout"
                onClick={() => {
                  setIsOpen(false);
                  if (signOut) signOut({ redirectUrl: "/" });
                }}
                title="Log Out"
              >
                <LogOutIcon size={13} />
              </button>
            </div>
          </div>

          <div className="menu-divider" />

          {/* Section 2: PROFILES */}
          <div className="menu-section-header">YOUR PROFILES ({listings.length})</div>
          {listings.length === 0 ? (
            <div className="menu-empty-state" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>No profiles created yet.</span>
              <button
                type="button"
                className="create-profile-icon-btn"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewClick();
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <PlusIcon size={13} />
                <span>+ Create Profile</span>
              </button>
            </div>
          ) : (
            <div className="menu-profiles-list">
              {listings.map((profile) => {
                const isSelected = activeListingId === profile.id;
                const state = profile.review_state || "pending";

                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={`menu-item-row ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onSelectProfile(profile);
                      setIsOpen(false);
                    }}
                  >
                    <div className="menu-item-avatar-wrapper">
                      {profile.logo_url ? (
                        <img src={profile.logo_url} alt={profile.name} className="menu-item-avatar-img" />
                      ) : (
                        <span className="menu-item-avatar" style={{ background: profile.color }}>
                          {profile.initials}
                        </span>
                      )}
                    </div>

                    <div className="menu-item-info">
                      <span className="menu-item-name">{profile.name}</span>
                      <span className="menu-item-meta">
                        {profile.type === "startup" ? "Startup" : "People Profile"} &bull; {state.toUpperCase()}
                      </span>
                    </div>

                    {isSelected && <CheckIcon size={14} className="menu-item-check" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="menu-divider" />

          {/* Section 3: CREATE NEW PROFILE */}
          <button
            type="button"
            className="menu-item-action-create"
            onClick={() => {
              onAddNewClick();
              setIsOpen(false);
            }}
          >
            <span className="create-icon-badge">
              <PlusIcon size={12} />
            </span>
            <span>Create New Profile</span>
          </button>
        </div>
      )}

      {/* Embedded Styles */}
      <style jsx>{`
        .profile-dropdown-container {
          display: inline-block;
        }

        .profile-dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #ffffff;
          border: 1px solid rgba(28, 25, 23, 0.15);
          border-radius: 9999px;
          padding: 2px 8px 2px 2px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .profile-dropdown-trigger:hover,
        .profile-dropdown-trigger.active {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
          background: #fafafa;
        }

        .trigger-avatar-wrapper {
          position: relative;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border-radius: 50%;
        }

        .trigger-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .trigger-avatar-content {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          background: #1c1917;
        }

        .trigger-avatar-content.master {
          background: #10b981;
          color: #ffffff;
        }

        .trigger-chevron {
          color: #666666;
          transition: transform 0.2s ease;
        }

        .trigger-chevron.open {
          transform: rotate(180deg);
        }

        .profile-menu-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 260px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.04);
          z-index: 9999;
          transform-origin: top right;
          animation: menuFadeIn 0.16s cubic-bezier(0.23, 1, 0.32, 1);
        }

        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .menu-section-header {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #888888;
          padding: 4px 8px 2px 8px;
        }

        .menu-account-card {
          padding: 8px 10px;
          background: #f8f8fa;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 2px;
        }

        .account-user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }

        .account-user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .account-user-initials {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #10b981;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .account-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .account-name {
          font-size: 12px;
          font-weight: 700;
          color: #1c1917;
        }

        .account-email {
          font-size: 10px;
          color: #666666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .account-icon-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .account-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #ffffff;
          color: #555555;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .account-icon-btn:hover {
          background: #eeeeee;
          color: #1c1917;
          border-color: rgba(0, 0, 0, 0.15);
        }

        .account-icon-btn.logout {
          color: #ef4444;
        }

        .account-icon-btn.logout:hover {
          background: #fef2f2;
          color: #dc2626;
          border-color: rgba(239, 68, 68, 0.25);
        }

        .menu-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
          margin: 6px 0;
        }

        .menu-item-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border: 0;
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s ease;
        }

        .menu-item-row:hover {
          background: #f4f4f6;
        }

        .menu-item-row.selected {
          background: #eefcf3;
        }

        .menu-item-avatar-wrapper {
          position: relative;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }

        .menu-item-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .menu-item-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          background: #1c1917;
          flex-shrink: 0;
        }

        .menu-item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .menu-item-name {
          font-size: 12px;
          font-weight: 700;
          color: #1c1917;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-item-meta {
          font-size: 10px;
          color: #666666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-item-check {
          color: #10b981;
          flex-shrink: 0;
        }

        .menu-empty-state {
          font-size: 11px;
          color: #888888;
          padding: 8px;
          text-align: center;
          font-style: italic;
        }

        .menu-profiles-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-item-action-create {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border: 0;
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          color: #1c1917;
          transition: background 0.12s ease;
        }

        .menu-item-action-create:hover {
          background: #eefcf3;
          color: #16a34a;
        }

        .create-icon-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #10b981;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
