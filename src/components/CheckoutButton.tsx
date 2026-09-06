"use client";
import React, { useState } from "react";

interface CheckoutButtonProps {
  listingId: string;
  onSuccess: () => void;
  className?: string;
  children: React.ReactNode;
}

export function CheckoutButton({ listingId, onSuccess, className, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    setLoading(true);

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    // Simulate mock checkout process (fallback mode)
    if (!razorpayKey) {
      setTimeout(() => {
        // Display simulated payment alert
        const confirmed = window.confirm(
          "[TEST MODE: No Razorpay Key set in environment]\n\n" +
          "Do you want to simulate a successful payment transaction of ₹999 for sponsoring this listing?"
        );
        setLoading(false);
        if (confirmed) {
          onSuccess();
          alert("Sponsorship successful! Your listing has been promoted on the live map.");
        }
      }, 800);
      return;
    }

    // Dynamic Razorpay SDK loading
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const options = {
        key: razorpayKey,
        amount: 99900, // ₹999.00 in paise
        currency: "INR",
        name: "The Startup Map",
        description: "Promoted Listing Sponsorship",
        image: "https://thestartupmap.in/logo.png",
        handler: function (response: any) {
          setLoading(false);
          if (response.razorpay_payment_id) {
            onSuccess();
            alert(`Sponsorship successful! Txn ID: ${response.razorpay_payment_id}`);
          }
        },
        prefill: {
          email: "billing@company.com",
        },
        theme: {
          color: "#1d3328",
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    script.onerror = () => {
      setLoading(false);
      alert("Failed to load Razorpay SDK. Try disabling ad-blockers or try again later.");
    };
    document.body.appendChild(script);
  };

  return (
    <button
      className={className}
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? "Initializing..." : children}
    </button>
  );
}
