"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("payment_id");
  const analysisId = searchParams.get("analysis_id");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function simulatePayment() {
    if (!paymentId || !analysisId) return;
    setLoading(true);
    try {
      await fetch("/api/payment/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_id: paymentId,
          transaction_id: `mock_${Date.now()}`,
          status: "success",
        }),
      });
      setDone(true);
      setTimeout(() => router.push(`/analisa/${analysisId}`), 1500);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#F8F6F1" }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-10 text-center shadow-lg"
        style={{ backgroundColor: "#fff", border: "1px solid #e8e0d0" }}
      >
        {/* DonaTalks brand */}
        <p className="font-display font-bold text-xl mb-1" style={{ color: "#C4A35A" }}>
          DonaTalks
        </p>
        <p className="text-xs tracking-widest uppercase mb-8" style={{ color: "#8a9e99" }}>
          Payment Gateway (Dev Mode)
        </p>

        {done ? (
          <div>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: "#1E3832" }}>
              Pembayaran Berhasil!
            </h2>
            <p style={{ color: "#5a7a74" }}>Mengalihkan ke analisa kamu...</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-6">💳</div>
            <h2 className="font-display text-2xl font-bold mb-3" style={{ color: "#1E3832" }}>
              Simulasi Pembayaran
            </h2>
            <p className="text-sm mb-2" style={{ color: "#5a7a74" }}>
              Ini halaman mock untuk development. Di production, pengguna akan diarahkan ke halaman pembayaran ScaleV.
            </p>
            <div
              className="rounded-xl p-4 mb-8 text-left text-xs"
              style={{ backgroundColor: "#F8F6F1", color: "#8a9e99" }}
            >
              <p><strong>Payment ID:</strong> {paymentId || "-"}</p>
              <p><strong>Analysis ID:</strong> {analysisId || "-"}</p>
              <p><strong>Jumlah:</strong> Rp 99.000</p>
            </div>

            <button
              onClick={simulatePayment}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base transition-all"
              style={{
                backgroundColor: "#C4A35A",
                color: "#1E3832",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Memproses..." : "✓ Simulasi Bayar Rp 99.000"}
            </button>

            <button
              onClick={() => router.back()}
              className="w-full py-3 mt-3 text-sm"
              style={{ color: "#8a9e99" }}
            >
              ← Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense>
      <PaymentPendingContent />
    </Suspense>
  );
}
