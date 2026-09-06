import React from "react";

export function CommunityFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "transparent",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div className="skeleton-pulse" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
              <div className="skeleton-pulse" style={{ width: "120px", height: "14px" }} />
              <div className="skeleton-pulse" style={{ width: "80px", height: "10px" }} />
            </div>
            <div className="skeleton-pulse" style={{ width: "70px", height: "20px", borderRadius: "9999px" }} />
          </div>

          {/* Post Content Lines */}
          <div className="skeleton-pulse" style={{ width: "100%", height: "14px", marginBottom: "8px" }} />
          <div className="skeleton-pulse" style={{ width: "75%", height: "14px", marginBottom: "16px" }} />

          {/* Action Row */}
          <div style={{ display: "flex", gap: "16px" }}>
            <div className="skeleton-pulse" style={{ width: "50px", height: "24px", borderRadius: "6px" }} />
            <div className="skeleton-pulse" style={{ width: "50px", height: "24px", borderRadius: "6px" }} />
            <div className="skeleton-pulse" style={{ width: "50px", height: "24px", borderRadius: "6px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileStudioSkeleton() {
  return (
    <div style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div className="skeleton-pulse" style={{ width: "80px", height: "32px", borderRadius: "8px" }} />
        <div className="skeleton-pulse" style={{ width: "140px", height: "24px", borderRadius: "9999px" }} />
      </div>

      {/* Profile Header Card */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", background: "#f9fafb", borderRadius: "16px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
        <div className="skeleton-pulse" style={{ width: "64px", height: "64px", borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="skeleton-pulse" style={{ width: "90px", height: "18px", borderRadius: "6px" }} />
          <div className="skeleton-pulse" style={{ width: "160px", height: "22px" }} />
          <div className="skeleton-pulse" style={{ width: "130px", height: "14px" }} />
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <div className="skeleton-pulse" style={{ width: "100px", height: "36px", borderRadius: "8px" }} />
        <div className="skeleton-pulse" style={{ width: "100px", height: "36px", borderRadius: "8px" }} />
        <div className="skeleton-pulse" style={{ width: "100px", height: "36px", borderRadius: "8px" }} />
      </div>

      {/* Content Stack */}
      <CommunityFeedSkeleton count={2} />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
            <div className="skeleton-pulse" style={{ width: "38px", height: "38px", borderRadius: "8px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="skeleton-pulse" style={{ width: "140px", height: "14px" }} />
              <div className="skeleton-pulse" style={{ width: "90px", height: "10px" }} />
            </div>
            <div className="skeleton-pulse" style={{ width: "80px", height: "24px", borderRadius: "9999px" }} />
            <div className="skeleton-pulse" style={{ width: "100px", height: "28px", borderRadius: "6px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapListingCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div className="skeleton-pulse" style={{ width: "42px", height: "42px", borderRadius: "10px" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="skeleton-pulse" style={{ width: "120px", height: "16px" }} />
              <div className="skeleton-pulse" style={{ width: "80px", height: "12px" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
