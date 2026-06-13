import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import AnalysisContent from "./AnalysisContent";
import PaymentButton from "./PaymentButton";

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
    "Temuan & Rekomendasi (Area A-E)",
    "Contoh Perbaikan Konkret & Rewrite CV",
    "Rencana Eksekusi 3 Bulan (Anti-Burnout)",
    "Skor Akhir Personal Branding",
    "30 Ide Konten Siap Pakai",
    "Pertanyaan Wawancara & Panduan Jawab",
    "Kalimat Positioning Personal Brand-mu",
    "Template & Script LinkedIn Siap Kirim",
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8F6F1" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#1E3832" }} className="py-5 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div>
              <span className="font-display text-xl font-bold" style={{ color: "#C4A35A" }}>
                DonaTalks
              </span>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#5a7a74" }}>
                Personal Branding &amp; Career Strategy
              </p>
            </div>
          </Link>
          {!isPaid && (
            <div
              className="text-sm font-medium px-4 py-2 rounded-full"
              style={{ backgroundColor: "#C4A35A20", color: "#C4A35A", border: "1px solid #C4A35A40" }}
            >
              Preview Gratis
            </div>
          )}
          {isPaid && (
            <div
              className="text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2"
              style={{ backgroundColor: "#16a34a20", color: "#16a34a", border: "1px solid #16a34a40" }}
            >
              <span>✓</span> Analisa Penuh
            </div>
          )}
        </div>
      </header>

      {/* Document header */}
      <div style={{ backgroundColor: "#1E3832" }} className="pb-12 pt-8 px-6">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ color: "#8a9e99" }}
          >
            Analisa Personal Branding &amp; CV
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2" style={{ color: "#F5F0E8" }}>
            {hasContent ? "Hasil Analisa" : "Sedang Menganalisa..."}
          </h1>
          <p className="text-sm mt-3" style={{ color: "#8a9e99" }}>
            Disiapkan oleh DonaTalks · {new Date(analysis.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {!hasContent ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: "#C4A35A", borderTopColor: "transparent" }}
            />
            <p className="text-lg font-medium" style={{ color: "#1E3832" }}>
              Sedang menganalisa CV kamu...
            </p>
            <p className="text-sm mt-2" style={{ color: "#8a9e99" }}>
              Biasanya butuh 30-60 detik. Refresh halaman ini setelah 1 menit.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* PREVIEW CONTENT */}
            <div
              className="rounded-2xl p-8 md:p-10 mb-8"
              style={{ backgroundColor: "#fff", border: "1px solid #e8e0d0" }}
            >
              <AnalysisContent content={analysis.preview_content || ""} />
            </div>

            {/* PAYWALL or FULL CONTENT */}
            {!isPaid ? (
              <div className="relative">
                {/* Blurred preview of locked sections */}
                <div
                  className="rounded-2xl p-8 mb-6 overflow-hidden"
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8e0d0",
                    filter: "blur(4px)",
                    pointerEvents: "none",
                    userSelect: "none",
                    maxHeight: "200px",
                  }}
                >
                  <h1 className="font-display text-2xl font-bold" style={{ color: "#1E3832" }}>
                    Yang Sudah Kuat (Jangan Diutak-atik)
                  </h1>
                  <p style={{ color: "#2d4a44" }}>
                    Sebelum kita bongkar, saya mau kamu sadar betul fondasi mana yang sudah benar — karena saran perbaikan apa
                    pun harus dibangun di atas ini, bukan menghapusnya. Pertama, kredibilitas akademik yang jarang...
                  </p>
                </div>

                {/* Paywall card */}
                <div
                  className="rounded-2xl p-8 md:p-10"
                  style={{ backgroundColor: "#1E3832", border: "1px solid #2c4f45" }}
                >
                  <div className="text-center mb-8">
                    <div
                      className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-4"
                      style={{ backgroundColor: "#C4A35A20", color: "#C4A35A", border: "1px solid #C4A35A40" }}
                    >
                      Konten Terkunci
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-3" style={{ color: "#F5F0E8" }}>
                      Buka Analisa Penuh
                    </h2>
                    <p style={{ color: "#8a9e99" }} className="max-w-md mx-auto">
                      Kamu sudah baca summary-nya. Sekarang saatnya tahu persis apa yang harus kamu ubah — dan bagaimana caranya.
                    </p>
                  </div>

                  {/* What's included */}
                  <div className="grid md:grid-cols-2 gap-3 mb-8">
                    {lockedSections.map((section, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 py-3 px-4 rounded-xl"
                        style={{ backgroundColor: "#ffffff0d" }}
                      >
                        <span style={{ color: "#C4A35A", marginTop: 1 }}>✓</span>
                        <span className="text-sm" style={{ color: "#d4c9b0" }}>
                          {section}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Price & CTA */}
                  <div
                    className="rounded-xl p-6"
                    style={{ backgroundColor: "#ffffff0d" }}
                  >
                    <div className="text-center mb-5">
                      <div className="font-display text-4xl font-bold" style={{ color: "#C4A35A" }}>
                        Rp 99.000
                      </div>
                      <p className="text-sm mt-1" style={{ color: "#8a9e99" }}>
                        Bayar sekali · Akses selamanya
                      </p>
                    </div>
                    <PaymentButton analysisId={id} />
                    <p className="text-xs text-center mt-4" style={{ color: "#5a7a74" }}>
                      Pembayaran aman. Analisa langsung terbuka setelah pembayaran berhasil.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* FULL CONTENT */
              <div
                className="rounded-2xl p-8 md:p-10"
                style={{ backgroundColor: "#fff", border: "1px solid #e8e0d0" }}
              >
                <AnalysisContent
                  content={
                    analysis.full_content?.replace(
                      // Remove sections already shown in preview
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
      <footer className="py-8 text-center mt-8" style={{ backgroundColor: "#152b26" }}>
        <p className="font-display font-bold" style={{ color: "#C4A35A" }}>
          DonaTalks
        </p>
        <p className="text-xs mt-1" style={{ color: "#5a7a74" }}>
          Personal Branding &amp; Career Strategy
        </p>
        <Link href="/" className="text-xs mt-3 block hover:underline" style={{ color: "#8a9e99" }}>
          ← Analisa CV lain
        </Link>
      </footer>
    </div>
  );
}
