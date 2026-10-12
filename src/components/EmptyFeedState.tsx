"use client";

import React from "react";

interface EmptyFeedStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyFeedState({
  title = "No posts in this feed yet",
  description = "Be the first to share startup updates, ask questions, or introduce your journey with the community.",
  actionLabel = "Create a post",
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyFeedStateProps) {
  return (
    <div className="empty-feed-container" role="region" aria-label="Empty feed state">
      <div className="empty-feed-icon-circle">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="13" y2="13" />
        </svg>
      </div>

      <h3 className="empty-feed-title">{title}</h3>
      <p className="empty-feed-description">{description}</p>

      <div className="empty-feed-actions">
        {onAction && (
          <button type="button" className="empty-feed-primary-btn" onClick={onAction}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{actionLabel}</span>
          </button>
        )}

        {onSecondaryAction && secondaryActionLabel && (
          <button type="button" className="empty-feed-secondary-btn" onClick={onSecondaryAction}>
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
