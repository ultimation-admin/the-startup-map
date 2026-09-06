"use client";

import React, { useState, useEffect, useRef } from "react";
import { IndiaFlagIcon } from "./Icons";

export const CITIES = [
  "All Cities",
  "Bengaluru",
  "Delhi NCR",
  "Mumbai",
  "Hyderabad",
  "Pune",
  "Chennai",
];

export const CITY_COORDS: Record<string, [number, number]> = {
  Bengaluru: [77.59, 12.97],
  "Delhi NCR": [77.21, 28.61],
  Delhi: [77.21, 28.61],
  Mumbai: [72.88, 19.08],
  Hyderabad: [78.48, 17.38],
  Pune: [73.86, 18.52],
  Chennai: [80.27, 13.08],
};

export const CITY_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  Bengaluru: [
    [77.46, 12.83],
    [77.74, 13.14],
  ],
  "Delhi NCR": [
    [76.84, 28.40],
    [77.34, 28.88],
  ],
  Delhi: [
    [76.84, 28.40],
    [77.34, 28.88],
  ],
  Mumbai: [
    [72.77, 18.88],
    [72.99, 19.28],
  ],
  Hyderabad: [
    [78.32, 17.28],
    [78.60, 17.54],
  ],
  Pune: [
    [73.74, 18.42],
    [73.98, 18.63],
  ],
  Chennai: [
    [80.12, 12.92],
    [80.32, 13.20],
  ],
};

interface CityDropdownProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

export function CityDropdownSelector({
  selectedCity,
  onSelectCity,
}: CityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const isFiltered = selectedCity !== "All Cities";

  return (
    <div className="custom-dropdown-container" ref={containerRef}>
      <button
        type="button"
        className={`city-pill-btn ${isFiltered ? "active" : ""} ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select City Filter"
        title="Select City"
      >
        <IndiaFlagIcon />
        <span className="city-pill-label">{selectedCity}</span>
        <span className="chevron-trigger-span">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`chevron-icon ${isOpen ? "rotate" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu-popover city-popover"
          role="listbox"
          aria-label="City Options"
        >
          <div className="menu-header-bar">
            <span className="menu-header">SELECT CITY</span>
            {isFiltered && (
              <button
                type="button"
                className="menu-reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCity("All Cities");
                  setIsOpen(false);
                }}
              >
                Reset
              </button>
            )}
          </div>
          <div className="menu-items-list">
            {CITIES.map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`menu-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    onSelectCity(city);
                    setIsOpen(false);
                  }}
                >
                  <span>{city}</span>
                  {isSelected && (
                    <span className="check-mark-icon-wrap">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
