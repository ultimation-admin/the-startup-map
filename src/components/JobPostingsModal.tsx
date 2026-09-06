"use client";
import React, { useState, useEffect } from "react";
import { JobPosting, Listing } from "@/lib/db";

interface JobPostingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  currentUser: any | null;
}

export function JobPostingsModal({ isOpen, onClose, listing, currentUser }: JobPostingsModalProps) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is owner (or in mock mode, if we are logged in, we let the user manage it if they created it or if they are in development)
  const isOwner = currentUser && (listing.owner_id === currentUser.id || listing.owner_id === "system");

  useEffect(() => {
    if (!isOpen) return;

    async function loadJobs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs?listing_id=${listing.id}`);
        if (res.ok) {
          const data = await res.json();
          setJobs(Array.isArray(data) ? data : (data.jobs || []));
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [isOpen, listing.id]);

  if (!isOpen) return null;

  const handleAddJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !applicationUrl) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.id,
          title,
          location,
          employment_type: employmentType,
          application_url: applicationUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create job posting.");
      }

      const data = await res.json();
      setJobs((prev) => [data.job || data, ...prev]);
      setTitle("");
      setLocation("");
      setApplicationUrl("");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to create job posting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="jobs-overlay">
      <div className="jobs-modal">
        <button className="jobs-close" onClick={onClose}>
          &times;
        </button>
        <span className="jobs-kicker">{listing.name.toUpperCase()} JOBS</span>
        <h2>Careers at {listing.name}</h2>
        <p className="jobs-desc">Explore active job opportunities and apply directly.</p>

        {loading ? (
          <div className="jobs-loading">Loading career opportunities...</div>
        ) : (
          <div className="jobs-content">
            {jobs.length === 0 && !showAddForm ? (
              <div className="jobs-empty">
                <p>No active openings at the moment.</p>
                {isOwner && (
                  <button className="jobs-btn-primary" onClick={() => setShowAddForm(true)}>
                    + Post the first job
                  </button>
                )}
              </div>
            ) : (
              <div className="jobs-list">
                {!showAddForm && jobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div>
                      <h3>{job.title}</h3>
                      <p>{job.location} &bull; {job.employment_type}</p>
                    </div>
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-apply"
                    >
                      Apply &rarr;
                    </a>
                  </div>
                ))}

                {!showAddForm && isOwner && (
                  <button className="jobs-btn-secondary" onClick={() => setShowAddForm(true)}>
                    + Add another job posting
                  </button>
                )}
              </div>
            )}

            {showAddForm && (
              <form onSubmit={handleAddJobSubmit} className="add-job-form">
                <h3>Post a New Job</h3>
                {error && <div className="jobs-error">{error}</div>}
                
                <div className="form-group">
                  <label htmlFor="job-title">Job Title</label>
                  <input
                    id="job-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lead Frontend Engineer"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="job-location">Location</label>
                    <input
                      id="job-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Bengaluru (Hybrid), Remote"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="job-type">Type</label>
                    <select
                      id="job-type"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="job-url">Application URL</label>
                  <input
                    id="job-url"
                    type="url"
                    value={applicationUrl}
                    onChange={(e) => setApplicationUrl(e.target.value)}
                    placeholder="e.g. https://company.com/careers/apply"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="jobs-btn-link"
                    onClick={() => setShowAddForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="jobs-btn-primary" disabled={submitting}>
                    {submitting ? "Posting..." : "Post Job"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .jobs-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(25, 49, 39, 0.4);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        .jobs-modal {
          position: relative;
          background: rgba(255, 253, 249, 0.95);
          border: 1px solid rgba(216, 224, 212, 0.7);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(28, 51, 36, 0.15);
          width: 100%;
          max-width: 460px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .jobs-close {
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: 0;
          font-size: 24px;
          cursor: pointer;
          color: #738177;
          transition: color 0.2s;
        }
        .jobs-close:hover {
          color: #193127;
        }
        .jobs-kicker {
          font: 500 9px "DM Mono", monospace;
          letter-spacing: 1.5px;
          color: #78a747;
          margin-bottom: 8px;
        }
        .jobs-modal h2 {
          font: 500 24px Fraunces, serif;
          margin: 0 0 8px;
          color: #193127;
        }
        .jobs-desc {
          font-size: 13px;
          color: #526359;
          margin: 0 0 20px;
          line-height: 1.45;
        }
        .jobs-loading {
          padding: 40px 0;
          text-align: center;
          font-size: 13px;
          color: #738177;
        }
        .jobs-empty {
          padding: 30px 10px;
          text-align: center;
          background: #fbfbf9;
          border: 1px dashed #d8e0d4;
          border-radius: 8px;
        }
        .jobs-empty p {
          font-size: 13px;
          color: #738177;
          margin: 0 0 15px;
        }
        .jobs-btn-primary {
          border: 0;
          border-radius: 6px;
          background: #1d3328;
          color: white;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .jobs-btn-primary:hover {
          background: #2d4c3c;
        }
        .jobs-btn-secondary {
          width: 100%;
          border: 1px dashed #d8e0d4;
          border-radius: 6px;
          background: none;
          color: #526359;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s;
          margin-top: 10px;
        }
        .jobs-btn-secondary:hover {
          background: #fbfbf9;
          border-color: #78a747;
          color: #193127;
        }
        .jobs-list {
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .job-card {
          background: white;
          border: 1px solid #d8e0d4;
          border-radius: 8px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .job-card:hover {
          border-color: #78a747;
          box-shadow: 0 4px 12px rgba(120,167,71,0.06);
        }
        .job-card h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px;
          color: #193127;
        }
        .job-card p {
          font-size: 11px;
          color: #738177;
          margin: 0;
        }
        .job-apply {
          font-size: 12px;
          font-weight: 700;
          color: #78a747;
          text-decoration: none;
          white-space: nowrap;
        }
        .job-apply:hover {
          text-decoration: underline;
        }
        .add-job-form {
          border-top: 1px solid #d8e0d4;
          padding-top: 20px;
        }
        .add-job-form h3 {
          font-family: Fraunces, serif;
          font-size: 18px;
          margin: 0 0 15px;
          color: #193127;
        }
        .jobs-error {
          background: #fdf2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 12px;
          margin-bottom: 16px;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 15px;
          margin-top: 20px;
        }
        .jobs-btn-link {
          background: none;
          border: 0;
          font-size: 13px;
          color: #738177;
          cursor: pointer;
        }
        .jobs-btn-link:hover {
          color: #193127;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
