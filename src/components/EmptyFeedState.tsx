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
      <h3 className="empty-feed-title">{title}</h3>
      <p className="empty-feed-description">{description}</p>

      <div className="empty-feed-actions">
        {onAction && (
          <button type="button" className="empty-feed-primary-btn" onClick={onAction}>
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
