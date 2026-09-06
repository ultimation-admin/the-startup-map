"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DEFAULT_PRIVACY_POLICY } from "@/lib/legalContent";

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<string>(DEFAULT_PRIVACY_POLICY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/legal?doc=privacy_policy")
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
        }
      })
      .catch((err) => console.error("Error loading privacy policy:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#0f172a] font-sans antialiased selection:bg-[#10b981]/20">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 no-underline">
            <span className="font-black text-xl tracking-tight text-black">THE</span>
            <span className="bg-[#10b981] text-white font-black text-xs tracking-wider px-2 py-1 rounded-md uppercase">
              STARTUP
            </span>
            <span className="font-black text-xl tracking-tight text-black">MAP</span>
          </Link>
          <span className="text-[9.5px] font-extrabold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 uppercase tracking-widest">
            BETA
          </span>
        </div>

        <span className="text-[11px] font-black text-[#10b981] uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/60 shadow-xs">
          LEGAL
        </span>
      </header>

      {/* Main Document Body */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button on top of page above card */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline bg-white border border-black/5 shadow-xs px-4 py-2 rounded-full transition-all"
          >
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-black/5">
          <div className="border-b border-slate-100 pb-6 mb-8 flex flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                The Startup Map Platform
              </p>
            </div>
            <span className="text-[11px] font-black text-[#10b981] uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/50">
              LEGAL
            </span>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse py-8">
              <div className="h-4 bg-slate-100 rounded-md w-3/4" />
              <div className="h-4 bg-slate-100 rounded-md w-full" />
              <div className="h-4 bg-slate-100 rounded-md w-5/6" />
              <div className="h-4 bg-slate-100 rounded-md w-2/3" />
            </div>
          ) : (
            <article className="prose prose-slate max-w-none text-sm leading-relaxed text-[#334155] whitespace-pre-wrap font-sans">
              {content}
            </article>
          )}

          <div className="border-t border-slate-100 mt-12 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <p className="m-0">© {new Date().getFullYear()} The Startup Map. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/terms-of-service" className="text-[#059669] font-bold hover:underline">
                Terms of Service →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
