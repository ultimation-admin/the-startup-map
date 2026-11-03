"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { SignUpIllustration, SignUpHeaderIllustration } from "@/components/AuthIllustrations";

export default function SignUpPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#FFFFFF] p-4">
        <div className="w-[360px] h-[400px] bg-white rounded-[24px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-black flex flex-col justify-between relative overflow-hidden">
      {/* Top Bar with Brand & Back Link */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <span className="w-8 h-8 rounded-xl bg-[#f85900] text-black flex items-center justify-center font-semibold text-sm shadow-none transition-colors group-hover:brightness-95">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11Z" />
              <path d="m4 6.5 8 3.5 8-3.5M12 10v11" />
            </svg>
          </span>
          <span className="font-bold text-base tracking-tight text-black">The Startup Map</span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-[#E3E3E3] border border-[#E3E3E3] rounded-full shadow-sm backdrop-blur-md transition-all active:scale-95"
        >
          ← Back to Map
        </Link>
      </header>

      {/* Main Content: Split layout on desktop, clean centered card on mobile */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column (Desktop Illustration & Value Prop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3E3E3] border border-[#E3E3E3] text-xs font-semibold text-[#757575] mb-4 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-[#000000] animate-pulse" />
              Claim Your Spot
            </div>

            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-black leading-tight mb-3">
              Put your venture on <br />
              <span className="text-[#f85900]">The Startup Map.</span>
            </h1>

            <p className="text-sm text-[#757575] max-w-md leading-relaxed mb-6">
              Create your profile to showcase your startup, connect with co-founders, hire top talent, and get discovered by angels and VCs.
            </p>

            {/* Custom SVG Vector Illustration */}
            <div className="relative max-w-lg">
              <SignUpIllustration />
            </div>

            {/* Value Highlights */}
            <div className="grid grid-cols-3 gap-3 mt-4 max-w-lg">
              <div className="bg-[#E3E3E3] border border-[#E3E3E3] rounded-2xl p-3 text-center">
                <span className="block text-base font-bold text-black">100%</span>
                <span className="text-[11px] text-[#757575]">Free to Join</span>
              </div>
              <div className="bg-[#E3E3E3] border border-[#E3E3E3] rounded-2xl p-3 text-center">
                <span className="block text-base font-bold text-black">Direct</span>
                <span className="text-[11px] text-[#757575]">Investor Access</span>
              </div>
              <div className="bg-[#E3E3E3] border border-[#E3E3E3] rounded-2xl p-3 text-center">
                <span className="block text-base font-bold text-black">Verified</span>
                <span className="text-[11px] text-[#757575]">Founder Badge</span>
              </div>
            </div>
          </div>

          {/* Right Column: Card container strictly per DESIGN.md */}
          <div className="w-full lg:col-span-5 flex justify-center">
            <div className="auth-modal-card w-full max-w-[380px] shadow-2xl">
              {/* Chrome Navigation: Segmented Switcher */}
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center p-1 bg-[#E3E3E3] rounded-full text-xs font-semibold">
                  <Link
                    href="/sign-in"
                    className="py-1 px-3.5 rounded-full text-[#757575] hover:text-black font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <span className="py-1 px-3.5 rounded-full bg-white text-black shadow-xs font-semibold">
                    Create Account
                  </span>
                </div>
              </div>

              {/* Mobile / Tablet Compact Illustration */}
              <div className="lg:hidden flex justify-center mb-1">
                <SignUpHeaderIllustration />
              </div>

              {/* Editorial Greeting */}
              <div className="mb-3 text-center">
                <h2 className="text-[18px] font-bold tracking-tight text-black">Join The Startup Map</h2>
                <p className="text-xs text-[#757575] mt-0.5">Create your account in seconds</p>
              </div>

              <div className="auth-modal-content">
                <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/" fallbackRedirectUrl="/" />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-[#757575]">
        © {new Date().getFullYear()} The Startup Map. Made for people building what’s next.
      </footer>
    </div>
  );
}
