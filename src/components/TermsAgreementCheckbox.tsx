"use client";

import React from "react";
import Link from "next/link";

interface TermsAgreementCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  error?: boolean;
}

export function TermsAgreementCheckbox({
  checked,
  onChange,
  className = "",
  error = false,
}: TermsAgreementCheckboxProps) {
  return (
    <div className={`flex items-start gap-2.5 my-3 text-xs text-[#334155] ${className}`}>
      <input
        type="checkbox"
        id="terms-agreement-checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-[#f85900] focus:ring-[#f85900] cursor-pointer transition-all ${
          error ? "border-red-500 ring-2 ring-red-200" : ""
        }`}
      />
      <label htmlFor="terms-agreement-checkbox" className="leading-snug cursor-pointer select-none">
        I have read and agree to the{" "}
        <Link
          href="/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#f85900] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#f85900] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </Link>
        . <span className="text-red-500 font-bold">*</span>
      </label>
    </div>
  );
}
