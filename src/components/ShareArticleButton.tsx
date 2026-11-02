"use client";

import { useState } from "react";

export function ShareArticleButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this article link", url);
    }
  };

  return <button type="button" className="article-share-button" onClick={() => void share()}>{copied ? "Link copied" : "Share article"}</button>;
}
