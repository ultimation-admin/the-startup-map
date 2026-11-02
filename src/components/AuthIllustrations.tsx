"use client";

import React from "react";

export function SignInIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`auth-illustration-container ${className}`}>
      <svg
        viewBox="0 0 520 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="signInAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#f85900" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f85900" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="centerBeaconAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f85900" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff9a51" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="cardGlow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="cardGlow2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </linearGradient>

          {/* Filter for glow */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow aura */}
        <circle cx="260" cy="220" r="190" fill="url(#signInAura)" />

        {/* Isometric Grid Floor */}
        <g opacity="0.35" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3">
          {/* Horizontal grid lines */}
          <line x1="80" y1="240" x2="260" y2="350" />
          <line x1="120" y1="200" x2="300" y2="310" />
          <line x1="160" y1="160" x2="340" y2="270" />
          <line x1="200" y1="120" x2="380" y2="230" />
          <line x1="240" y1="80" x2="420" y2="190" />

          {/* Opposing diagonal grid lines */}
          <line x1="260" y1="350" x2="440" y2="240" />
          <line x1="220" y1="310" x2="400" y2="200" />
          <line x1="180" y1="270" x2="360" y2="160" />
          <line x1="140" y1="230" x2="320" y2="120" />
          <line x1="100" y1="190" x2="280" y2="80" />
        </g>

        {/* Concentric Radar Rings */}
        <ellipse cx="260" cy="230" rx="170" ry="85" stroke="#f85900" strokeOpacity="0.18" strokeWidth="1.5" />
        <ellipse cx="260" cy="230" rx="120" ry="60" stroke="#f85900" strokeOpacity="0.32" strokeWidth="1.5" strokeDasharray="5 5" />
        <ellipse cx="260" cy="230" rx="70" ry="35" stroke="#f85900" strokeOpacity="0.5" strokeWidth="1.5" />

        {/* Radar scan beam sweep */}
        <path
          d="M260 230 L380 180 A120 60 0 0 0 350 170 Z"
          fill="url(#beamGradient)"
          opacity="0.4"
        />

        {/* Network Trajectory Curves connecting cities */}
        <path
          d="M140 210 Q 200 160 260 230 T 380 200"
          fill="none"
          stroke="#f85900"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.75"
        />
        <path
          d="M260 230 Q 320 280 370 270"
          fill="none"
          stroke="#ff9a51"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <path
          d="M170 270 Q 210 250 260 230"
          fill="none"
          stroke="#f85900"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Secondary Hub: Bengaluru Node */}
        <g transform="translate(140, 210)">
          <circle cx="0" cy="0" r="14" fill="#f85900" fillOpacity="0.15" />
          <circle cx="0" cy="0" r="6" fill="#f85900" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </g>

        {/* Secondary Hub: Mumbai Node */}
        <g transform="translate(170, 270)">
          <circle cx="0" cy="0" r="12" fill="#f85900" fillOpacity="0.15" />
          <circle cx="0" cy="0" r="5" fill="#f85900" />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
        </g>

        {/* Secondary Hub: Delhi NCR Node */}
        <g transform="translate(380, 200)">
          <circle cx="0" cy="0" r="14" fill="#f85900" fillOpacity="0.15" />
          <circle cx="0" cy="0" r="6" fill="#f85900" />
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </g>

        {/* Secondary Hub: Hyderabad Node */}
        <g transform="translate(370, 270)">
          <circle cx="0" cy="0" r="12" fill="#f85900" fillOpacity="0.15" />
          <circle cx="0" cy="0" r="5" fill="#f85900" />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
        </g>

        {/* Central Ecosystem Beacon (Core Pin) */}
        <g transform="translate(260, 220)">
          <circle cx="0" cy="0" r="38" fill="url(#centerBeaconAura)" filter="url(#softGlow)" />
          <circle cx="0" cy="0" r="18" fill="#f85900" fillOpacity="0.25" />
          <circle cx="0" cy="0" r="10" fill="#f85900" />
          <circle cx="0" cy="0" r="4" fill="#ffffff" />

          {/* Central Holographic Pin */}
          <path
            d="M0 -38 C-9 -38 -16 -31 -16 -22 C-16 -10 0 0 0 0 C0 0 16 -10 16 -22 C16 -31 9 -38 0 -38 Z"
            fill="#f85900"
            filter="url(#softGlow)"
          />
          <circle cx="0" cy="-22" r="6" fill="#ffffff" />
        </g>

        {/* Floating Glassmorphism Metric Card 1 (Top Left) */}
        <g transform="translate(60, 80)">
          {/* Card background */}
          <rect
            x="0"
            y="0"
            width="170"
            height="58"
            rx="14"
            fill="#131b26"
            fillOpacity="0.88"
            stroke="url(#strokeGrad)"
            strokeWidth="1"
          />
          {/* Avatar / Icon circle */}
          <rect x="12" y="12" width="34" height="34" rx="10" fill="#f85900" fillOpacity="0.18" />
          <path
            d="M29 23 L25 30 L29 30 L27 36 L33 28 L29 28 Z"
            fill="#f85900"
          />
          {/* Texts */}
          <text x="54" y="27" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            Live Feed
          </text>
          <text x="54" y="42" fill="#94a3b8" fontSize="10" fontWeight="500" fontFamily="sans-serif">
            10,000+ Founders
          </text>
        </g>

        {/* Floating Glassmorphism Metric Card 2 (Bottom Right) */}
        <g transform="translate(300, 310)">
          <rect
            x="0"
            y="0"
            width="180"
            height="62"
            rx="14"
            fill="#131b26"
            fillOpacity="0.88"
            stroke="url(#strokeGrad)"
            strokeWidth="1"
          />
          {/* City Pin icon */}
          <circle cx="28" cy="31" r="16" fill="#10b981" fillOpacity="0.18" />
          <circle cx="28" cy="31" r="5" fill="#10b981" />
          {/* Texts */}
          <text x="54" y="27" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            Bengaluru • BLR
          </text>
          <text x="54" y="43" fill="#94a3b8" fontSize="10" fontWeight="500" fontFamily="sans-serif">
            1,450+ Verified Startups
          </text>
        </g>

        {/* Floating Tag 3 (Top Right) */}
        <g transform="translate(340, 95)">
          <rect
            x="0"
            y="0"
            width="135"
            height="34"
            rx="17"
            fill="#131b26"
            fillOpacity="0.85"
            stroke="#ffffff"
            strokeOpacity="0.12"
            strokeWidth="1"
          />
          <circle cx="16" cy="17" r="4" fill="#f85900" />
          <text x="28" y="21" fill="#f1f5f9" fontSize="11" fontWeight="600" fontFamily="sans-serif">
            #AI & DeepTech
          </text>
        </g>
      </svg>
    </div>
  );
}

export function SignUpIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`auth-illustration-container ${className}`}>
      <svg
        viewBox="0 0 520 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
        aria-hidden="true"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="signUpAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.38" />
            <stop offset="60%" stopColor="#f85900" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f85900" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rocketPlume" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#f85900" />
            <stop offset="40%" stopColor="#ff7b29" />
            <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="rocketFin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f85900" />
            <stop offset="100%" stopColor="#d94d00" />
          </linearGradient>
          <linearGradient id="cardStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
          </linearGradient>

          <filter id="rocketGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient atmospheric glow */}
        <circle cx="260" cy="180" r="180" fill="url(#signUpAura)" />

        {/* Perspective Landscape Ground / Launch Grid */}
        <g opacity="0.32" stroke="#ffffff" strokeWidth="1">
          {/* Radial perspective rays */}
          <line x1="260" y1="280" x2="60" y2="400" />
          <line x1="260" y1="280" x2="140" y2="400" />
          <line x1="260" y1="280" x2="220" y2="400" />
          <line x1="260" y1="280" x2="300" y2="400" />
          <line x1="260" y1="280" x2="380" y2="400" />
          <line x1="260" y1="280" x2="460" y2="400" />

          {/* Concentric ground contours */}
          <ellipse cx="260" cy="340" rx="180" ry="40" stroke="#f85900" strokeOpacity="0.3" strokeDasharray="4 4" />
          <ellipse cx="260" cy="310" rx="120" ry="26" stroke="#f85900" strokeOpacity="0.5" />
          <ellipse cx="260" cy="285" rx="60" ry="14" stroke="#ffffff" strokeOpacity="0.6" />
        </g>

        {/* Constellation Star field / Coordinates */}
        <g opacity="0.7">
          <circle cx="80" cy="110" r="2" fill="#ffffff" />
          <circle cx="130" cy="70" r="1.5" fill="#f85900" />
          <circle cx="180" cy="130" r="2.5" fill="#ffffff" />
          <circle cx="390" cy="90" r="2" fill="#ffffff" />
          <circle cx="440" cy="140" r="2.5" fill="#f85900" />
          <circle cx="470" cy="80" r="1.5" fill="#ffffff" />
          <line x1="80" y1="110" x2="130" y2="70" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.75" />
          <line x1="390" y1="90" x2="440" y2="140" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.75" />
        </g>

        {/* Launch Trail / Thruster Plume */}
        <path
          d="M252 230 C246 270 236 320 232 370 C248 375 272 375 288 370 C284 320 274 270 268 230 Z"
          fill="url(#rocketPlume)"
          filter="url(#rocketGlow)"
        />

        {/* Upward Ascending Modern Rocket */}
        <g transform="translate(260, 160)">
          {/* Left Fin */}
          <path
            d="M-10 28 L-28 52 C-28 52 -18 56 -10 46 Z"
            fill="url(#rocketFin)"
          />
          {/* Right Fin */}
          <path
            d="M10 28 L28 52 C28 52 18 56 10 46 Z"
            fill="url(#rocketFin)"
          />

          {/* Rocket Fuselage */}
          <path
            d="M0 -55 C-18 -20 -18 20 -12 48 L12 48 C18 20 18 -20 0 -55 Z"
            fill="url(#rocketBody)"
          />

          {/* Rocket Nose Tip */}
          <path
            d="M0 -55 C-8 -38 -12 -24 0 -24 C12 -24 8 -38 0 -55 Z"
            fill="#f85900"
          />

          {/* Port-hole window with ecosystem gleam */}
          <circle cx="0" cy="-6" r="10" fill="#0f172a" />
          <circle cx="0" cy="-6" r="8" fill="#1e293b" />
          <circle cx="0" cy="-6" r="5" fill="#f85900" />
          <circle cx="-2" cy="-8" r="2" fill="#ffffff" />

          {/* Thruster nozzle */}
          <rect x="-8" y="48" width="16" height="6" rx="2" fill="#64748b" />
        </g>

        {/* Newly Planted Flag / Ecosystem Pin (Left side) */}
        <g transform="translate(100, 240)">
          <ellipse cx="20" cy="50" rx="18" ry="6" fill="#f85900" fillOpacity="0.3" />
          <line x1="20" y1="50" x2="20" y2="15" stroke="#f85900" strokeWidth="2.5" />
          <path
            d="M20 15 L48 24 L20 33 Z"
            fill="#f85900"
          />
          <circle cx="20" cy="15" r="3" fill="#ffffff" />
        </g>

        {/* Floating Card 1: Venture Launch (Top Right) */}
        <g transform="translate(300, 60)">
          <rect
            x="0"
            y="0"
            width="180"
            height="58"
            rx="14"
            fill="#131b26"
            fillOpacity="0.9"
            stroke="url(#cardStroke)"
            strokeWidth="1"
          />
          <rect x="12" y="12" width="34" height="34" rx="10" fill="#f85900" fillOpacity="0.2" />
          <text x="23" y="34" fill="#f85900" fontSize="16" fontWeight="700">🚀</text>
          <text x="54" y="27" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            Launch Profile
          </text>
          <text x="54" y="42" fill="#94a3b8" fontSize="10" fontWeight="500" fontFamily="sans-serif">
            Put your venture on map
          </text>
        </g>

        {/* Floating Card 2: Co-Founders & Network (Bottom Left) */}
        <g transform="translate(50, 310)">
          <rect
            x="0"
            y="0"
            width="190"
            height="62"
            rx="14"
            fill="#131b26"
            fillOpacity="0.9"
            stroke="url(#cardStroke)"
            strokeWidth="1"
          />
          {/* Avatars cluster */}
          <circle cx="25" cy="31" r="13" fill="#3b82f6" />
          <text x="19" y="36" fill="#ffffff" fontSize="11" fontWeight="700">F</text>
          <circle cx="40" cy="31" r="13" fill="#f85900" stroke="#131b26" strokeWidth="2" />
          <text x="34" y="36" fill="#ffffff" fontSize="11" fontWeight="700">B</text>

          <text x="64" y="27" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="sans-serif">
            Find Co-Founders
          </text>
          <text x="64" y="43" fill="#94a3b8" fontSize="10" fontWeight="500" fontFamily="sans-serif">
            Connect with 5K+ builders
          </text>
        </g>
      </svg>
    </div>
  );
}

{/* Compact Header Badges for Mobile, Tablet, and In-Card Headers */}
export function SignInHeaderIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`auth-mini-illustration flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-20 h-16"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="miniRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f85900" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="50" cy="40" r="32" fill="url(#miniRadarGlow)" />

        {/* Radar Rings */}
        <circle cx="50" cy="40" r="28" stroke="#f85900" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="50" cy="40" r="19" stroke="#f85900" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="50" cy="40" r="10" stroke="#f85900" strokeOpacity="0.65" strokeWidth="1" />

        {/* Connected nodes */}
        <line x1="28" y1="34" x2="50" y2="40" stroke="#f85900" strokeOpacity="0.5" strokeWidth="1.2" />
        <line x1="50" y1="40" x2="72" y2="30" stroke="#f85900" strokeOpacity="0.5" strokeWidth="1.2" />
        <line x1="50" y1="40" x2="65" y2="58" stroke="#f85900" strokeOpacity="0.5" strokeWidth="1.2" />

        <circle cx="28" cy="34" r="3" fill="#f85900" />
        <circle cx="72" cy="30" r="3.5" fill="#f85900" />
        <circle cx="65" cy="58" r="3" fill="#10b981" />

        {/* Central beacon pin */}
        <path
          d="M50 20 C45 20 41 24 41 29 C41 36 50 42 50 42 C50 42 59 36 59 29 C59 24 55 20 50 20 Z"
          fill="#f85900"
        />
        <circle cx="50" cy="28" r="3" fill="#ffffff" />
      </svg>
    </div>
  );
}

export function SignUpHeaderIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`auth-mini-illustration flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-20 h-16"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="miniLaunchGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f85900" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f85900" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="miniPlume" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f85900" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="50" cy="38" r="32" fill="url(#miniLaunchGlow)" />

        {/* Launch Plume */}
        <path
          d="M47 44 C45 54 42 64 40 72 C47 74 53 74 60 72 C58 64 55 54 53 44 Z"
          fill="url(#miniPlume)"
        />

        {/* Rocket Body */}
        <g transform="translate(50, 32)">
          {/* Fins */}
          <path d="M-5 12 L-14 24 L-5 21 Z" fill="#d94d00" />
          <path d="M5 12 L14 24 L5 21 Z" fill="#d94d00" />
          {/* Fuselage */}
          <path d="M0 -24 C-9 -8 -9 10 -6 22 L6 22 C9 10 9 -8 0 -24 Z" fill="#ffffff" />
          {/* Nosecone */}
          <path d="M0 -24 C-4 -16 -6 -10 0 -10 C6 -10 4 -16 0 -24 Z" fill="#f85900" />
          {/* Window */}
          <circle cx="0" cy="-2" r="4" fill="#0f172a" />
          <circle cx="0" cy="-2" r="2.5" fill="#f85900" />
        </g>

        {/* Constellation sparkle */}
        <circle cx="24" cy="22" r="1.5" fill="#ffffff" />
        <circle cx="78" cy="26" r="2" fill="#ffffff" />
        <circle cx="72" cy="14" r="1.5" fill="#f85900" />
      </svg>
    </div>
  );
}
