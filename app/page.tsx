"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

function getSessionId(): string {
  if (typeof window === "undefined") return uuidv4();
  let id = sessionStorage.getItem("dt_session_id");
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem("dt_session_id", id);
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !cvText.trim()) {
      setError("Nama dan isi CV wajib diisi.");
      return;
    }
    if (cvText.trim().length < 100) {
      setError("CV terlalu pendek. Paste isi CV lengkap kamu ya.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session_id = getSessionId();
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cv_text: cvText, linkedin_url: linkedinUrl || null, session_id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal generate analisa. Coba lagi.");
      }
      const { id } = await res.json();
      router.push(`/analisa/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  }

  const features = [
    {
      icon: "📋",
      title: "Audit CV Menyeluruh",
      desc: "Setiap baris CV-mu dibedah pakai 'Rumus CV': kata kerja aksi + objek + hasil terukur + metode.",
    },
    {
      icon: "🎯",
      title: "Strategi Positioning",
      desc: "Niche, persona konten, dan content pillar yang disesuaikan dengan pengalamanmu.",
    },
    {
      icon: "✍️",
      title: "Rewrite Siap Pakai",
      desc: "Setiap baris CV ditulis ulang versi 'dampak' — tinggal copy-paste ke CV-mu.",
    },
    {
      icon: "💡",
      title: "30 Ide Konten LinkedIn",
      desc: "Digali langsung dari pengalamanmu. Nggak perlu ngarang — bahan sudah ada.",
    },
    {
      icon: "🏆",
      title: "Skor Personal Branding",
      desc: "Tahu persis di area mana kamu sudah kuat dan mana yang perlu dibenahi.",
    },
    {
      icon: "📅",
      title: "Rencana Eksekusi 3 Bulan",
      desc: "Anti-burnout. Sistem yang bisa jalan sambil kuliah atau kerja.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section style={{ backgroundColor: "#1E3832" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 80%, #C4A35A 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C4A35A 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-24">
          {/* Brand */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="font-display text-3xl font-bold tracking-wide" style={{ color: "#C4A35A" }}>
                DonaTalks
              </span>
              <p className="text-xs tracking-[0.3em] uppercase mt-1" style={{ color: "#8a9e99" }}>
                Personal Branding &amp; Career Strategy
              </p>
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: "#F5F0E8" }}>
              Dari CV yang{" "}
              <span style={{ color: "#C4A35A" }}>Padat Prestasi</span>
              <br />
              Menjadi Personal Brand
              <br />
              yang <span style={{ color: "#C4A35A" }}>Kepake.</span>
            </h1>

            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#8a9e99" }}>
              Audit mendalam CV &amp; personal branding-mu oleh AI — dengan gaya konsultan nyata,
              bukan saran generik. Preview gratis,{" "}
              <span style={{ color: "#C4A35A" }}>analisa penuh Rp 99.000.</span>
            </p>
          </div>

          {/* FORM */}
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: "#F8F6F1" }}>
              <h2 className="font-display text-2xl font-bold mb-6" style={{ color: "#1E3832" }}>
                Analisa CV Saya
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#1E3832" }}>
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Maritsa Aurelia Nismara"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      borderColor: "#d4c9b0",
                      backgroundColor: "#fff",
                      color: "#1E3832",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C4A35A")}
                    onBlur={(e) => (e.target.style.borderColor = "#d4c9b0")}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#1E3832" }}>
                    LinkedIn URL{" "}
                    <span className="font-normal" style={{ color: "#8a9e99" }}>
                      (opsional)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      borderColor: "#d4c9b0",
                      backgroundColor: "#fff",
                      color: "#1E3832",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C4A35A")}
                    onBlur={(e) => (e.target.style.borderColor = "#d4c9b0")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#1E3832" }}>
                    Isi CV *
                  </label>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Paste isi CV kamu di sini — mulai dari summary, pengalaman, pendidikan, hingga prestasi. Semakin lengkap, semakin tajam analisanya."
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all resize-y"
                    style={{
                      borderColor: "#d4c9b0",
                      backgroundColor: "#fff",
                      color: "#1E3832",
                      lineHeight: "1.7",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C4A35A")}
                    onBlur={(e) => (e.target.style.borderColor = "#d4c9b0")}
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: "#8a9e99" }}>
                    {cvText.length > 0 && `${cvText.length} karakter`}
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-70"
                  style={{
                    backgroundColor: loading ? "#8a9e99" : "#C4A35A",
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
                    <span className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sedang menganalisa CV kamu... (~30 detik)
                    </span>
                  ) : (
                    "Analisa CV Saya →"
                  )}
                </button>

                <p className="text-xs text-center" style={{ color: "#8a9e99" }}>
                  Preview gratis. Analisa penuh Rp 99.000 — bayar hanya kalau mau buka semua.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-4" style={{ color: "#1E3832" }}>
            Apa yang Kamu Dapat?
          </h2>
          <p className="text-lg" style={{ color: "#5a7a74" }}>
            Bukan coretan merah — tapi cetak biru yang bisa langsung dikerjakan.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border transition-all hover:-translate-y-1"
              style={{
                backgroundColor: "#fff",
                borderColor: "#e8e0d0",
              }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold mb-2" style={{ color: "#1E3832" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#5a7a74" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ backgroundColor: "#1E3832" }} className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4" style={{ color: "#F5F0E8" }}>
              Cara Kerjanya
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Paste CV-mu", desc: "Salin isi CV-mu ke form di atas. Semakin lengkap, semakin tajam analisanya." },
              { step: "02", title: "Terima Preview Gratis", desc: "Dalam ~30 detik, baca Ringkasan Eksekutif & Konteks Klien. Gratis, tanpa perlu daftar." },
              { step: "03", title: "Buka Analisa Penuh", desc: "Bayar Rp 99.000 sekali untuk akses semua: audit CV, rewrite siap pakai, 30 ide konten, rencana eksekusi." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className="font-display text-5xl font-bold mb-4"
                  style={{ color: "#C4A35A", opacity: 0.4 }}
                >
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "#F5F0E8" }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8a9e99" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center" style={{ backgroundColor: "#152b26" }}>
        <p className="font-display text-lg font-bold" style={{ color: "#C4A35A" }}>
          DonaTalks
        </p>
        <p className="text-xs mt-1" style={{ color: "#5a7a74" }}>
          Personal Branding &amp; Career Strategy
        </p>
      </footer>
    </div>
  );
}
