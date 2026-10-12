"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black p-4">
        <div className="w-[360px] h-[400px] bg-white rounded-[24px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-black p-4 sm:p-6 relative overflow-hidden">
      {/* Floating Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full shadow-sm backdrop-blur-md transition-all active:scale-95 z-20"
      >
        ← Back to Map
      </Link>

      {/* Card container strictly per DESIGN.md */}
      <div className="auth-modal-card z-10">
        {/* Chrome Navigation: Segmented Switcher */}
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center p-1 bg-[#F0F2F5] rounded-full text-xs font-semibold">
            <Link
              href="/sign-in"
              className="py-1 px-3.5 rounded-full text-[#5B6368] hover:text-black font-medium transition-colors"
            >
              Sign In
            </Link>
            <span className="py-1 px-3.5 rounded-full bg-white text-black shadow-xs font-semibold">
              Create Account
            </span>
          </div>
        </div>

        {/* Editorial Greeting */}
        <div className="mb-3 text-center">
          <h1 className="text-[18px] font-bold tracking-tight text-black">Join The Startup Map</h1>
          <p className="text-xs text-[#5B6368] mt-0.5">Create your account in seconds</p>
        </div>

        <div className="auth-modal-content">
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/" fallbackRedirectUrl="/" />
        </div>
      </div>
    </div>
  );
}
