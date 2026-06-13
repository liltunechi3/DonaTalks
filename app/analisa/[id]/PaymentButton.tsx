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
        <p className="text-sm mb-3" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-60"
        style={{
          backgroundColor: "#C4A35A",
          color: "#1E3832",
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#d4b878";
        }}
        onMouseLeave={(e) => {
          if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = "#C4A35A";
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Memproses...
          </span>
        ) : (
          "Buka Analisa Penuh — Rp 10.000 →"
        )}
      </button>
    </div>
  );
}
