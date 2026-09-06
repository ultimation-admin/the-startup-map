"use client";

import React, { useState, useEffect, useRef } from "react";

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onSelect,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  const defaultOption = options[0];
  const isFiltered = selected !== defaultOption;

  return (
    <div className="custom-dropdown-container" ref={ref}>
      <button
        type="button"
        className={`filter-dropdown-btn ${isFiltered ? "active" : ""} ${
          isOpen ? "open" : ""
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Filter by ${label}`}
      >
        {isFiltered && <span className="active-filter-indicator-dot" />}
        <span className="filter-pill-text">
          {isFiltered ? `${label}: ${selected}` : label}
        </span>
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
          className="dropdown-menu-popover filter-popover"
          role="listbox"
          aria-label={`${label} options`}
        >
          <div className="menu-header-bar">
            <span className="menu-header">{label.toUpperCase()}</span>
            {isFiltered && (
              <button
                type="button"
                className="menu-reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(defaultOption);
                  setIsOpen(false);
                }}
              >
                Reset
              </button>
            )}
          </div>
          <div className="menu-items-list">
            {options.map((option) => {
              const isSelected = selected === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`menu-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                >
                  <span>{option}</span>
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

export const TYPE_OPTIONS = ["All Types", "Startups", "People", "VCs"];

/* Startups Filters */
export const STARTUP_STAGE_OPTIONS = [
  "All Stages",
  "Seed",
  "Bootstrapped",
  "Series A",
  "Series B",
  "Series C",
  "Public",
];

export const STARTUP_SECTOR_OPTIONS = [
  "All Sectors",
  "AI",
  "SaaS",
  "D2C",
  "E-commerce",
  "FinTech",
  "EdTech",
  "HealthTech",
  "EV/Mobility",
  "Gaming",
  "Logistics",
  "Entertainment",
  "Manufacturing",
  "Others",
];

/* People Filters */
export const PEOPLE_ROLE_OPTIONS = [
  "All Roles",
  "Founder",
  "Co-Founder",
  "Engineer",
  "Product",
  "Design",
  "Growth",
  "Operator",
  "Angel Investor",
];

export const PEOPLE_SECTOR_OPTIONS = [
  "All Sectors",
  "AI",
  "SaaS",
  "D2C",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Web3",
  "Others",
];

/* VCs Filters */
export const VC_STAGE_OPTIONS = [
  "All Investment Stages",
  "Pre-Seed",
  "Seed",
  "Series A / B",
  "Growth / Late Stage",
  "All Stages",
];

export const VC_TYPE_OPTIONS = [
  "All Fund Types",
  "Micro VC",
  "Venture Capital",
  "Angel Network",
  "Corporate VC",
  "Family Office",
  "Accelerator",
];
