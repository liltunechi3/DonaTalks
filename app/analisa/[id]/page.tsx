import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import AnalysisContent from "./AnalysisContent";
import PaymentButton from "./PaymentButton";

const G = "#1E3832";
const C = "#F5F0E8";

type Params = Promise<{ id: string }>;

export default async function AnalysisPage({ params }: { params: Params }) {
  const { id } = await params;

  const { data: analysis, error } = await supabaseServer
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !analysis) {
    notFound();
  }

  const isPaid = analysis.is_paid;
  const hasContent = analysis.preview_content || analysis.full_content;

  const lockedSections = [
    "Yang Sudah Kuat",
    "Temuan & Rekomendasi (5 Level)",
    "Rewrite CV Siap Pakai",
    "Rencana Eksekusi 3 Bulan",
    "Skor Akhir Personal Branding",
    "30 Ide Konten LinkedIn",
    "Kalimat Positioning Personal Brand",
    "Draf About & Headline LinkedIn",
    "Kalender Konten 4 Minggu",
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C }}>

      {/* Header */}
      <header style={{ backgroundColor: G, borderBottom: `1px solid rgba(245,240,232,0.08)` }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ color: C, fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.04em" }}>DonaTalks</span>
          </Link>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isPaid ? `rgba(245,240,232,0.9)` : `rgba(245,240,232,0.35)`,
            border: `1px solid ${isPaid ? `rgba(245,240,232,0.25)` : `rgba(245,240,232,0.12)`}`,
            padding: "4px 10px",
            borderRadius: 3,
          }}>
            {isPaid ? "Akses Penuh" : "Preview Gratis"}
          </span>
        </div>
      </header>

      {/* Document header */}
      <div style={{ backgroundColor: G, paddingBottom: 48, paddingTop: 36 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: `rgba(245,240,232,0.3)`, marginBottom: 12 }}>
            Analisa Personal Branding &amp; CV
          </p>
          <h1 style={{ color: C, fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 12 }}>
            {hasContent ? "Hasil Analisa" : "Sedang Menganalisa..."}
          </h1>
          <p style={{ fontSize: "0.8rem", color: `rgba(245,240,232,0.35)` }}>
            Disiapkan oleh DonaTalks
            {" · "}
            {new Date(analysis.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 60px" }}>
        {!hasContent ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite", height: 36, width: 36, margin: "0 auto 20px", display: "block", color: G }} viewBox="0 0 24 24" fill="none">
              <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: G, marginBottom: 8 }}>
              Sedang menganalisa CV kamu...
            </p>
            <p style={{ fontSize: "0.82rem", color: `rgba(30,56,50,0.45)` }}>
              Biasanya butuh 30–60 detik. Refresh halaman ini setelah 1 menit.
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div>
            {/* PREVIEW CONTENT */}
            <div style={{ backgroundColor: "#fff", border: `1px solid rgba(30,56,50,0.1)`, borderRadius: 8, padding: "40px 44px", marginBottom: 24 }}>
              <AnalysisContent content={analysis.preview_content || ""} />
            </div>

            {/* PAYWALL or FULL CONTENT */}
            {!isPaid ? (
              <div>
                {/* Blurred teaser */}
                <div style={{ position: "relative", overflow: "hidden", borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ backgroundColor: "#fff", border: `1px solid rgba(30,56,50,0.1)`, borderRadius: 8, padding: "40px 44px", filter: "blur(5px)", pointerEvents: "none", userSelect: "none", maxHeight: 180, overflow: "hidden" }}>
                    <h2 style={{ color: G, fontWeight: 700, fontSize: "1.2rem", marginBottom: 12 }}>Yang Sudah Kuat</h2>
                    <p style={{ color: `rgba(30,56,50,0.6)`, fontSize: "0.9rem", lineHeight: 1.7 }}>
                      Sebelum kita bongkar lebih jauh, penting untuk kamu tahu fondasi mana yang sudah benar
                      dan tidak perlu diubah. Ini yang membedakan pendekatan DonaTalks dari saran CV generik...
                    </p>
                  </div>
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 40%, ${C})`, borderRadius: 8 }} />
                </div>

                {/* Paywall */}
                <div style={{ backgroundColor: G, borderRadius: 8, padding: "44px 44px 40px" }}>
                  <div style={{ textAlign: "center", marginBottom: 36 }}>
                    <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: `rgba(245,240,232,0.3)`, marginBottom: 14 }}>
                      Konten terkunci
                    </p>
                    <h2 style={{ color: C, fontSize: "clamp(1.4rem, 3vw, 1.9rem)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 12 }}>
                      Buka Analisa Penuh
                    </h2>
                    <p style={{ color: `rgba(245,240,232,0.5)`, fontSize: "0.875rem", lineHeight: 1.65, maxWidth: 420, margin: "0 auto" }}>
                      Preview sudah kamu baca. Sekarang saatnya tahu persis apa yang harus diubah — dan bagaimana caranya.
                    </p>
                  </div>

                  {/* Included sections */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 1, border: `1px solid rgba(245,240,232,0.08)`, borderRadius: 6, overflow: "hidden", backgroundColor: `rgba(245,240,232,0.06)`, marginBottom: 32 }}>
                    {lockedSections.map((s, i) => (
                      <div key={i} style={{ backgroundColor: `rgba(30,56,50,0.6)`, padding: "14px 16px", fontSize: "0.8rem", color: `rgba(245,240,232,0.65)`, lineHeight: 1.4 }}>
                        {s}
                      </div>
                    ))}
                  </div>

                  {/* Price & CTA */}
                  <div style={{ borderTop: `1px solid rgba(245,240,232,0.1)`, paddingTop: 28 }}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <div style={{ color: C, fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
                        Rp 10.000
                      </div>
                      <p style={{ color: `rgba(245,240,232,0.35)`, fontSize: "0.78rem", marginTop: 6 }}>
                        Bayar sekali — akses selamanya
                      </p>
                    </div>
                    <PaymentButton analysisId={id} />
                    <p style={{ fontSize: "0.72rem", textAlign: "center", color: `rgba(245,240,232,0.25)`, marginTop: 14 }}>
                      Pembayaran aman. Analisa langsung terbuka setelah berhasil.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: "#fff", border: `1px solid rgba(30,56,50,0.1)`, borderRadius: 8, padding: "40px 44px" }}>
                <AnalysisContent
                  content={
                    analysis.full_content?.replace(
                      /^# (RINGKASAN EKSEKUTIF|KONTEKS KLIEN)[\s\S]*?(?=^# |\z)/gm,
                      ""
                    ) || ""
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: G, borderTop: `1px solid rgba(245,240,232,0.06)`, padding: "24px", textAlign: "center" }}>
        <span style={{ color: C, fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.04em" }}>DonaTalks</span>
        <p style={{ color: `rgba(245,240,232,0.25)`, fontSize: "0.68rem", marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Personal Branding &amp; Career Strategy
        </p>
        <Link href="/" style={{ display: "block", fontSize: "0.75rem", color: `rgba(245,240,232,0.3)`, marginTop: 10, textDecoration: "none" }}>
          Analisa CV lain
        </Link>
      </footer>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
