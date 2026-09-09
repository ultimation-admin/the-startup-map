"use client";

import React, { useState } from "react";
import { Listing } from "@/lib/db";
import {
  RocketIcon,
  UserIcon,
  MapPinIcon,
  SparklesIcon,
  AlertTriangleIcon,
  CheckIcon,
  UploadIcon,
} from "./Icons";
import { TermsAgreementCheckbox } from "./TermsAgreementCheckbox";

interface AddListingFormProps {
  userId: string;
  onCancel: () => void;
  onSuccess: (newListing: Listing) => void;
  pickedCoords: [number, number] | null;
  setPickedCoords: (coords: [number, number] | null) => void;
}

const CITIES_LIST = [
  "Bengaluru",
  "Delhi NCR",
  "Mumbai",
  "Hyderabad",
  "Pune",
  "Chennai",
];

const STAGES_LIST = [
  "Seed",
  "Bootstrapped",
  "Series A",
  "Series B",
  "Series C",
  "Public",
];

const SECTORS_LIST = [
  "AI",
  "SaaS",
  "D2C",
  "E-commerce",
  "FinTech",
  "EdTech",
  "HealthTech",
  "EV/Mobility",
  "Gaming",
  "Logistics",
  "Entertainment",
  "Manufacturing",
  "Others",
];

const ROLES_LIST = [
  "Founder",
  "Co-Founder",
  "Engineer",
  "Product",
  "Design",
  "Growth",
  "Operator",
  "Angel Investor",
];

export function AddListingForm({
  userId,
  onCancel,
  onSuccess,
  pickedCoords,
  setPickedCoords,
}: AddListingFormProps) {
  // Tab state: "startup" | "person"
  const [tab, setTab] = useState<"startup" | "person">("startup");

  // Shared / Common Fields
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [tweetUrl, setTweetUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Startup specific fields
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState("Seed");
  const [sector, setSector] = useState("AI");

  // People specific fields
  const [role, setRole] = useState("Founder");

  // Local File Selection Handler (Zero network calls while editing/changing)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);
    setError(null);

    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      return setError("You must agree to the Terms of Service and Privacy Policy before submitting.");
    }

    if (!pickedCoords) {
      return setError("Please click anywhere on the map panel on the right to set your exact location pin!");
    }

    // Strict validation enforcing ALL fields required
    if (tab === "startup") {
      if (!name.trim()) return setError("Company name is required.");
      if (!phone.trim()) return setError("Phone number is required.");
      if (!logoUrl) return setError("Upload Logo (<5MB, 1:1 ratio) is required.");
      if (!website.trim()) return setError("Website URL is required.");
      if (!description.trim()) return setError("Short description is required.");
      if (!stage) return setError("Funding stage is required.");
      if (!sector) return setError("Sector is required.");
      if (!tweetUrl.trim()) return setError("Tweet link is required.");
    } else {
      if (!name.trim()) return setError("Full name is required.");
      if (!phone.trim()) return setError("Phone number is required.");
      if (!logoUrl) return setError("Upload Profile Picture (<5MB, 1:1 ratio) is required.");
      if (!role) return setError("Role is required.");
      if (!website.trim()) return setError("Portfolio / Website link is required.");
      if (!description.trim()) return setError("Short description is required.");
      if (!tweetUrl.trim()) return setError("Tweet link is required.");
    }

    setLoading(true);
    let finalR2LogoUrl = logoUrl.startsWith("blob:") ? "" : logoUrl;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folder", "logos");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalR2LogoUrl = uploadData.url || finalR2LogoUrl;
        }
      } catch (err) {
        console.warn("R2 upload error during profile submission:", err);
      } finally {
        setIsUploading(false);
      }
    }

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: tab === "startup" ? "startup" : "person",
          city,
          sector: tab === "startup" ? sector : "People & Talent",
          website,
          description: description.trim(),
          stage: tab === "startup" ? stage : role,
          logo_url: finalR2LogoUrl,
          tweet_url: tweetUrl,
          phone_number: phone.trim(),
          longitude: pickedCoords[0],
          latitude: pickedCoords[1],
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to publish listing.");
      }

      const data = await res.json();
      onSuccess(data.listing);
    } catch (err: any) {
      setError(err.message || "Failed to publish listing. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-panel-container compact-create-profile-container">
      {/* HEADER ROW */}
      <div className="create-profile-header">
        <button type="button" className="back-btn compact-back-btn" onClick={onCancel}>
          ← Back
        </button>
        <div className="create-profile-title-wrap">
          <h2 className="panel-title compact-title">Put yourself on the map</h2>
          <span className="profile-handle-badge">
            {tab === "startup"
              ? `s/${(name.trim() || "StartupName").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
              : `p/${(name.trim() || "YourName").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
          </span>
        </div>
      </div>

      {/* CONTROLS ROW: TYPE SELECTOR + MAP PIN STATUS */}
      <div className="create-profile-top-controls">
        <div className="tab-segmented-selector compact-tabs">
          <button
            type="button"
            className={`tab-btn ${tab === "startup" ? "active" : ""}`}
            onClick={() => {
              setTab("startup");
              setError(null);
            }}
          >
            <RocketIcon size={13} /> Startup
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === "person" ? "active" : ""}`}
            onClick={() => {
              setTab("person");
              setError(null);
            }}
          >
            <UserIcon size={13} /> People
          </button>
        </div>

        <div className={`location-picker-box compact-location-box ${pickedCoords ? "pinned" : ""}`}>
          <div className="location-info">
            <span className="location-icon">
              <MapPinIcon size={14} />
            </span>
            <div className="location-text">
              <b>Map Location Pin *</b>
              <p>
                {pickedCoords
                  ? `[Lat: ${pickedCoords[1].toFixed(3)}, Lng: ${pickedCoords[0].toFixed(3)}]`
                  : "Click map to pin"}
              </p>
            </div>
          </div>
          {pickedCoords && (
            <button
              type="button"
              className="clear-pin-btn"
              onClick={() => setPickedCoords(null)}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="inline-form compact-form grid-form-layout">
        {error && (
          <div className="form-error-alert grid-col-full">
            <AlertTriangleIcon size={14} /> {error}
          </div>
        )}

        {tab === "startup" ? (
          /* ================= 2-COLUMN STRUCTURED STARTUP FORM ================= */
          <>
            <div className="form-group">
              <label htmlFor="company-name">Company Name *</label>
              <input
                id="company-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme AI"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone-number">Phone Number *</label>
              <input
                id="phone-number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="startup-city">City *</label>
              <select
                id="startup-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                required
              >
                {CITIES_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="startup-stage">Stage *</label>
              <select
                id="startup-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                disabled={loading}
                required
              >
                {STAGES_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="startup-sector">Sector *</label>
              <select
                id="startup-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={loading}
                required
              >
                {SECTORS_LIST.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="website-url">Website URL *</label>
              <input
                id="website-url"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="upload-logo-input" className="label-with-subtext">
                <span>Upload Logo *</span>
                <span className="label-subtext">(&lt;5MB, 1:1)</span>
              </label>
              <div className="custom-file-picker-row">
                <label htmlFor="upload-logo-input" className="choose-file-btn">
                  <UploadIcon size={13} />
                  <span>{logoUrl ? "Change Logo" : "Choose File"}</span>
                </label>
                <input
                  id="upload-logo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={loading}
                  required={!logoUrl}
                  className="hidden-file-input"
                />
                {logoUrl ? (
                  <div className="inline-uploaded-logo">
                    <img src={logoUrl} alt="Logo Preview" />
                    <span>Uploaded <CheckIcon size={12} /></span>
                  </div>
                ) : (
                  <span className="file-name-display">{fileName || "No file selected"}</span>
                )}
              </div>
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="tweet-link" className="label-with-subtext">
                <span>Proof Tweet Link *</span>
                <span className="label-subtext">(Admin verification)</span>
              </label>
              <input
                id="tweet-link"
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="https://x.com/username/status/123456"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="short-desc">Short Description *</label>
              <textarea
                id="short-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what you build in 1-2 concise sentences."
                required
                disabled={loading}
              />
            </div>
          </>
        ) : (
          /* ================= 2-COLUMN STRUCTURED PEOPLE FORM ================= */
          <>
            <div className="form-group">
              <label htmlFor="full-name">Full Name *</label>
              <input
                id="full-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="people-phone">Phone Number *</label>
              <input
                id="people-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="people-city">City *</label>
              <select
                id="people-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                required
              >
                {CITIES_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="people-role">Role *</label>
              <select
                id="people-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                required
              >
                {ROLES_LIST.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="portfolio-link">Portfolio / Website Link *</label>
              <input
                id="portfolio-link"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourportfolio.com or LinkedIn"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="tweet-link-people" className="label-with-subtext">
                <span>Proof Tweet Link *</span>
                <span className="label-subtext">(Admin verification)</span>
              </label>
              <input
                id="tweet-link-people"
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="https://x.com/username/status/123456"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="profile-pic-input" className="label-with-subtext">
                <span>Upload Profile Picture *</span>
                <span className="label-subtext">(&lt;5MB, 1:1)</span>
              </label>
              <div className="custom-file-picker-row">
                <label htmlFor="profile-pic-input" className="choose-file-btn">
                  <UploadIcon size={13} />
                  <span>{logoUrl ? "Change Photo" : "Choose File"}</span>
                </label>
                <input
                  id="profile-pic-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={loading}
                  required={!logoUrl}
                  className="hidden-file-input"
                />
                {logoUrl ? (
                  <div className="inline-uploaded-logo">
                    <img src={logoUrl} alt="Profile Preview" />
                    <span>Uploaded <CheckIcon size={12} /></span>
                  </div>
                ) : (
                  <span className="file-name-display">{fileName || "No file selected"}</span>
                )}
              </div>
            </div>

            <div className="form-group grid-col-full">
              <label htmlFor="people-desc">Short Description *</label>
              <textarea
                id="people-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Introduce yourself and your work in 1-2 concise sentences."
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        <div className="grid-col-full" style={{ marginTop: "6px", marginBottom: "14px" }}>
          <TermsAgreementCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} />
        </div>

        <button type="submit" className="submit-form-btn grid-col-full" disabled={loading || !agreedToTerms}>
          {loading ? (
            <span className="submit-btn-spinner-wrap">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Submitting for Review...
            </span>
          ) : (
            "Submit for Review"
          )}
        </button>
      </form>
    </div>
  );
}
