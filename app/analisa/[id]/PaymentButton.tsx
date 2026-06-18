"use client";

import { useState } from "react";

export default function PaymentButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pembayaran");
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <p style={{ fontSize: "0.8rem", color: "#fca5a5", marginBottom: 10, textAlign: "center" }}>
          {error}
        </p>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px 24px",
          backgroundColor: loading ? "rgba(245,240,232,0.25)" : "#F5F0E8",
          color: "#1E3832",
          border: "none",
          borderRadius: 6,
          fontWeight: 700,
          fontSize: "0.9rem",
          letterSpacing: "0.01em",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.opacity = "0.85"; }}
        onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.opacity = "1"; }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg style={{ animation: "spin 1s linear infinite", height: 17, width: 17 }} viewBox="0 0 24 24" fill="none">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Memproses...
          </span>
        ) : (
          "Buka Analisa Penuh — Rp 10.000"
        )}
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
