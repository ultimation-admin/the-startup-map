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
        className={`mt-0.5 h-4 w-4 rounded border-[#E3E3E3] text-[#000000] focus:ring-[#000000] cursor-pointer transition-colors ${
          error ? "border-[#757575] ring-2 ring-[#A3A3A3]" : ""
        }`}
      />
      <label htmlFor="terms-agreement-checkbox" className="leading-snug cursor-pointer select-none">
        I have read and agree to the{" "}
        <Link
          href="/terms-of-service"
          className="font-semibold text-[#f85900] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy-policy"
          className="font-semibold text-[#f85900] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </Link>
        . <span className="text-[#757575] font-semibold">*</span>
      </label>
    </div>
  );
}
