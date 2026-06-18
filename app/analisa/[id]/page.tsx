import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import AnalysisContent from "./AnalysisContent";

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

  const content = analysis.full_content || analysis.preview_content;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F0E8" }}>

      {/* Header */}
      <header style={{ backgroundColor: "#1E3832", borderBottom: "1px solid rgba(245,240,232,0.08)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ color: "#F5F0E8", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.04em" }}>DonaTalks</span>
          </Link>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.35)" }}>
            Personal Branding &amp; Career Strategy
          </span>
        </div>
      </header>

      {/* Document header */}
      <div style={{ backgroundColor: "#1E3832", paddingBottom: 48, paddingTop: 36 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.3)", marginBottom: 12 }}>
            Analisa Personal Branding &amp; CV
          </p>
          <h1 style={{ color: "#F5F0E8", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 12 }}>
            {content ? "Hasil Analisa" : "Sedang Menganalisa..."}
          </h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(245,240,232,0.35)" }}>
            Disiapkan oleh DonaTalks
            {" · "}
            {new Date(analysis.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 60px" }}>
        {!content ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <svg style={{ animation: "spin 1s linear infinite", height: 36, width: 36, margin: "0 auto 20px", display: "block", color: "#1E3832" }} viewBox="0 0 24 24" fill="none">
              <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1E3832", marginBottom: 8 }}>
              Sedang menganalisa CV kamu...
            </p>
            <p style={{ fontSize: "0.82rem", color: "rgba(30,56,50,0.45)" }}>
              Biasanya butuh 30–60 detik. Refresh halaman ini setelah 1 menit.
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(30,56,50,0.1)", borderRadius: 8, padding: "40px 44px" }}>
            <AnalysisContent content={content} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: "#1E3832", borderTop: "1px solid rgba(245,240,232,0.06)", padding: "24px", textAlign: "center" }}>
        <span style={{ color: "#F5F0E8", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.04em" }}>DonaTalks</span>
        <p style={{ color: "rgba(245,240,232,0.25)", fontSize: "0.68rem", marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Personal Branding &amp; Career Strategy
        </p>
        <Link href="/" style={{ display: "block", fontSize: "0.75rem", color: "rgba(245,240,232,0.3)", marginTop: 10, textDecoration: "none" }}>
          Analisa CV lain
        </Link>
      </footer>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
