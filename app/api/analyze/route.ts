import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 120;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildPrompt(name: string, cvText: string, linkedinUrl: string | null): string {
  return `Kamu adalah DonaTalks, konsultan personal branding & career strategy terkemuka di Indonesia. Tugasmu adalah menganalisa CV ini secara mendalam, jujur, dan langsung — bukan memuji, tapi memberi cetak biru yang bisa langsung dipakai.

NAMA KLIEN: ${name}
LINKEDIN URL: ${linkedinUrl || "Tidak disertakan"}

ISI CV:
---
${cvText}
---

Buat analisa lengkap dengan format berikut. Gunakan Bahasa Indonesia yang tegas, santai, tapi profesional. Jadilah seperti konsultan senior yang berbicara langsung ke kliennya — jujur tapi konstruktif.

PENTING: Gunakan HANYA format headings berikut (pakai # dan ## persis seperti ini):

# RINGKASAN EKSEKUTIF

[Mulai dengan menyapa ${name} langsung. 3-4 paragraf panjang. Jujur tentang masalah utama CV mereka tapi akui kekuatannya. Identifikasi 3 masalah utama. Akhiri dengan rencana besar yang akan dibahas di sisa dokumen. Tulis dengan gaya "teman yang jujur".]

# KONTEKS KLIEN

[Level karier mereka, industri/bidang berdasarkan CV, tujuan yang diasumsikan, catatan transparansi tentang apa yang diterima dari klien. 3-4 paragraf.]

# YANG SUDAH KUAT

[5 kekuatan utama dengan bold subheading. Format: **Pertama, [judul kekuatan].** diikuti 2-3 kalimat penjelasan konkret berdasarkan CV mereka. Gunakan fakta dan angka dari CV.]

# TEMUAN & REKOMENDASI

## AREA A — Fondasi Profil LinkedIn

[3-4 temuan. Tiap temuan pakai format persis ini:]

TEMUAN: [apa yang ditemukan, spesifik berdasarkan CV/LinkedIn mereka]
ANALISA: [kenapa ini terjadi dan kenapa penting]
DAMPAK: [dampak nyata ke tujuan mereka]
REKOMENDASI: [apa yang harus dilakukan, spesifik dan actionable]
PRIORITAS: HIGH

[baris kosong antara temuan]

## AREA B — Audit CV dengan Rumus CV

[5-6 temuan dengan format TEMUAN/ANALISA/DAMPAK/REKOMENDASI/PRIORITAS. Fokus pada kalimat aktivitas vs dampak, angka yang kurang, struktur, typo, dll.]

## AREA C — Strategi: Niche, Persona, dan Content Pillar

[3-4 temuan tentang positioning, persona konten, dan content pillar]

## AREA D — Kualitas & Keterbacaan Konten

[2-3 temuan tentang kualitas penulisan konten LinkedIn]

## AREA E — Metrik & Algoritma

[2-3 temuan tentang cara mengukur keberhasilan konten]

# CONTOH PERBAIKAN KONKRET

## Ringkasan / Summary Pembuka

SEBELUM: "[kutip teks summary asli dari CV mereka, atau tulis versi generik yang mungkin mereka punya]"

SESUDAH: "[tulis versi yang jauh lebih kuat — pakai nama, angka, bukti konkret]"

## Pengalaman Kerja / Organisasi (pilih 3-5 yang paling penting)

[Untuk tiap pengalaman penting di CV:]

### [Nama Posisi/Pengalaman]

SEBELUM: "[kutip bullet point asli dari CV]"
SESUDAH: "[tulis ulang dengan rumus: kata kerja aksi + objek + hasil terukur + metode]"

[Buat minimal 8-10 pasang SEBELUM/SESUDAH dari berbagai pengalaman di CV]

## Kalimat Positioning

[Satu kalimat positioning yang kuat, format: "Aku bantu [target audiens] yang [masalah mereka] supaya [hasil yang dicapai] — lewat pengalaman sebagai [keahlian utama + bukti terkuat]."]

# RENCANA EKSEKUSI

## Minggu 1 — Benahi Etalase

[7-8 bullet spesifik yang harus dilakukan di minggu pertama]

## Minggu 2-4 — Mulai Posting

[5-6 bullet tentang posting konten dan ritme yang disarankan]

## Bulan 2-3 — Iterasi & Evaluasi

[5-6 bullet tentang evaluasi dan pengembangan]

# SKOR AKHIR

[Buat tabel skor dalam format ini persis:]

| Area | Skor | Catatan |
|------|------|---------|
| Fondasi Profil LinkedIn | X / 20 | [catatan singkat] |
| CV / Impact | X / 20 | [catatan singkat] |
| Niche & Positioning | X / 15 | [catatan singkat] |
| Content Pillar | X / 10 | [catatan singkat] |
| Kualitas Konten | X / 20 | [catatan singkat] |
| Strategi Metrik | X / 15 | [catatan singkat] |
| **TOTAL** | **X / 100** | **[kesimpulan singkat]** |

[Paragraf interpretasi skor: apa artinya angka ini, potensi dalam 3 bulan]

# IDE KONTEN SIAP PAKAI

## Pilar Story (cerita pengalaman)

[8-10 ide konten spesifik dari pengalaman nyata ${name}, dengan judul yang konkret]

## Pilar How-to (panduan praktis)

[7-8 ide how-to spesifik berdasarkan keahlian ${name}]

## Pilar Insight (sudut pandang)

[5-6 ide insight unik yang bisa ${name} tulis]

# PERTANYAAN WAWANCARA

[6-7 pertanyaan wawancara yang sering muncul berdasarkan CV mereka, dengan panduan jawaban menggunakan situasi nyata dari CV. Format:]

**"[Pertanyaan wawancara]"**
→ Gunakan [pengalaman spesifik dari CV]. Struktur jawab: [panduan singkat].

[Akhiri dengan 1 paragraf penutup yang motivatif dari DonaTalks — seperti di akhir laporan konsultan]`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cv_text, linkedin_url, session_id } = body;

    if (!name || !cv_text) {
      return Response.json({ error: "Nama dan CV wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();

    // Insert analysis record immediately
    const { error: insertError } = await supabaseServer
      .from("analyses")
      .insert({
        id,
        cv_text,
        linkedin_url: linkedin_url || null,
        session_id: session_id || uuidv4(),
        is_paid: false,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return Response.json({ error: "Gagal menyimpan analisa" }, { status: 500 });
    }

    // Generate analysis with Claude
    const prompt = buildPrompt(name, cv_text, linkedin_url);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const fullContent = (message.content[0] as { type: string; text: string }).text;

    // Extract preview: just first 2 sections (RINGKASAN EKSEKUTIF + KONTEKS KLIEN)
    const sections = fullContent.split(/^# /m);
    let previewContent = "";
    for (const section of sections) {
      if (section.startsWith("RINGKASAN EKSEKUTIF") || section.startsWith("KONTEKS KLIEN")) {
        previewContent += "# " + section + "\n";
      }
    }
    if (!previewContent) {
      previewContent = fullContent.substring(0, 1500) + "\n\n*...*";
    }

    // Update analysis with generated content
    const { error: updateError } = await supabaseServer
      .from("analyses")
      .update({
        preview_content: previewContent.trim(),
        full_content: fullContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return Response.json({ id });
  } catch (err: unknown) {
    console.error("Analyze error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
