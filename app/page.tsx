"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

const G = "#1E3832";
const C = "#F5F0E8";

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
  const [linkedinHeadline, setLinkedinHeadline] = useState("");
  const [linkedinAbout, setLinkedinAbout] = useState("");
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-cv", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membaca file");
      setCvText(data.text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membaca file. Coba lagi.");
      setFileName("");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !cvText.trim()) {
      setError("Nama dan CV wajib diisi.");
      return;
    }
    if (cvText.trim().length < 100) {
      setError("CV terlalu pendek. Upload file CV atau paste teks lengkap kamu ya.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session_id = getSessionId();
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cv_text: cvText,
          linkedin_headline: linkedinHeadline.trim() || null,
          linkedin_about: linkedinAbout.trim() || null,
          session_id,
        }),
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
      num: "01",
      title: "Audit CV Menyeluruh",
      desc: "Setiap baris CV dibedah menggunakan rumus dampak: kata kerja aksi, objek, hasil terukur, dan metode.",
    },
    {
      num: "02",
      title: "Strategi Positioning",
      desc: "Niche, persona konten, dan content pillar yang disesuaikan langsung dari pengalamanmu.",
    },
    {
      num: "03",
      title: "Rewrite Siap Pakai",
      desc: "Setiap baris CV ditulis ulang versi dampak — tinggal salin ke CV-mu tanpa perlu mengarang ulang.",
    },
    {
      num: "04",
      title: "30 Ide Konten LinkedIn",
      desc: "Digali langsung dari pengalamanmu. Materinya sudah ada — yang kurang hanya cara mengemasnya.",
    },
    {
      num: "05",
      title: "Skor Personal Branding",
      desc: "Tahu persis di area mana kamu sudah kuat dan mana yang perlu dibenahi, dalam angka.",
    },
    {
      num: "06",
      title: "Rencana Eksekusi 3 Bulan",
      desc: "Sistem yang bisa berjalan sambil kuliah atau kerja. Tidak butuh waktu ekstra, hanya konsistensi.",
    },
  ];

  const inputStyle = {
    borderColor: `rgba(30,56,50,0.2)`,
    backgroundColor: "#fff",
    color: G,
    width: "100%",
    padding: "12px 16px",
    borderRadius: "6px",
    border: "1px solid rgba(30,56,50,0.2)",
    fontSize: "0.875rem",
    outline: "none",
    lineHeight: "1.6",
  };

  return (
    <div style={{ backgroundColor: C, color: G, fontFamily: "inherit" }}>

      {/* NAV */}
      <nav style={{ backgroundColor: G, borderBottom: `1px solid rgba(245,240,232,0.08)` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: C, fontWeight: 700, fontSize: "1rem", letterSpacing: "0.04em" }}>
            DonaTalks
          </span>
          <span style={{ color: `rgba(245,240,232,0.45)`, fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Personal Branding &amp; Career Strategy
          </span>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ backgroundColor: G }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 24px 96px" }}>
          <div style={{ maxWidth: 600 }}>
            <p style={{ color: `rgba(245,240,232,0.45)`, fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24 }}>
              Laporan CV &amp; Personal Brand
            </p>
            <h1 style={{ color: C, fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.01em" }}>
              Analisa mendalam.<br />
              Rekomendasi konkret.
            </h1>
            <p style={{ color: `rgba(245,240,232,0.65)`, fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 8, maxWidth: 480 }}>
              CV, LinkedIn, dan positioning personal brand kamu diaudit dengan standar konsultan karier —
              bukan template generik.
            </p>
            <p style={{ color: `rgba(245,240,232,0.35)`, fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 440 }}>
              Gratis sepenuhnya. Laporan lengkap dan detail langsung tersedia.
            </p>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section style={{ backgroundColor: C }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", transform: "translateY(-48px)" }}>
            <div style={{ backgroundColor: "#fff", border: `1px solid rgba(30,56,50,0.12)`, borderRadius: 8, padding: "40px 40px 36px", boxShadow: "0 8px 40px rgba(30,56,50,0.08)" }}>

              <h2 style={{ color: G, fontSize: "1.35rem", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.01em" }}>
                Analisa CV Saya
              </h2>
              <p style={{ color: `rgba(30,56,50,0.45)`, fontSize: "0.8rem", marginBottom: 28 }}>
                Isi form di bawah — hasilnya siap dalam beberapa detik.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: G, marginBottom: 6, letterSpacing: "0.01em" }}>
                    Nama Lengkap <span style={{ color: `rgba(30,56,50,0.35)` }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Arifah Dona"
                    style={inputStyle}
                    onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = G)}
                    onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "rgba(30,56,50,0.2)")}
                    required
                  />
                </div>

                {/* CV File Upload */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: G, marginBottom: 6 }}>
                    Upload CV <span style={{ fontWeight: 400, color: `rgba(30,56,50,0.4)` }}>— PDF atau DOCX *</span>
                  </label>

                  <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ display: "none" }} />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsing}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 6,
                      border: `1.5px dashed ${fileName ? G : "rgba(30,56,50,0.25)"}`,
                      backgroundColor: fileName ? `rgba(30,56,50,0.04)` : "#fafaf9",
                      color: fileName ? G : `rgba(30,56,50,0.45)`,
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: parsing ? "wait" : "pointer",
                      textAlign: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {parsing ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <svg style={{ animation: "spin 1s linear infinite", height: 16, width: 16 }} viewBox="0 0 24 24" fill="none">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Membaca file...
                      </span>
                    ) : fileName ? (
                      <span>{fileName} <span style={{ color: `rgba(30,56,50,0.35)`, fontSize: "0.75rem" }}>(ganti file)</span></span>
                    ) : (
                      "Pilih file CV — PDF atau DOCX"
                    )}
                  </button>

                  {cvText && !parsing && (
                    <p style={{ fontSize: "0.75rem", color: `rgba(30,56,50,0.45)`, marginTop: 6 }}>
                      {cvText.length.toLocaleString()} karakter berhasil dibaca
                    </p>
                  )}
                </div>

                {/* CV text fallback */}
                {!fileName && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: `rgba(30,56,50,0.45)`, marginBottom: 6 }}>
                      Atau paste teks CV langsung
                    </label>
                    <textarea
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      placeholder="Paste isi CV kamu di sini — summary, pengalaman, pendidikan, prestasi..."
                      rows={5}
                      style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = G)}
                      onBlur={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = "rgba(30,56,50,0.2)")}
                    />
                  </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: `1px solid rgba(30,56,50,0.08)`, paddingTop: 4 }}>
                  <p style={{ fontSize: "0.75rem", color: `rgba(30,56,50,0.35)`, marginBottom: 16, letterSpacing: "0.01em" }}>
                    LinkedIn (opsional — untuk audit yang lebih mendalam)
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: G, marginBottom: 6 }}>
                        Headline LinkedIn
                      </label>
                      <input
                        type="text"
                        value={linkedinHeadline}
                        onChange={(e) => setLinkedinHeadline(e.target.value)}
                        placeholder='Contoh: Digital Marketing | SEO & SEM | Open to Opportunities'
                        style={inputStyle}
                        onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = G)}
                        onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "rgba(30,56,50,0.2)")}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: G, marginBottom: 6 }}>
                        Bagian About / Summary LinkedIn
                      </label>
                      <textarea
                        value={linkedinAbout}
                        onChange={(e) => setLinkedinAbout(e.target.value)}
                        placeholder="Paste isi bagian About di profil LinkedIn kamu di sini..."
                        rows={4}
                        style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = G)}
                        onBlur={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = "rgba(30,56,50,0.2)")}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 6, backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "0.8rem" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || parsing}
                  style={{
                    backgroundColor: loading || parsing ? `rgba(30,56,50,0.4)` : G,
                    color: C,
                    padding: "14px 24px",
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: loading || parsing ? "not-allowed" : "pointer",
                    letterSpacing: "0.01em",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!loading && !parsing) (e.target as HTMLButtonElement).style.opacity = "0.85"; }}
                  onMouseLeave={(e) => { if (!loading && !parsing) (e.target as HTMLButtonElement).style.opacity = "1"; }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <svg style={{ animation: "spin 1s linear infinite", height: 18, width: 18 }} viewBox="0 0 24 24" fill="none">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sedang menganalisa CV kamu...
                    </span>
                  ) : (
                    "Analisa CV Saya"
                  )}
                </button>

                <p style={{ fontSize: "0.75rem", textAlign: "center", color: `rgba(30,56,50,0.35)` }}>
                  Gratis. Laporan lengkap siap dalam beberapa detik.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ backgroundColor: C, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ marginBottom: 52 }}>
            <p style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: `rgba(30,56,50,0.4)`, marginBottom: 12 }}>
              Yang kamu dapat
            </p>
            <h2 style={{ color: G, fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.01em", maxWidth: 420, lineHeight: 1.25 }}>
              Bukan coretan merah. Cetak biru yang bisa langsung dikerjakan.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1, border: `1px solid rgba(30,56,50,0.1)`, borderRadius: 8, overflow: "hidden", backgroundColor: `rgba(30,56,50,0.08)` }}>
            {features.map((f) => (
              <div
                key={f.num}
                style={{ backgroundColor: C, padding: "28px 28px 24px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", color: `rgba(30,56,50,0.3)` }}>
                  {f.num}
                </span>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: G, lineHeight: 1.3 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "0.82rem", color: `rgba(30,56,50,0.6)`, lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ backgroundColor: G, padding: "80px 0" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>

          <p style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: `rgba(245,240,232,0.35)`, marginBottom: 12 }}>
            Cara kerja
          </p>
          <h2 style={{ color: C, fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 52 }}>
            Tiga langkah. Selesai dalam menit.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 40 }}>
            {[
              {
                step: "01",
                title: "Upload CV-mu",
                desc: "Upload file PDF atau DOCX. Teks CV langsung dibaca otomatis — tidak perlu copy-paste manual.",
              },
              {
                step: "02",
                title: "Terima Laporan Lengkap",
                desc: "Dalam hitungan detik, laporan penuh langsung tersedia — audit CV, rewrite siap pakai, 30 ide konten, rencana eksekusi.",
              },
              {
                step: "03",
                title: "Eksekusi",
                desc: "Gunakan rekomendasi konkret untuk perbaiki CV dan bangun personal brand-mu. Semua instruksi siap, tinggal jalan.",
              },
            ].map((s) => (
              <div key={s.step} style={{ borderTop: `1px solid rgba(245,240,232,0.12)`, paddingTop: 20 }}>
                <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", color: `rgba(245,240,232,0.25)`, marginBottom: 14 }}>
                  {s.step}
                </span>
                <h3 style={{ color: C, fontWeight: 700, fontSize: "0.95rem", marginBottom: 10, lineHeight: 1.3 }}>
                  {s.title}
                </h3>
                <p style={{ color: `rgba(245,240,232,0.5)`, fontSize: "0.82rem", lineHeight: 1.65 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: G, borderTop: `1px solid rgba(245,240,232,0.08)`, padding: "28px 24px", textAlign: "center" }}>
        <span style={{ color: C, fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.04em" }}>DonaTalks</span>
        <p style={{ color: `rgba(245,240,232,0.25)`, fontSize: "0.7rem", marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Personal Branding &amp; Career Strategy
        </p>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, button { font-family: inherit; }
      `}</style>
    </div>
  );
}
