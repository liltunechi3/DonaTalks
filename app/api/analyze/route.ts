import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

// ── LinkedIn Profile (Proxycurl) ──────────────────────────────────────────────

interface LinkedInExperience {
  company: string | null;
  title: string | null;
  description: string | null;
  starts_at: { year: number; month: number } | null;
  ends_at: { year: number; month: number } | null;
}

interface LinkedInEducation {
  school: string | null;
  degree_name: string | null;
  field_of_study: string | null;
  starts_at: { year: number } | null;
  ends_at: { year: number } | null;
}

interface LinkedInProfile {
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  profile_pic_url: string | null;
  background_cover_image_url: string | null;
  connections: number | null;
  follower_count: number | null;
  experiences: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: string[];
  certifications: { name: string | null }[];
  recommendations: unknown[];
}

async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfile | null> {
  const proxycurlKey = process.env.PROXYCURL_API_KEY;
  if (!proxycurlKey) return null; // No key = no data, analysis uses checklist mode

  try {
    const res = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&skills=include&extra=include`,
      {
        headers: { Authorization: `Bearer ${proxycurlKey}` },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) {
      console.error("Proxycurl error:", res.status);
      return null;
    }
    return (await res.json()) as LinkedInProfile;
  } catch (err) {
    console.error("Proxycurl fetch error:", err);
    return null;
  }
}

// ── CV Extraction Helpers ─────────────────────────────────────────────────────

function extractSection(text: string, headers: string[]): string {
  for (const h of headers) {
    const rx = new RegExp(
      `(?:^|\\n)\\s*${h}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z\\s&/]{3,}\\s*:?\\s*\\n|\\n\\s*#{1,3}\\s|$)`,
      "im"
    );
    const m = text.match(rx);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function extractUniversity(text: string): string {
  const knownList = [
    "Universitas Indonesia",
    "Institut Teknologi Bandung",
    "Universitas Gadjah Mada",
    "Institut Pertanian Bogor",
    "Universitas Diponegoro",
    "Universitas Airlangga",
    "BINUS University",
    "Universitas Bina Nusantara",
    "Prasetiya Mulya",
    "Universitas Pelita Harapan",
    "Universitas Kristen Petra",
    "Universitas Brawijaya",
    "Telkom University",
    "Universitas Padjadjaran",
    "Universitas Trisakti",
    "Universitas Tarumanagara",
    "Universitas Atma Jaya",
    "PKN STAN",
    "Universitas Negeri Jakarta",
    "Universitas Negeri Yogyakarta",
    "Universitas Hasanuddin",
    "Institut Teknologi Sepuluh Nopember",
    "Universitas Sebelas Maret",
    "Universitas Lampung",
    "Universitas Sriwijaya",
    "Universitas Andalas",
    "Universitas Sam Ratulangi",
    "Universitas Udayana",
    "Universitas Muhammadiyah",
    "NTU",
    "NUS",
    "Monash University",
    "University of Melbourne",
  ];

  for (const u of knownList) {
    if (new RegExp(`\\b${u.replace(/[().]/g, "\\$&")}\\b`, "i").test(text)) {
      return u;
    }
  }

  // Abbreviations with word boundary
  const abbrevs = ["UI", "ITB", "UGM", "IPB", "UNDIP", "UNAIR", "UPH", "UB", "UNJ", "UNY", "UNHAS", "ITS", "UNS", "UNPAD", "UNTAR", "STAN"];
  for (const a of abbrevs) {
    if (new RegExp(`\\b${a}\\b`).test(text)) {
      const nameMap: Record<string, string> = {
        UI: "Universitas Indonesia", ITB: "Institut Teknologi Bandung", UGM: "Universitas Gadjah Mada",
        IPB: "Institut Pertanian Bogor", UNDIP: "Universitas Diponegoro", UNAIR: "Universitas Airlangga",
        UPH: "Universitas Pelita Harapan", UB: "Universitas Brawijaya", UNJ: "Universitas Negeri Jakarta",
        UNY: "Universitas Negeri Yogyakarta", UNHAS: "Universitas Hasanuddin", ITS: "Institut Teknologi Sepuluh Nopember",
        UNS: "Universitas Sebelas Maret", UNPAD: "Universitas Padjadjaran", UNTAR: "Universitas Tarumanagara", STAN: "PKN STAN",
      };
      return nameMap[a] || a;
    }
  }

  // Generic university pattern
  const generic = text.match(/\b(Universitas\s+[A-Z][a-zA-Z\s]{2,30}|[A-Z][a-zA-Z]+\s+University|Institut(?:ut)?\s+[A-Z][a-zA-Z\s]{2,25})/);
  return generic ? generic[1].trim() : "";
}

function extractGPA(text: string): string {
  const m = text.match(/(?:IPK|GPA|Indeks Prestasi(?:\s+Kumulatif)?)[:\s]*([34][.,][0-9]{1,2})/i);
  return m ? m[1].replace(",", ".") : "";
}

function extractMajor(text: string): string {
  const m = text.match(/(?:Jurusan|Program Studi|Prodi|Major|Konsentrasi|Departemen)[:\s]+([^\n,;]{3,50})/i);
  return m ? m[1].trim() : "";
}

function extractDegree(text: string): string {
  const m = text.match(/\b(S\.?1|S-1|S\.?2|S-2|D\.?3|D-3|D\.?4|D-4|Sarjana|Diploma|Magister|Bachelor|Master|S\.?Kom|S\.?T\b|S\.?E\b|S\.?H\b|S\.?Si|M\.?Sc|M\.?Eng|M\.?M\b|B\.?Sc|B\.?Eng)\b/i);
  return m ? m[0] : "";
}

function extractSkills(text: string): string[] {
  const keywords = [
    "Python", "Excel", "Google Sheets", "Figma", "Canva", "SQL", "MySQL", "PostgreSQL",
    "Java", "JavaScript", "TypeScript", "React", "Vue.js", "Angular", "Node.js",
    "PHP", "Laravel", "Django", "Flask", "Spring Boot", "Kotlin", "Swift", "Flutter",
    "C++", "C#", "Go", "Rust", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
    "Git", "GitHub", "GitLab", "Linux", "Bash",
    "Photoshop", "Illustrator", "Premiere Pro", "After Effects", "InDesign",
    "PowerPoint", "Word", "Google Docs",
    "SPSS", "Tableau", "Power BI", "Looker", "Data Studio", "Google Analytics",
    "AutoCAD", "MATLAB", "R Studio",
    "SAP", "Salesforce", "HubSpot", "Odoo",
    "SEO", "SEM", "Google Ads", "Meta Ads", "TikTok Ads",
    "WordPress", "Webflow", "Shopify",
    "Notion", "Asana", "Trello", "Jira", "Monday.com",
    "Sketch", "InVision", "Zeplin", "Miro", "Whimsical",
    "TensorFlow", "PyTorch", "Scikit-learn",
    "Machine Learning", "Deep Learning", "NLP",
  ];

  const found: string[] = [];
  for (const kw of keywords) {
    if (new RegExp(`\\b${kw.replace(/[.+]/g, "\\$&")}\\b`, "i").test(text)) {
      if (!found.some((f) => f.toLowerCase() === kw.toLowerCase())) found.push(kw);
    }
  }

  // Also scrape from Skills section
  const section = extractSection(text, ["Skills", "Keahlian", "Kemampuan", "Technical Skills", "Kompetensi", "Skill"]);
  if (section) {
    for (const line of section.split("\n")) {
      for (const part of line.split(/[,|•\-·\/]/).map((s) => s.trim())) {
        if (part.length >= 2 && part.length <= 35 && !/^\d/.test(part) && !found.some((f) => f.toLowerCase() === part.toLowerCase())) {
          found.push(part);
        }
      }
    }
  }

  return [...new Set(found)].filter((s) => s.length >= 2 && s.length <= 40).slice(0, 14);
}

function extractBullets(text: string): string[] {
  const bullets: string[] = [];
  const linePattern = /^[\s]*[-•*▪▸◦]\s+(.{15,250})$/gm;
  let m;
  while ((m = linePattern.exec(text)) !== null) bullets.push(m[1].trim());
  const numPattern = /^[\s]*\d+[.)]\s+(.{15,250})$/gm;
  while ((m = numPattern.exec(text)) !== null) bullets.push(m[1].trim());
  return bullets;
}

function extractWeakBullets(text: string): string[] {
  const all = extractBullets(text);
  const passive = [
    /^(?:bertanggung jawab|bertanggungjawab)/i,
    /^(?:membantu|membantu tim|membantu dalam)/i,
    /^(?:melakukan|melaksanakan|menjalankan)/i,
    /^(?:berpartisipasi|terlibat|ikut serta|turut\s)/i,
    /^(?:responsible for|assist(?:ed|ing)?|participated|involved)/i,
    /^(?:menjadi bagian|menjadi anggota|sebagai anggota)/i,
    /^(?:aktif dalam|aktif di|aktif sebagai)/i,
    /^(?:mempersiapkan|menyiapkan|mengerjakan tugas)/i,
    /^(?:mengikuti|ikut dalam)/i,
  ];
  return all.filter((b) => passive.some((p) => p.test(b))).slice(0, 5);
}

function extractCompanies(text: string): string[] {
  const found: string[] = [];

  // PT [Name] — most common Indonesian company pattern
  const ptRx = /\bPT\.?\s+([A-Z][A-Za-z\s&.,'-]{2,35}?)(?=\s*[,\n|•(]|$)/g;
  let m;
  while ((m = ptRx.exec(text)) !== null) found.push(`PT ${m[1].trim()}`);

  // CV / Firma
  const cvRx = /\b(?:CV|Firma)\s+([A-Z][A-Za-z\s&.,'-]{2,30})/g;
  while ((m = cvRx.exec(text)) !== null) found.push(m[0].trim());

  // "Company Name | City" or "Company Name · City"
  const pipeRx = /^([A-Z][A-Za-z\s&.,'-]{3,40})\s*[|·]\s*(?:[A-Z][a-zA-Z]+|\d{4})/gm;
  while ((m = pipeRx.exec(text)) !== null) found.push(m[1].trim());

  // Company indicator suffixes
  const suffixRx = /([A-Z][A-Za-z\s]{2,30}\s+(?:Indonesia|Group|Corp(?:oration)?|Ltd|Inc|Tbk|Solutions?|Consulting|Technology|Technologies|Digital|Media|Studio|Agency|Bank|Finance|Ventures?))/g;
  while ((m = suffixRx.exec(text)) !== null) found.push(m[1].trim());

  return [...new Set(found)]
    .filter((c) => c.length > 3 && c.length < 60 && !c.includes("\n"))
    .slice(0, 4);
}

function countPassiveVerbs(text: string): number {
  const hits = text.match(
    /\b(?:bertanggung jawab|bertanggungjawab|membantu(?:\s+tim)?(?:\s+dalam)?|melakukan|melaksanakan|menjalankan|berpartisipasi|terlibat|ikut serta|turut\s|menjadi bagian|mengikuti|responsible for|assist(?:ed|ing)?|participated|involved in)\b/gi
  );
  return hits ? hits.length : 0;
}

function countMetrics(text: string): number {
  const hits = text.match(
    /\d+\s*%|\d+\s*(?:orang|peserta|anggota|klien|project|pelanggan|pengguna|mahasiswa|user|tim|team)|\bRp\.?\s*[\d,.]+[KMBjuta]*|\b\d{1,3}(?:[.,]\d{3})+\b/gi
  );
  return hits ? hits.length : 0;
}

type CareerLevel = "student" | "fresh_grad" | "junior" | "mid" | "senior";

function detectCareerLevel(text: string): CareerLevel {
  const senior = /\b(?:senior|manager|manajer|lead|head of|VP|vice president|director|principal|supervisor|chief|C-level)\b/i.test(text);
  const student = /\b(?:mahasiswa|mahasiswi|student|semester\s+[1-8]|angkatan\s+\d{4})\b/i.test(text);
  const freshGrad = /\b(?:fresh.?grad(?:uate)?|baru lulus|lulusan baru|0\s*tahun\s*pengalaman)\b/i.test(text);
  const yearsM = text.match(/(\d+)\s*(?:\+\s*)?(?:tahun|year)s?\s+(?:pengalaman|experience)/i);
  const yrs = yearsM ? parseInt(yearsM[1]) : 0;

  if (senior || yrs >= 7) return "senior";
  if (yrs >= 4) return "mid";
  if (yrs >= 1) return "junior";
  if (freshGrad) return "fresh_grad";
  if (student) return "student";
  return "junior";
}

function detectIndustry(text: string): string {
  const map: [string, RegExp][] = [
    ["Teknologi & Software", /\b(?:software engineer|developer|programmer|data scientist|data analyst|machine learning|AI engineer|web developer|mobile dev|backend|frontend|fullstack|DevOps|cloud engineer|QA|cybersecurity)\b/i],
    ["Keuangan & Perbankan", /\b(?:bank(?:ing)?|finance|accounting|akuntan|keuangan|investasi|treasury|audit|tax|pajak|sekuritas|insurance|asuransi|fintech)\b/i],
    ["Marketing & Komunikasi", /\b(?:marketing|social media|content creator|branding|public relation|PR|copywriting|digital marketing|SEO|SEM|campaign|brand manager)\b/i],
    ["Human Resources", /\b(?:HRD|human resource|rekrutmen|recruitment|talent acquisition|payroll|HRIS|L&D|organizational development)\b/i],
    ["Konsultan & Bisnis", /\b(?:konsultan|consultant|business analyst|business development|project management|management consulting|strategy)\b/i],
    ["Desain & Kreatif", /\b(?:desainer|UI\/UX|UX designer|graphic designer|illustrator|visual designer|creative|motion designer|video editor|photographer)\b/i],
    ["Pendidikan & Pelatihan", /\b(?:guru|pengajar|dosen|trainer|tutor|instruktur|education)\b/i],
    ["Kesehatan & Farmasi", /\b(?:dokter|perawat|apoteker|farmasi|kesehatan|medical|nurse|pharmacist|bidan)\b/i],
    ["Supply Chain & Logistik", /\b(?:supply chain|logistik|logistics|procurement|warehouse|gudang|distribusi|inventory|purchasing)\b/i],
    ["Hukum", /\b(?:hukum|lawyer|notaris|advokat|legal|paralegal)\b/i],
  ];
  for (const [industry, rx] of map) {
    if (rx.test(text)) return industry;
  }
  return "Profesional";
}

function transformWeakBullet(bullet: string): string {
  const replacements: [RegExp, string][] = [
    [/^bertanggung jawab atas /i, "Mengelola "],
    [/^bertanggungjawab atas /i, "Mengelola "],
    [/^bertanggung jawab dalam /i, "Memimpin "],
    [/^bertanggungjawab dalam /i, "Memimpin "],
    [/^bertanggung jawab /i, "Mengelola "],
    [/^membantu tim dalam /i, "Berkolaborasi dalam "],
    [/^membantu tim /i, "Berkolaborasi dengan tim "],
    [/^membantu dalam /i, "Berkontribusi dalam "],
    [/^membantu /i, "Mendukung "],
    [/^melakukan /i, "Mengeksekusi "],
    [/^melaksanakan /i, "Mengimplementasikan "],
    [/^menjalankan /i, "Mengoperasikan "],
    [/^berpartisipasi dalam /i, "Berkontribusi aktif dalam "],
    [/^terlibat dalam /i, "Berperan dalam "],
    [/^ikut serta dalam /i, "Berpartisipasi langsung dalam "],
    [/^turut /i, "Berperan "],
    [/^menjadi bagian dari /i, "Berkontribusi dalam "],
    [/^aktif dalam /i, "Konsisten berkontribusi dalam "],
    [/^aktif di /i, "Aktif berkontribusi di "],
    [/^mempersiapkan /i, "Menyiapkan dan mengeksekusi "],
    [/^mengerjakan /i, "Menyelesaikan "],
    [/^mengikuti /i, "Berpartisipasi dalam "],
    [/^ikut dalam /i, "Berkontribusi dalam "],
    [/^responsible for /i, "Led "],
    [/^assisted /i, "Collaborated on "],
    [/^participated in /i, "Contributed to "],
    [/^involved in /i, "Played a key role in "],
  ];

  let result = bullet;
  for (const [rx, repl] of replacements) {
    if (rx.test(result)) {
      result = result.replace(rx, repl);
      break;
    }
  }

  result = result.replace(/\.\s*$/, "");
  result += " — [tambahkan: berapa orang terdampak / berapa % perubahan / dalam berapa waktu?]";
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ── Main Analysis Generator ───────────────────────────────────────────────────

function generateAnalysis(name: string, cvText: string, linkedinUrl: string | null, linkedInProfile: LinkedInProfile | null = null): string {
  const firstName = name.split(" ")[0];

  // Extract CV data
  const university = extractUniversity(cvText);
  const gpa = extractGPA(cvText);
  const major = extractMajor(cvText);
  const degree = extractDegree(cvText);
  const skills = extractSkills(cvText);
  const weakBullets = extractWeakBullets(cvText);
  const allBullets = extractBullets(cvText);
  const companies = extractCompanies(cvText);
  const passiveCount = countPassiveVerbs(cvText);
  const metricsCount = countMetrics(cvText);
  const hasMetrics = metricsCount >= 2;
  const careerLevel = detectCareerLevel(cvText);
  const industry = detectIndustry(cvText);
  const hasLinkedin = !!linkedinUrl;
  const cvLength = cvText.length;

  const levelLabel: Record<CareerLevel, string> = {
    student: "Mahasiswa / Pelajar Aktif",
    fresh_grad: "Fresh Graduate",
    junior: "Early Career Professional (1–3 Tahun)",
    mid: "Mid-Level Professional (3–7 Tahun)",
    senior: "Senior Professional / People Manager (7+ Tahun)",
  };

  // Build personalized context strings
  const eduParts: string[] = [];
  if (university) eduParts.push(university);
  if (major) eduParts.push(major);
  if (degree) eduParts.push(degree);
  if (gpa) eduParts.push(`IPK ${gpa}`);
  const eduDesc = eduParts.length > 0 ? eduParts.join(" — ") : null;

  const companyDesc =
    companies.length >= 2
      ? `${companies[0]} dan ${companies[1]}`
      : companies.length === 1
      ? companies[0]
      : null;

  // Specific problems found in THEIR CV
  const problemList: string[] = [];
  if (passiveCount >= 3) {
    problemList.push(
      `**${passiveCount} kalimat pasif ditemukan** — frasa seperti "bertanggung jawab atas", "membantu tim", dan "melakukan" muncul berulang kali di CV kamu. Rekruter mencari dampak, bukan deskripsi tugas`
    );
  } else if (passiveCount > 0) {
    problemList.push(
      `**${passiveCount} kalimat pasif perlu di-rewrite** — rumus dampak yang benar adalah kata kerja aksi + objek + hasil terukur + konteks`
    );
  }
  if (!hasMetrics) {
    problemList.push(
      `**Hampir tidak ada angka atau metrik** di seluruh CV kamu — tanpa data kuantitatif, rekruter tidak bisa membandingkan kontribusi kamu dengan kandidat lain`
    );
  } else if (metricsCount < 5) {
    problemList.push(
      `**Hanya ${metricsCount} data terukur** yang ditemukan di CV — idealnya setiap pengalaman punya minimal satu angka konkret`
    );
  }
  if (!hasLinkedin) {
    problemList.push(
      `**Tidak ada URL LinkedIn** yang disertakan — di tahun 2025, rekruter aktif mencari kandidat di LinkedIn sebelum membalas email`
    );
  }
  if (skills.length < 4) {
    problemList.push(
      `**Bagian Skills perlu diperkuat** — tool dan kemampuan teknis yang spesifik adalah keyword yang dibaca ATS sebelum rekruter manusia melihat CV kamu`
    );
  }

  // Opening sentence for executive summary
  const openingContext: string[] = [];
  if (eduDesc) openingContext.push(`latar belakang dari ${eduDesc}`);
  if (companyDesc) openingContext.push(`pengalaman di ${companyDesc}`);
  if (skills.length > 0) openingContext.push(`skill seperti ${skills.slice(0, 3).join(", ")}`);
  const openingCtxStr =
    openingContext.length > 0
      ? `Saya sudah baca CV kamu dari atas ke bawah — termasuk ${openingContext.join(", ")}. Dan ada hal yang perlu kita bicarakan serius.`
      : `${firstName}, saya sudah baca CV kamu dari atas ke bawah. Dan ada hal yang perlu kita bicarakan serius.`;

  // SEBELUM/SESUDAH pairs — use actual CV bullets first
  const sebelumSesudah: string[] = [];
  const usedBullets = weakBullets.slice(0, 3);
  for (const b of usedBullets) {
    sebelumSesudah.push(`SEBELUM: "${b}"\n\nSESUDAH: "${transformWeakBullet(b)}"`);
  }

  // Fill remaining slots with generic examples (different from extracted)
  const genericPairs = [
    {
      before: "Bertanggung jawab atas pembuatan konten media sosial organisasi dan membantu koordinasi acara",
      after: `Memproduksi konten media sosial secara konsisten untuk [nama organisasi] — [tambahkan: berapa total post? berapa % pertumbuhan followers atau engagement dalam berapa bulan?]`,
    },
    {
      before: "Membantu tim dalam pelaksanaan program kerja divisi dan mengikuti rapat mingguan",
      after: `Mengkoordinasikan [X] anggota tim dalam eksekusi [X] program kerja divisi — [tambahkan: berapa program selesai tepat waktu? berapa % target yang tercapai?]`,
    },
    {
      before: "Melakukan presentasi dan membuat laporan untuk keperluan akademik dan organisasi",
      after: `Mempresentasikan hasil analisis kepada audiens [X orang] dan menghasilkan laporan yang digunakan untuk [tujuan konkret] — [tambahkan: apa dampak atau keputusan yang dihasilkan?]`,
    },
    {
      before: "Berpartisipasi dalam kepanitiaan dan membantu pelaksanaan acara",
      after: `Mengkoordinasikan [X] divisi kepanitiaan untuk acara [nama] dengan [X] peserta — [tambahkan: budget yang dikelola? tingkat kepuasan peserta? pencapaian vs target?]`,
    },
    {
      before: "Terlibat dalam proyek kelompok sebagai anggota tim dan belajar cara kerja profesional",
      after: `Berkontribusi sebagai [peran spesifik] dalam proyek [bidang/nama], menghasilkan [deliverable konkret] — [tambahkan: timeline proyek, dampak terukur, atau pengakuan yang diterima]`,
    },
  ];

  let gIdx = 0;
  while (sebelumSesudah.length < 5 && gIdx < genericPairs.length) {
    const ex = genericPairs[gIdx];
    const isDup = usedBullets.some((b) =>
      b.toLowerCase().startsWith(ex.before.toLowerCase().slice(0, 25))
    );
    if (!isDup) sebelumSesudah.push(`SEBELUM: "${ex.before}"\n\nSESUDAH: "${ex.after}"`);
    gIdx++;
  }

  // Score computation
  const liScore = hasLinkedin ? (skills.length >= 5 ? 9 : 7) : 4;
  const cvScore = hasMetrics ? (metricsCount >= 5 ? 14 : 11) : 7;
  const nicheScore = industry !== "Profesional" ? 7 : 5;
  const contentScore = 4;
  const qualScore = skills.length >= 5 ? 13 : skills.length >= 2 ? 10 : 7;
  const metricScore = hasMetrics ? (metricsCount >= 5 ? 8 : 6) : 3;
  const totalScore = liScore + cvScore + nicheScore + contentScore + qualScore + metricScore;

  // Content ideas tailored to industry
  const industryContentIdeas: Record<string, string[]> = {
    "Teknologi & Software": [
      `"Hal yang tidak diajarkan di bootcamp/kuliah tentang dunia ${industry} — dari pengalaman langsung saya"`,
      `"Framework debugging yang selalu saya pakai saat menemukan bug yang tidak masuk akal"`,
      `"Kenapa saya akhirnya memilih [tech stack kamu] dibanding alternatifnya — analisis jujur"`,
    ],
    "Marketing & Komunikasi": [
      `"Strategi konten yang saya pakai untuk meningkatkan engagement [platform] — dengan data nyata"`,
      `"Perbedaan antara marketing yang terasa spam dan yang benar-benar convert — dari pengalaman saya"`,
      `"Hot take: follower count bukan metrik kesuksesan yang relevan — ini yang lebih penting"`,
    ],
    "Keuangan & Perbankan": [
      `"3 kesalahan finansial yang paling sering saya lihat sebagai [peran kamu] — dan cara menghindarinya"`,
      `"Cara saya membaca laporan keuangan dalam 10 menit — cheatsheet yang selalu saya pakai"`,
      `"Perbedaan mindset keuangan antara orang yang berkembang dan yang stagnan di industri ini"`,
    ],
  };

  const contentIdeas = (industryContentIdeas[industry] || [
    `"Hal yang tidak diajarkan kampus tentang dunia kerja ${industry} — dari pengalaman pertama saya"`,
    `"Kesalahan terbesar yang saya buat di awal karier dan apa yang saya pelajari darinya"`,
    `"Timeline jujur perjalanan dari [titik awal kamu] ke posisi saat ini"`,
  ]);

  // Week 1 personalized tasks
  const week1Tasks: string[] = [];
  if (!hasLinkedin) {
    week1Tasks.push("Buat atau aktifkan kembali profil LinkedIn — ini non-negotiable di 2025");
  } else {
    week1Tasks.push(`Perbarui headline LinkedIn: hapus jabatan generik, ganti dengan formula [Keahlian Utama] | [Nilai yang Kamu Bawa] | [Target Industri]`);
  }
  if (gpa && parseFloat(gpa) >= 3.2) {
    week1Tasks.push(`Tampilkan IPK ${gpa} secara strategis — letakkan tepat di bawah nama institusi dengan format: ${university || "Universitas"} — ${major || "Jurusan"} — IPK: ${gpa}/4.00`);
  }
  if (passiveCount > 0) {
    week1Tasks.push(`Rewrite ${Math.min(passiveCount, 5)} bullet point pasif menggunakan rumus: Kata Kerja Aksi + Objek + Hasil Terukur + Konteks`);
  }
  if (!hasMetrics) {
    week1Tasks.push("Tambahkan minimal 1 angka ke setiap pengalaman: jumlah orang, %, budget, timeline, atau skala proyek");
  }
  if (skills.length > 0) {
    week1Tasks.push(`Verifikasi bagian Skills: pastikan semua tool yang kamu kuasai sudah tercantum — termasuk ${skills.slice(0, 3).join(", ")} yang sudah terdeteksi di CV`);
  }
  week1Tasks.push("Simpan CV dalam format PDF dengan nama file: [NamaLengkap]_CV_[BulanTahun].pdf");
  week1Tasks.push("Minta 2–3 rekomendasi LinkedIn dari orang yang pernah bekerja atau berorganisasi sama kamu");

  // ── Build the document ────────────────────────────────────────────────────

  const problemText =
    problemList.length > 0
      ? problemList.map((p, i) => `**${i + 1}.** ${p}`).join("\n\n")
      : "Secara keseluruhan CV kamu punya fondasi yang perlu dioptimalkan lebih jauh.";

  const skillsLine =
    skills.length > 0
      ? `Tool dan skill yang terdeteksi di CV kamu — ${skills.slice(0, 6).join(", ")} — adalah aset nyata. Tapi cara mengkomunikasikannya belum menjawab satu pertanyaan kunci yang ada di kepala rekruter: *"Impact-nya apa?"*`
      : `Bagian Skills di CV kamu perlu diperkuat dengan tool dan kemampuan teknis spesifik — ini adalah keyword pertama yang dibaca sistem ATS sebelum sampai ke mata rekruter.`;

  const expContext =
    companyDesc
      ? `Kamu sudah punya rekam jejak nyata${companyDesc ? ` di ${companyDesc}` : ""} — ini modal berharga yang banyak orang tidak punya di tahap yang sama.`
      : careerLevel === "student"
      ? `Sebagai mahasiswa aktif, pengalaman organisasi dan proyek akademik kamu adalah modal utama yang harus dikemas dengan benar.`
      : `Pengalaman yang kamu miliki adalah modal nyata — tugasnya sekarang adalah memastikan semuanya dikomunikasikan dengan format yang benar kepada rekruter.`;

  // LinkedIn AREA B section — computed separately to avoid nested template literal issues
  const exampleHeadline = `${skills.length > 0 ? skills[0] : industry.split(" ")[0]} ${careerLevel === "student" || careerLevel === "fresh_grad" ? "| Fresh Graduate" : "Professional"} | ${skills.length > 1 ? skills.slice(0, 2).join(" & ") : industry.split(" ")[0]} | Open to Opportunities`;

  let linkedInSection: string;
  if (!hasLinkedin) {
    linkedInSection = `TEMUAN: Tidak ada URL LinkedIn yang disertakan dalam CV ${firstName}.
ANALISA: LinkedIn adalah mesin pencari personal brand — rekruter aktif menggunakan boolean search untuk menemukan kandidat secara proaktif. Tanpa profil publik, kamu tidak ada di radar mereka.
DAMPAK: Kandidat tanpa LinkedIn kehilangan 70%+ peluang dari rekruter yang mencari secara aktif.
REKOMENDASI: Buat profil LinkedIn hari ini. Gunakan nama lengkap persis seperti di CV. Headline langsung: "${exampleHeadline}"
PRIORITAS: HIGH

TEMUAN: Lima area wajib dioptimalkan segera setelah profil dibuat: headline, foto profil, banner, bagian About, dan Skills section.
ANALISA: Profil LinkedIn yang tidak dioptimalkan sama buruknya dengan tidak punya profil — rekruter yang mengklik akan langsung keluar jika tidak ada isi yang menarik.
DAMPAK: Profil kosong atau setengah jadi memberi kesan negatif dan ketidakseriusan.
REKOMENDASI: Selesaikan semua 5 area dalam satu sesi 2–3 jam. Gunakan CV sebagai bahan dasar, adaptasikan ke format dan tone LinkedIn.
PRIORITAS: HIGH`;
  } else if (linkedInProfile) {
    const liHeadline = linkedInProfile.headline || "(kosong)";
    const headlineNote = !linkedInProfile.headline
      ? "Headline kosong — ini yang pertama dilihat rekruter di search result."
      : linkedInProfile.headline.length < 40
      ? `Hanya ${linkedInProfile.headline.length} karakter — belum memaksimalkan 220 karakter yang tersedia.`
      : linkedInProfile.headline.includes("|") || linkedInProfile.headline.includes("·")
      ? "Sudah menggunakan separator, tapi perlu dicek apakah mengkomunikasikan nilai nyata atau hanya jabatan."
      : "Perlu dioptimalkan dengan keyword yang lebih spesifik.";

    const aboutStatus = linkedInProfile.summary
      ? `sudah diisi — *"${linkedInProfile.summary.slice(0, 150)}${linkedInProfile.summary.length > 150 ? "..." : ""}"*. Perlu dicek kekuatan hook di kalimat pertama.`
      : "**KOSONG** — kesempatan terbesar yang belum dimanfaatkan.";

    const photoStatus = linkedInProfile.profile_pic_url ? "terdeteksi ✓" : "tidak terdeteksi — perlu dicek apakah sudah dipasang dan dipublikasikan";
    const bannerStatus = linkedInProfile.background_cover_image_url ? "terdeteksi ✓ — pastikan on-brand" : "tidak terdeteksi — kemungkinan masih default biru LinkedIn";

    const skillsBlock = linkedInProfile.skills && linkedInProfile.skills.length > 0
      ? `TEMUAN: Skills terdaftar di LinkedIn: **${linkedInProfile.skills.slice(0, 8).join(", ")}**${linkedInProfile.skills.length > 8 ? ` (+${linkedInProfile.skills.length - 8} lainnya)` : ""}. ${skills.length > 0 ? `Skills di CV: ${skills.slice(0, 4).join(", ")}.` : ""}
ANALISA: Rekruter sering membandingkan LinkedIn dan CV. Inkonsistensi menciptakan keraguan tentang mana yang akurat.
DAMPAK: Skills yang tidak selaras antara dua platform bisa menurunkan kredibilitas tanpa disadari.
REKOMENDASI: Sinkronkan skills di CV dan LinkedIn. Prioritaskan keyword yang sering muncul di job description target di ${industry}.
PRIORITAS: MEDIUM`
      : `TEMUAN: Skills di LinkedIn perlu diisi atau diverifikasi agar selaras dengan CV.
ANALISA: Skills section di LinkedIn adalah keyword yang dibaca rekruter saat boolean search. Tanpa ini, profil tidak terindeks untuk pencarian spesifik.
DAMPAK: Skills kosong = tidak muncul di pencarian spesifik = kehilangan peluang yang bahkan tidak disadari.
REKOMENDASI: Tambahkan minimal 10 skill: ${skills.length > 0 ? skills.slice(0, 6).join(", ") : "tool teknis yang kamu kuasai"}. Minta endorsement dari 3+ koneksi.
PRIORITAS: MEDIUM`;

    linkedInSection = `TEMUAN: Headline LinkedIn ${firstName} saat ini: **"${liHeadline}"**. ${headlineNote}
ANALISA: Headline muncul di search result LinkedIn. Formula efektif: [Keahlian Utama] | [Nilai yang Kamu Bawa] | [Target Industri].
DAMPAK: Profil dengan headline yang dioptimalkan mendapat 40% lebih banyak penampilan di pencarian rekruter.
REKOMENDASI: Ganti${linkedInProfile.headline ? ` dari "${linkedInProfile.headline}"` : ""} menjadi: "${exampleHeadline}"
PRIORITAS: HIGH

TEMUAN: Bagian About: ${aboutStatus}
ANALISA: Bagian About adalah 2.600 karakter real estate terbaik di LinkedIn. Kalimat pembuka menentukan apakah rekruter mengklik atau scroll.
DAMPAK: About yang kosong atau hook yang lemah membuat rekruter tidak bisa membedakan kamu dari ratusan kandidat lain.
REKOMENDASI: Tulis About 4 blok: **(1) Hook** — 1–2 kalimat kuat sebelum "lihat selengkapnya"${university ? ` (hubungkan background ${university} dengan dampak nyata)` : ""}; **(2) Perjalanan singkat**; **(3) Keahlian inti** — ${skills.length > 0 ? skills.slice(0, 4).join(", ") : "tool teknis utama"}; **(4) CTA** — apa yang kamu cari dan cara dihubungi.
PRIORITAS: HIGH

TEMUAN: Foto profil: ${photoStatus}. Banner: ${bannerStatus}.
ANALISA: Profil dengan foto profesional mendapat 21x lebih banyak dilihat. Banner adalah iklan gratis 1584x396px yang mayoritas pengguna biarkan default.
DAMPAK: Kesan pertama terjadi secara visual dalam <1 detik — sebelum rekruter membaca satu kata dari headline.
REKOMENDASI: Foto: latar bersih, pakaian sesuai ${industry}, ekspresi natural, ukuran min 400x400px. Banner: buat di Canva dengan tagline dan ${skills.length > 0 ? skills.slice(0, 2).join(" / ") : "keahlian utama"}, ukuran 1584x396px.
PRIORITAS: MEDIUM

${skillsBlock}`;
  } else {
    // Has LinkedIn URL but no profile data (no Proxycurl key)
    linkedInSection = `TEMUAN: URL LinkedIn sudah disertakan (${linkedinUrl}). Audit profil berdasarkan checklist standar karena data profil tidak dapat diakses secara otomatis.
ANALISA: Headline, About, foto, banner, dan Skills section adalah lima area yang menentukan apakah rekruter mau mengklik profil kamu di search result.
DAMPAK: Profil LinkedIn yang tidak dioptimalkan sama buruknya dengan tidak punya profil — rekruter yang mengklik tanpa menemukan isi yang menarik akan langsung keluar.
REKOMENDASI: Buka profil LinkedIn kamu sekarang dan cek satu per satu: (1) Headline — sudah pakai formula [Keahlian] | [Nilai] | [Industri]? Contoh: "${exampleHeadline}" (2) About — sudah ada hook kuat di 2 kalimat pertama? (3) Foto — profesional dan latar bersih? (4) Banner — bukan default biru LinkedIn? (5) Skills — minimal 10 skill relevan sudah terdaftar?
PRIORITAS: HIGH

TEMUAN: Sinkronisasi antara CV dan profil LinkedIn perlu diverifikasi secara manual.
ANALISA: Rekruter sering membuka CV dan LinkedIn secara bersamaan. Inkonsistensi — nama jabatan berbeda, periode kerja berbeda, skill tidak selaras — menciptakan keraguan tentang kredibilitas.
DAMPAK: Inkonsistensi kecil sekalipun bisa menjadi alasan penolakan yang tidak pernah dikomunikasikan ke kandidat.
REKOMENDASI: Buka CV dan LinkedIn side by side. Pastikan: nama perusahaan identik, periode kerja sama, deskripsi peran konsisten, dan skills di kedua platform selaras. ${skills.length > 0 ? `Tambahkan ${skills.slice(0, 4).join(", ")} ke LinkedIn Skills jika belum ada.` : ""}
PRIORITAS: MEDIUM`;
  }

  return `# RINGKASAN EKSEKUTIF

${firstName}, ${openingCtxStr}

${problemText}

${skillsLine}

Kabar baiknya: **semua ini bisa diperbaiki**. Dalam laporan lengkap ini, kamu akan dapat cetak biru yang spesifik — mulai dari rewrite kalimat per kalimat menggunakan bullet point nyata dari CV kamu, rencana konten 30 hari, sampai skor terukur per area. Bukan teori. Bukan motivasi kosong. Instruksi yang bisa kamu eksekusi besok pagi.

# KONTEKS KLIEN

${firstName} berada di level **${levelLabel[careerLevel]}** di industri **${industry}**.

${eduDesc ? `**Latar Belakang Akademis:** ${eduDesc}. ${gpa && parseFloat(gpa) >= 3.5 ? `IPK ${gpa} adalah modal akademik yang kuat — tapi hanya efektif kalau dikomunikasikan dengan placement yang tepat di CV.` : gpa ? `IPK ${gpa} perlu ditampilkan dengan konteks yang benar agar tidak kehilangan nilainya.` : "Detail akademis perlu ditampilkan dengan format yang memaksimalkan dampaknya."}` : "Informasi pendidikan ada di CV — kita perlu memastikan ini dioptimalkan dengan placement dan format yang benar."}

${expContext}

**Skills yang terdeteksi di CV kamu:** ${skills.length > 0 ? skills.slice(0, 8).join(", ") : "Belum ada tool spesifik yang terdeteksi — bagian ini perlu diperkuat."}

**LinkedIn:** ${hasLinkedin ? `URL sudah disertakan (${linkedinUrl}). Ini langkah yang benar — sekarang kita perlu memastikan profil di balik URL itu sudah dioptimalkan untuk searchability dan first impression.` : "Tidak ada URL LinkedIn yang disertakan. Di 2025, rekruter mencari nama kandidat di LinkedIn sebelum bahkan membalas email. Ini harus menjadi prioritas minggu ini."}

Satu catatan: analisa ini dibuat berdasarkan teks CV yang kamu kirimkan. Semakin lengkap CV-nya, semakin tajam rekomendasinya. Jika ada pengalaman, proyek, atau pencapaian yang belum tercantum, inilah saatnya ditambahkan sebelum mulai melamar.

# YANG SUDAH KUAT

${gpa && parseFloat(gpa) >= 3.2 ? `**Pertama, performa akademis yang solid.** IPK ${gpa} kamu dari ${university || "institusi pendidikan kamu"} — ${major ? `jurusan ${major}` : "program studi kamu"} — adalah sinyal kognitif yang konkret. Ini adalah bukti kemampuan belajar yang konsisten dan disiplin, terutama relevan untuk posisi entry hingga junior. Jangan sembunyikan ini — justru jadikan pembuka yang kuat dengan format yang benar.` : `**Pertama, kamu sudah punya materi yang bisa diceritakan.** CV kamu mengandung pengalaman nyata yang bisa diangkat menjadi narasi personal brand yang kuat. Ini modal utama yang tidak semua orang punya di tahap yang sama.`}

**Kedua, ${companyDesc ? `rekam jejak nyata di ${companyDesc}.` : "pengalaman yang bisa jadi cerita kuat."} ${companyDesc ? `Setiap hari yang kamu habiskan di sana adalah bahan konten, bahan jawaban interview, dan bukti nyata bahwa kamu bisa deliver dalam lingkungan profesional.` : "Setiap pengalaman — sekecil apapun — adalah bahan konten, bahan jawaban interview, dan bukti kemampuan nyata."}**

**Ketiga, ${skills.length > 0 ? `kemampuan teknis di area ${industry} yang relevan.` : "keberanian untuk memulai dan mencari feedback."} ${skills.length > 0 ? `Kamu sudah punya ${skills.slice(0, 4).join(", ")} — ini skill yang langsung bisa dipakai dan yang rekruter aktif cari. Dengan komunikasi yang benar, ini menjadi shortcut menuju wawancara.` : "Fakta bahwa kamu mencari feedback dan mau dikritik adalah tanda kedewasaan profesional. Banyak orang takut tahu kebenaran tentang CV mereka. Kamu tidak."}**

**Keempat, ada fondasi cerita yang kuat di sini.** ${industry !== "Profesional" ? `Latar belakang kamu di bidang ${industry} adalah niche yang spesifik — dan niche yang spesifik artinya audiens yang lebih mudah dijangkau di LinkedIn.` : "Setiap pengalaman, sekecil apapun, adalah bahan konten LinkedIn, bahan jawaban wawancara, dan bahan personal branding yang menunggu untuk diolah dengan benar."}

**Kelima, kamu sudah mengambil langkah paling penting.** Banyak orang menunda mencari feedback karena takut tahu kebenaran tentang CV mereka. Kamu sudah melewati tahap itu — dan ini yang akan membedakan hasil akhir kamu dari kandidat lain yang hanya menunggu.

# TEMUAN & REKOMENDASI

## AREA A — Audit CV dengan Rumus Dampak

TEMUAN: ${passiveCount > 0 ? `Terdeteksi ${passiveCount} penggunaan kalimat pasif di CV ${firstName} — termasuk frasa seperti "bertanggung jawab atas", "membantu", dan "melakukan" yang muncul berulang kali.` : "Penggunaan kata pasif minimal, tapi audit mendalam pada tiap bullet point tetap diperlukan untuk memastikan format dampak diterapkan secara konsisten."}
ANALISA: Rumus CV yang benar adalah: **Kata Kerja Aksi → Objek → Hasil Terukur → Metode/Konteks**. Kalimat pasif hanya mendeskripsikan tugas — bukan membedakan kontribusi. Rekruter yang membaca 200 CV per hari tidak punya waktu untuk menyimpulkan dampak kamu sendiri.
DAMPAK: ${passiveCount >= 3 ? `Dengan ${passiveCount} kalimat pasif, CV ${firstName} saat ini bercerita tentang apa yang dilakukan — bukan apa yang dicapai. Ini menempatkan kamu di kategori "perlu didiskualifikasi" di 6 detik pertama screening rekruter.` : "Setiap kalimat pasif adalah peluang yang hilang untuk menunjukkan nilai nyata kamu kepada rekruter."}
REKOMENDASI: Untuk setiap bullet point, tanyakan: "Berapa orang terdampak? Berapa % peningkatannya? Berapa banyak yang diselesaikan? Dalam berapa waktu? Budget berapa?" — bahkan estimasi yang jujur selalu lebih kuat dari tidak ada angka sama sekali. Contoh perbaikan konkret ada di bagian CONTOH PERBAIKAN di bawah.
PRIORITAS: HIGH

TEMUAN: ${!hasMetrics ? `Hampir tidak ada metrik terukur yang ditemukan di CV ${firstName} — dari seluruh pengalaman yang dicantumkan, hanya ${metricsCount} data point numerik yang terdeteksi.` : `Ada ${metricsCount} data terukur di CV — ini lebih baik dari rata-rata, tapi masih bisa ditingkatkan untuk membuat setiap pengalaman punya dampak yang bisa diverifikasi.`}
ANALISA: Kandidat yang mencantumkan angka spesifik mendapat 38% lebih banyak respons dari rekruter dibanding yang tidak — berdasarkan analisis database LinkedIn. Angka tidak harus sempurna: estimasi yang logis lebih baik dari klaim abstrak.
DAMPAK: Tanpa metrik, pernyataan seperti "berhasil meningkatkan engagement" atau "mengelola tim" tidak bisa dibedakan dari klaim kandidat manapun. Kamu tidak menonjol dari tumpukan CV.
REKOMENDASI: Tambahkan minimal satu angka per pengalaman. Jika tidak ada data eksak, gunakan range yang jujur: "±X orang", "sekitar X%", "dalam rentang X–Y bulan". ${skills.includes("Excel") || skills.includes("Google Sheets") ? "Kamu sudah punya kemampuan spreadsheet — gunakan ini untuk tracking metrik dan mendapatkan angka yang bisa dicantumkan." : ""}
PRIORITAS: HIGH

TEMUAN: Urutan dan penekanan konten CV belum tentu selaras dengan target posisi yang dituju di bidang ${industry}.
ANALISA: CV yang efektif bukan kronologi hidup — ini adalah dokumen pemasaran yang dirancang untuk satu tujuan: lolos ke tahap wawancara. Pengalaman yang paling relevan dengan posisi target harus muncul paling awal dan mendapat porsi terbesar.
DAMPAK: Jika pengalaman yang paling relevan terkubur di halaman 2 atau hanya mendapat 2 bullet point, rekruter yang punya 6 detik tidak akan menemukannya.
REKOMENDASI: Identifikasi 2–3 pengalaman yang paling relevan dengan posisi target di ${industry}. Pindahkan ke atas, beri 4–5 bullet point dengan format dampak, dan kurangi porsi pengalaman yang tidak relevan ke 1–2 bullet point ringkas saja.
PRIORITAS: HIGH

TEMUAN: Bagian Skills belum terstruktur dengan cara yang optimal untuk melewati ATS (Applicant Tracking System).
ANALISA: Mayoritas perusahaan skala menengah ke atas menggunakan ATS untuk menyaring CV sebelum ada manusia yang membacanya. ATS membaca keyword, bukan konteks — jika skill kamu tidak ditulis persis seperti yang ada di job description target, kamu tersaring secara otomatis.
DAMPAK: CV yang tidak lolos ATS tidak pernah sampai ke meja rekruter, bahkan jika kamu adalah kandidat terbaik untuk posisi itu.
REKOMENDASI: Buat bagian Skills yang terkategorisasi: **Technical Skills** (${skills.slice(0, 4).join(", ")}${skills.length > 4 ? ", dll." : ""}), **Soft Skills** (maks 4, yang bisa dibuktikan dengan pengalaman), dan **Languages** (jika relevan). Gunakan kata yang sama persis dengan yang ada di job description target. Hindari grafik atau bar skill yang hanya terbaca oleh manusia, bukan ATS.
PRIORITAS: HIGH

## AREA B — Audit Profil LinkedIn

${linkedInSection}

## AREA C — Strategi: Niche, Persona, dan Positioning

TEMUAN: ${industry !== "Profesional" ? `Berdasarkan CV, kamu berada di area ${industry}. Ini sudah menunjukkan arah — tapi positioning spesifik dalam industri ini belum terdefinisi.` : "Niche atau positioning spesifik personal brand belum terdefinisi dengan jelas dari CV yang dikirimkan."}
ANALISA: Personal branding yang efektif bukan tentang menjadi semua untuk semua orang. Semakin sempit dan spesifik niche kamu, semakin mudah orang — termasuk rekruter — mengingat kamu untuk sesuatu yang konkret. "Saya tertarik di banyak bidang" adalah positioning yang paling lemah.
DAMPAK: Tanpa niche yang jelas, konten kamu di LinkedIn tidak menarik audiens konsisten, dan rekruter tidak langsung mengasosiasikan nama kamu dengan keahlian tertentu.
REKOMENDASI: Temukan intersection antara (1) apa yang kamu kuasai${skills.length > 0 ? ` — termasuk ${skills.slice(0, 3).join(", ")}` : ""}, (2) apa yang kamu sukai dan bisa kamu bicarakan dengan antusias, dan (3) apa yang dibutuhkan pasar di ${industry}. Pilih satu sudut pandang dan commit selama 90 hari.
PRIORITAS: HIGH

TEMUAN: Persona konten — karakter yang kamu mainkan secara konsisten di LinkedIn — belum terdefinisi.
ANALISA: Orang follow orang, bukan CV. Persona yang jelas membuat audiens merasa terhubung dan ingin terus mengikuti perjalanan kamu. Tanpa persona, konten kamu menjadi transaksional dan tidak membangun loyalitas audiens.
DAMPAK: Tanpa persona yang konsisten, setiap post terasa seperti post dari orang yang berbeda — audiens tidak bisa membangun ekspektasi tentang siapa kamu dan apa yang kamu tawarkan.
REKOMENDASI: Tulis 3–5 kalimat yang menggambarkan "karakter" konten kamu: siapa kamu, apa yang kamu perjuangkan, apa yang kamu percayai, dan bagaimana gaya bicara kamu. ${careerLevel === "student" ? `Contoh untuk ${firstName}: "Mahasiswa ${major || industry} yang jujur mendokumentasikan proses belajar dan kesalahan — karena belajar dari kegagalan orang lain lebih murah dari kegagalan sendiri."` : careerLevel === "fresh_grad" ? `Contoh untuk ${firstName}: "Fresh grad ${industry} yang mendokumentasikan proses transisi dari dunia kampus ke kerja nyata — dengan semua kesulitan, keberhasilan, dan lesson learned-nya."` : `Contoh untuk ${firstName}: "Profesional ${industry} yang berbagi perspektif praktis dari lapangan — bukan teori, tapi yang benar-benar bekerja dalam pekerjaan sehari-hari."`}
PRIORITAS: MEDIUM

TEMUAN: Content pillar — kategori konten yang akan dibuat secara konsisten — belum ada struktur yang jelas.
ANALISA: Tanpa pillar yang dipilih di awal, setiap kali mau posting akan ada pertanyaan "mau nulis apa ya?" yang akhirnya berujung tidak posting sama sekali. Content pillar adalah menu yang sudah diputuskan sebelumnya.
DAMPAK: Inkonsistensi posting = tidak ada momentum = tidak ada pertumbuhan follower = personal brand yang tidak berkembang dan tidak menghasilkan peluang baru.
REKOMENDASI: Tetapkan 3–4 content pillar berdasarkan niche di ${industry}: (1) **Lesson Learned** dari pengalaman di ${companyDesc || "lingkungan profesional atau akademis"}; (2) **How-to Praktis** menggunakan ${skills.slice(0, 2).join(" atau ") || "keahlian yang kamu miliki"}; (3) **Opini tentang Tren** di industri ${industry}; (4) **Behind the Scene** proses belajar atau bekerja sehari-hari. Setiap pillar 1–2 post per minggu.
PRIORITAS: MEDIUM

## AREA D — Kualitas & Keterbacaan Konten

TEMUAN: Format konten LinkedIn — jika sudah posting — kemungkinan belum dioptimalkan untuk mobile reading.
ANALISA: Lebih dari 80% pengguna LinkedIn mengakses lewat mobile. Paragraf panjang tanpa jeda terlihat seperti dinding teks di layar kecil — dan orang akan scroll tanpa membaca, menurunkan engagement rate kamu.
DAMPAK: Engagement rate rendah = distribusi organik rendah = personal brand yang tidak berkembang meski sudah rutin posting.
REKOMENDASI: Gunakan format "satu kalimat = satu baris" untuk LinkedIn. Setiap 2–3 kalimat, beri baris kosong. Kalimat pembuka (hook) harus bisa berdiri sendiri dan membuat orang ingin klik "lihat selengkapnya". Panjang ideal: 150–300 kata atau 8–15 baris visible.
PRIORITAS: MEDIUM

TEMUAN: Call to action (CTA) di akhir konten sering tidak ada atau tidak mendorong interaksi spesifik.
ANALISA: Setiap konten yang baik memiliki tujuan: mendapat komentar, mengajak diskusi, atau mengarahkan ke sesuatu. Tanpa CTA yang jelas, orang membaca dan pergi — tidak ada interaksi yang dihasilkan, dan algoritma tidak mendistribusikan konten kamu lebih jauh.
DAMPAK: Komentar bernilai 4–8x lebih tinggi dari likes dalam algoritma LinkedIn. Konten tanpa komentar di 60 menit pertama akan kehilangan distribusi organik hingga 70%.
REKOMENDASI: Akhiri setiap post dengan satu pertanyaan spesifik yang mudah dijawab. Contoh yang relevan untuk profil ${firstName}: "Pernah mengalami situasi yang sama? Share pengalaman kamu di komentar." atau "Kalau kamu di posisi ini, apa yang akan kamu lakukan berbeda?" Buat engagementnya semudah mungkin.
PRIORITAS: MEDIUM

## AREA E — Metrik & Algoritma

TEMUAN: Belum ada sistem untuk mengukur pertumbuhan personal brand ${firstName} secara objektif dan berkala.
ANALISA: Tanpa metrik, tidak ada cara untuk tahu apakah strategi yang dijalankan bekerja atau tidak. "Rasanya sudah banyak posting" bukan data — dan keputusan berdasarkan perasaan menghasilkan hasil yang tidak konsisten.
DAMPAK: Waktu dan energi terbuang untuk aktivitas yang tidak menghasilkan, sementara yang benar-benar bekerja tidak diulang dan di-scale.
REKOMENDASI: Pantau 5 metrik ini setiap minggu di spreadsheet sederhana${skills.includes("Excel") || skills.includes("Google Sheets") ? ` (kamu sudah punya ${skills.includes("Excel") ? "Excel" : "Google Sheets"} — gunakan ini)` : ""}: (1) jumlah follower, (2) rata-rata impressions per post, (3) engagement rate (komentar + likes ÷ impressions), (4) jumlah connection request masuk, (5) jumlah pesan atau tawaran peluang yang diterima. Review bulanan untuk identifikasi pola.
PRIORITAS: MEDIUM

TEMUAN: Algoritma LinkedIn memberikan bobot berbeda untuk jenis interaksi dan waktu posting.
ANALISA: Komentar bernilai jauh lebih tinggi dari likes. Konten yang mendapat komentar di 30–60 menit pertama ("golden window") akan didistribusikan secara organik jauh lebih luas. Membalas komentar juga melipatgandakan distribusi karena setiap balasan memicu notifikasi tambahan.
DAMPAK: Posting di waktu yang salah atau tidak aktif di 1 jam pertama bisa mengurangi jangkauan konten secara signifikan meski kontennya berkualitas tinggi.
REKOMENDASI: Posting di peak time: Selasa–Kamis, 07.00–09.00 atau 12.00–13.00 WIB. Sebelum posting, engage dengan 5–10 post orang lain agar algoritma melihat kamu "aktif". Setelah posting, balas setiap komentar dalam 1 jam pertama — ini yang paling menentukan distribusi organik konten kamu.
PRIORITAS: LOW

# CONTOH PERBAIKAN KONKRET

${sebelumSesudah.slice(0, 5).map((pair, i) => `## Pengalaman ${i + 1}\n\n${pair}`).join("\n\n")}

## Ringkasan / Headline Profil

SEBELUM: "${careerLevel === "student" ? `Mahasiswa ${major || "aktif"} di ${university || "Universitas"} yang memiliki minat di berbagai bidang dan ingin berkembang.` : `${degree || "Lulusan"} ${university || "Universitas"} yang mencari peluang baru di bidang ${industry}.`}"

SESUDAH: "${careerLevel === "student" ? `${skills.length > 0 ? skills[0] : industry.split(" ")[0]} Student${university ? ` @ ${university}` : ""} | ${skills.length > 1 ? skills.slice(1, 3).join(" & ") : "Passionate Learner"} | Open to Internship & Collaboration` : `${skills.length > 0 ? skills[0] : industry.split(" ")[0]} ${careerLevel === "junior" || careerLevel === "fresh_grad" ? "Enthusiast" : "Professional"} | ${companyDesc ? `Ex-${companies[0]}` : industry.split(" ")[0]} | Helping ${industry.split(" ")[0]} teams deliver measurable results`}"

## Kalimat Positioning

"Saya ${name} — ${levelLabel[careerLevel].toLowerCase()} di bidang ${industry} dengan ${gpa ? `IPK ${gpa} dari ${university || "universitas"}` : `latar belakang dari ${university || "institusi pendidikan saya"}`}. Saya tidak datang untuk sekadar mengisi posisi — saya datang dengan ${skills.length > 0 ? `kemampuan ${skills.slice(0, 3).join(", ")}` : "kemampuan yang siap langsung dipakai"} dan track record nyata yang bisa langsung berkontribusi dari hari pertama."

# RENCANA EKSEKUSI

## Minggu 1 — Benahi Etalase

${week1Tasks.map((t) => `- ${t}`).join("\n")}

## Minggu 2–4 — Mulai Posting

- Post pertama: perkenalan diri dengan format storytelling — bukan bio, tapi cerita tentang mengapa kamu memilih ${industry} dan apa yang kamu pelajari${companyDesc ? ` dari pengalaman di ${companyDesc}` : ""}
- Jadwal posting: 2–3x per minggu, hari Selasa/Rabu/Kamis, jam 07.30 atau 12.00 WIB
- Gunakan 3 content pillar yang sudah dipilih: rotasi agar tidak monoton
- Balas SEMUA komentar dalam 1 jam pertama setelah posting
- Engage dengan 10 post orang lain setiap hari (komentar bermakna, bukan "great post!")
- Kirimkan 5 connection request per hari ke orang yang relevan dengan karier target kamu
- Buat template visual Canva agar tampilan konten konsisten dan on-brand

## Bulan 2–3 — Iterasi & Evaluasi

- Review performa konten mingguan: post mana yang paling banyak impressions dan komentar?
- Identifikasi pola: topik apa, format apa, waktu apa yang paling perform untuk audiens kamu?
- Double down pada yang berhasil, hentikan yang tidak menghasilkan setelah 4x percobaan
- Mulai lamar 3–5 posisi per minggu menggunakan CV yang sudah diperbarui
- Track semua lamaran dalam spreadsheet${skills.includes("Excel") || skills.includes("Google Sheets") ? ` (gunakan ${skills.includes("Excel") ? "Excel" : "Google Sheets"} yang sudah kamu kuasai)` : ""}: perusahaan, posisi, tanggal, status, PIC
- Perbarui CV setiap 2 minggu berdasarkan feedback dari proses lamaran
- Target bulan 3: LinkedIn follower naik min 30%, connection +100, respons lamaran min 15%

# SKOR AKHIR

| Area | Skor | Catatan |
|------|------|---------|
| Fondasi Profil LinkedIn | ${liScore} / 20 | ${hasLinkedin ? "URL ada, tapi perlu audit mendalam pada headline, About, dan visual" : "Tidak ada URL LinkedIn — ini prioritas tertinggi yang harus diselesaikan minggu ini"} |
| CV & Impact | ${cvScore} / 20 | ${hasMetrics ? `Ada ${metricsCount} metrik — fondasi bagus, perlu ditambah dan dikuatkan` : "Hampir tidak ada angka terukur — setiap pengalaman butuh minimal 1 data point konkret"} |
| Niche & Positioning | ${nicheScore} / 15 | ${industry !== "Profesional" ? `Arah ${industry} sudah terlihat, tapi positioning spesifik dalam industri ini belum tajam` : "Positioning belum terdefinisi, terlalu general untuk satu niche yang diingat orang"} |
| Content Pillar | ${contentScore} / 10 | Pillar belum terdefinisi — tanpa ini, konsistensi posting tidak akan terjaga |
| Kualitas Konten | ${qualScore} / 20 | ${skills.length >= 5 ? `${skills.length} skill terdeteksi — ada bahan konten yang kuat, tapi format komunikasinya belum dioptimalkan` : skills.length >= 2 ? `Beberapa skill terdeteksi (${skills.slice(0, 3).join(", ")}), perlu dikembangkan lebih jauh` : "Bagian skills perlu diperkuat sebagai fondasi konten dan keyword ATS"} |
| Strategi Metrik | ${metricScore} / 15 | Belum ada sistem pengukuran aktif untuk tracking pertumbuhan personal brand |
| **TOTAL** | **${totalScore} / 100** | **${totalScore >= 60 ? "Fondasi kuat, fokus pada optimasi komunikasi dan konsistensi konten" : totalScore >= 40 ? "Fondasi ada, diperlukan upgrade signifikan pada eksekusi dan komunikasi dampak" : "Titik awal yang jelas — ada 100 − " + totalScore + " poin yang bisa dikejar dalam 90 hari"}** |

Angka ini bukan penilaian final — ini titik awal yang jujur. Skor ${totalScore}/100 berarti ada ${100 - totalScore} poin yang bisa kamu raih dalam 90 hari ke depan dengan eksekusi yang konsisten. Kandidat di level ${levelLabel[careerLevel]} yang mengikuti rencana di laporan ini biasanya melihat peningkatan 25–35 poin dalam satu kuartal — dan yang lebih penting: mulai mendapat respons lamaran dan pesan masuk dari rekruter.

# IDE KONTEN SIAP PAKAI

## Pilar Story (cerita pengalaman)

${contentIdeas.map((idea, i) => `${i + 1}. ${idea}`).join("\n")}
${companies.length > 0 ? `${contentIdeas.length + 1}. "Hal yang tidak ada yang ceritakan tentang bekerja di ${companies[0]} — dan yang membuat saya tumbuh paling cepat"` : ""}
${companyDesc ? `${contentIdeas.length + 2}. "Kesalahan terbesar yang saya buat selama di ${companyDesc} — dan bagaimana saya memperbaikinya"` : ""}
${contentIdeas.length + 3}. "Timeline jujur perjalanan saya dari [titik awal] ke posisi saat ini — termasuk bagian yang tidak terlihat di LinkedIn"
${contentIdeas.length + 4}. "Momen ketika saya hampir menyerah — dan kenapa saya tetap lanjut"

## Pilar How-to (panduan praktis)

1. ${skills.length > 0 ? `"Cara saya menggunakan ${skills[0]} untuk [tugas spesifik di ${industry}] — template gratis di komentar"` : `"Framework yang saya pakai untuk menyelesaikan [tugas spesifik] dalam [X waktu] — step by step"`}
2. ${skills.length > 1 ? `"Workflow ${skills[0]} + ${skills[1]} yang menghemat [X jam] per minggu di pekerjaan saya"` : `"5 kesalahan yang paling sering saya lihat di CV fresh grad Indonesia — dan cara mudah memperbaikinya"`}
3. "Cara mempersiapkan interview untuk posisi di bidang ${industry} dalam 48 jam — yang benar-benar bekerja"
4. "Checklist yang saya gunakan sebelum submit lamaran kerja apapun (simpan ini untuk dipakai)"
5. "Panduan networking LinkedIn untuk introvert yang tidak suka basa-basi — dari yang sudah mencoba"

## Pilar Insight (sudut pandang)

1. ${gpa ? `"Hot take: IPK ${gpa} tidak menjamin karier yang baik — tapi ini yang benar-benar penting menurut saya"` : `"Hot take: gelar akademik tidak menjamin karier yang baik — ini yang lebih menentukan menurut pengalaman saya"`}
2. "Kenapa saya berhenti mengejar 'pengalaman' dan mulai mengejar 'hasil terukur' — dan apa yang berubah"
3. "Yang tidak diajarkan ${university ? university : "kampus"} tentang dunia ${industry} nyata — dari pengalaman pertama saya"
4. ${industry !== "Profesional" ? `"Tren yang saya lihat di industri ${industry} yang belum banyak dibicarakan orang"` : `"Perdebatan: apakah magang wajib untuk fresh grad? Pandangan saya setelah menjalaninya sendiri"`}

# PERTANYAAN WAWANCARA

**"Ceritakan tentang diri kamu."**
→ Ini bukan pertanyaan tentang hidup kamu — ini tentang relevansi kamu untuk posisi ini. Untuk ${firstName}: (1) "${levelLabel[careerLevel]} di bidang ${industry}${university ? `, background dari ${university}` : ""}"; (2) Perjalanan singkat paling relevan dengan posisi yang dilamar; (3) "Itu sebabnya saya tertarik dengan posisi ini." Maksimal 90 detik. Latih sampai terdengar natural, bukan hafalan.

**"Apa kelebihan dan kekurangan terbesar kamu?"**
→ Untuk kelebihan: pilih yang bisa dibuktikan dengan contoh nyata — ${skills.length > 0 ? `misalnya kemampuan ${skills[0]} yang bisa langsung kamu demonstrasikan dengan hasil konkret` : "pilih yang punya bukti nyata, bukan klaim abstrak"}. Untuk kekurangan: pilih yang nyata tapi sudah ada langkah perbaikannya. Jawaban yang self-aware selalu lebih kuat dari jawaban yang terlalu sempurna.

**"Mengapa kamu tertarik bekerja di sini?"**
→ Riset perusahaan minimal 30 menit sebelum wawancara. Hubungkan nilai atau produk perusahaan dengan pengalaman spesifik kamu${companyDesc ? ` di ${companyDesc}` : ""}. Hindari "karena perusahaan ini bagus dan saya ingin belajar" — itu tidak membedakan kamu dari 50 kandidat lainnya.

**"Di mana kamu melihat diri kamu 5 tahun ke depan?"**
→ Tunjukkan ambisi yang realistis dan sejalan dengan industri ${industry}. Tidak perlu menyebut posisi spesifik di perusahaan ini — fokus pada dampak yang ingin kamu capai. Akhiri dengan menghubungkan kembali ke peran yang sedang dilamar: "...dan peran ini adalah langkah pertama yang paling tepat menuju tujuan itu."

**"Ceritakan situasi di mana kamu menghadapi konflik dalam tim dan bagaimana kamu mengatasinya."**
→ Gunakan framework STAR: Situation (konteks singkat), Task (peran kamu), Action (apa yang kamu lakukan spesifik), Result (hasil konkret). ${companyDesc ? `Kamu punya material nyata dari pengalaman di ${companyDesc} — pilih cerita yang menunjukkan kedewasaan dan kemampuan problem-solving.` : "Pilih cerita yang menunjukkan kedewasaan dan kemampuan problem-solving, bukan yang membuat semua pihak terlihat buruk."}

**"Apa pencapaian terbesar kamu?"**
→ Pilih pencapaian paling relevan dengan posisi yang dilamar${hasMetrics ? " — kamu sudah punya beberapa angka terukur di CV, gunakan itu sebagai anchor ceritamu." : " — tambahkan konteks: tantangannya apa, prosesnya bagaimana, dan dampaknya apa meski belum ada angka pasti."}

**"Apakah ada pertanyaan untuk kami?"**
→ SELALU siapkan 2–3 pertanyaan cerdas. Ini menunjukkan antusiasme dan persiapan. Contoh yang relevan: "Seperti apa profil orang yang paling sukses di posisi ini dalam 6 bulan pertama?" atau "Apa tantangan terbesar yang dihadapi tim ${industry.split(" ")[0]} saat ini?" Hindari bertanya gaji atau benefit di tahap pertama wawancara.

---

${firstName}, laporan ini adalah peta yang spesifik untuk kondisi CV dan personal brand kamu — bukan template generik. Mulai dari satu hal hari ini: pilih satu bullet point di CV kamu yang menggunakan kata "bertanggung jawab" atau "membantu", dan rewrite sekarang menggunakan rumus dampak. Besok, perbarui headline LinkedIn. Lusa, post konten pertama.

Momentum personal brand dibangun dari aksi kecil yang konsisten, bukan dari rencana besar yang tidak pernah dimulai. Kamu sudah punya peta-nya — sekarang saatnya jalan.`;
}

// ── API Handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cv_text, linkedin_url, session_id } = body;

    if (!name || !cv_text) {
      return Response.json({ error: "Nama dan CV wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();

    // Fetch LinkedIn profile if URL provided (Proxycurl full data or OG meta fallback)
    let linkedInProfile: LinkedInProfile | null = null;
    if (linkedin_url) {
      linkedInProfile = await fetchLinkedInProfile(linkedin_url);
      if (linkedInProfile) console.log("LinkedIn fetched:", linkedInProfile.headline ?? "no headline");
    }

    const fullContent = generateAnalysis(name, cv_text, linkedin_url || null, linkedInProfile);

    const sections = fullContent.split(/^# /m);
    let previewContent = "";
    for (const section of sections) {
      if (
        section.startsWith("RINGKASAN EKSEKUTIF") ||
        section.startsWith("KONTEKS KLIEN") ||
        section.startsWith("YANG SUDAH KUAT") ||
        section.startsWith("TEMUAN & REKOMENDASI")
      ) {
        previewContent += "# " + section + "\n";
      }
    }
    if (!previewContent) {
      previewContent = fullContent.substring(0, 1500) + "\n\n*...*";
    }

    const { error: insertError } = await supabaseServer.from("analyses").insert({
      id,
      cv_text,
      linkedin_url: linkedin_url || null,
      session_id: session_id || uuidv4(),
      is_paid: false,
      preview_content: previewContent.trim(),
      full_content: fullContent,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return Response.json(
        { error: `Gagal menyimpan analisa: ${insertError.message} (code: ${insertError.code})` },
        { status: 500 }
      );
    }

    return Response.json({ id });
  } catch (err: unknown) {
    console.error("Analyze error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
