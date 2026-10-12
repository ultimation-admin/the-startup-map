"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const trackedThresholds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (typeof window !== "undefined" && posthogKey) {
      if (!(window as any).posthog || !(window as any).posthog.__loaded) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          person_profiles: "identified_only",
          capture_pageview: true,
          capture_pageleave: true,
          capture_performance: true,
          enable_heatmaps: true,
        });
      } else {
        (window as any).posthog.capture("$pageview");
      }

      const handleScroll = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return;
        const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

        [25, 50, 75, 90].forEach((threshold) => {
          if (scrollPercent >= threshold && !trackedThresholds.current.has(threshold)) {
            trackedThresholds.current.add(threshold);
            const ph = posthog || (window as any).posthog;
            if (ph && typeof ph.capture === "function") {
              ph.capture("$scroll_depth", {
                $scroll_depth_percent: threshold,
                percentage: threshold,
              });
            }
          }
        });
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
