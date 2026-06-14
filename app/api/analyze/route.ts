import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";
import { ApifyClient } from "apify-client";

export const maxDuration = 60;

// ── LinkedIn Profile ──────────────────────────────────────────────────────────

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseApifyDate(d: any): { year: number; month: number } | null {
  if (!d) return null;
  // already an object like { year, month }
  if (typeof d === "object" && d.year) return { year: Number(d.year), month: Number(d.month ?? 1) };
  const s = String(d);
  // "YYYY-MM" or "YYYY-MM-DD"
  const iso = s.match(/^(\d{4})-(\d{2})/);
  if (iso) return { year: parseInt(iso[1]), month: parseInt(iso[2]) };
  // "YYYY" only
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return { year: parseInt(yearOnly[1]), month: 1 };
  // "Month YYYY" e.g. "January 2020"
  const months: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const monthYear = s.match(/([a-zA-Z]{3,})\s+(\d{4})/);
  if (monthYear) {
    const m = months[monthYear[1].slice(0,3).toLowerCase()];
    if (m) return { year: parseInt(monthYear[2]), month: m };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApifyToProfile(item: any): LinkedInProfile {
  const firstName = item.firstName ?? "";
  const lastName = item.lastName ?? "";
  const fullNameFallback = [firstName, lastName].filter(Boolean).join(" ") || null;

  // experience can be nested under various keys
  const rawExp: any[] = item.experience ?? item.experiences ?? item.positions ?? item.workExperience ?? item.jobs ?? [];
  // education similar
  const rawEdu: any[] = item.education ?? item.educations ?? [];
  // skills: array of strings or objects
  const rawSkills: any[] = item.skills ?? item.skillEndorsements ?? [];

  return {
    full_name: item.name ?? item.fullName ?? item.full_name ?? fullNameFallback,
    headline: item.headline ?? item.title ?? item.currentPosition ?? null,
    summary: item.summary ?? item.about ?? item.description ?? item.bio ?? null,
    profile_pic_url: item.profilePicture ?? item.profilePicUrl ?? item.photo ?? item.avatar ?? item.image ?? null,
    background_cover_image_url: item.backgroundImage ?? item.coverImage ?? item.backgroundCoverImageUrl ?? null,
    connections: typeof item.connectionsCount === "number" ? item.connectionsCount
      : typeof item.connections === "number" ? item.connections
      : typeof item.connectionCount === "number" ? item.connectionCount
      : null,
    follower_count: typeof item.followersCount === "number" ? item.followersCount
      : typeof item.followers === "number" ? item.followers
      : typeof item.followerCount === "number" ? item.followerCount
      : null,
    experiences: rawExp.map((e: any) => ({
      company: e.company ?? e.companyName ?? e.organization ?? e.employer ?? null,
      title: e.title ?? e.position ?? e.role ?? e.jobTitle ?? null,
      description: e.description ?? e.summary ?? e.details ?? null,
      starts_at: parseApifyDate(e.startDate ?? e.start ?? e.from ?? e.startedAt ?? null),
      ends_at: parseApifyDate(e.endDate ?? e.end ?? e.to ?? e.endedAt ?? null),
    })),
    education: rawEdu.map((e: any) => ({
      school: e.school ?? e.schoolName ?? e.institution ?? e.university ?? null,
      degree_name: e.degree ?? e.degreeName ?? e.degreeType ?? null,
      field_of_study: e.fieldOfStudy ?? e.field ?? e.major ?? e.subject ?? null,
      starts_at: parseApifyDate(e.startDate ?? e.start ?? null),
      ends_at: parseApifyDate(e.endDate ?? e.end ?? null),
    })),
    skills: rawSkills
      .map((s: any) => (typeof s === "string" ? s : s.name ?? s.skill ?? s.text ?? ""))
      .filter((s: string) => s.length > 0),
    certifications: (item.certifications ?? item.licenses ?? []).map((c: any) => ({
      name: typeof c === "string" ? c : c.name ?? c.title ?? null,
    })),
    recommendations: item.recommendations ?? [],
  };
}

async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfile | null> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  const proxycurlKey = process.env.PROXYCURL_API_KEY;

  // Try Apify — harvestapi/linkedin-profile-search
  if (apifyToken) {
    // Normalize URL: ensure no trailing query params that confuse the actor
    let normalizedUrl = linkedinUrl.trim().replace(/\/+$/, "") + "/";

    // Try two common input formats that different versions of the actor accept
    const inputFormats = [
      { profileUrls: [normalizedUrl] },
      { startUrls: [{ url: normalizedUrl }] },
      { urls: [normalizedUrl] },
    ];

    for (const actorInput of inputFormats) {
      try {
        const client = new ApifyClient({ token: apifyToken });
        const run = await client.actor("harvestapi/linkedin-profile-search").call(
          actorInput,
          { waitSecs: 50, memory: 256 }
        );
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (items.length > 0) {
          console.log("[Apify] fetched with input:", JSON.stringify(actorInput));
          console.log("[Apify] raw keys:", Object.keys(items[0]).join(", "));
          return mapApifyToProfile(items[0]);
        }
        console.log("[Apify] empty result for input:", JSON.stringify(actorInput));
      } catch (err) {
        console.error("[Apify] error with input", JSON.stringify(actorInput), ":", err);
      }
    }
  }

  // Fallback: Proxycurl
  if (proxycurlKey) {
    try {
      const res = await fetch(
        `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&skills=include&extra=include`,
        { headers: { Authorization: `Bearer ${proxycurlKey}` }, signal: AbortSignal.timeout(15000) }
      );
      if (res.ok) return (await res.json()) as LinkedInProfile;
      console.error("[Proxycurl] error:", res.status, await res.text());
    } catch (err) {
      console.error("[Proxycurl] fetch error:", err);
    }
  }

  return null; // No key = checklist mode
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

  // CV / LinkedIn completeness
  const cvStatus = cvText.length > 3000 ? "LENGKAP" : cvText.length > 1000 ? "TERBATAS" : "BELUM ADA";
  const liStatus = !hasLinkedin
    ? "BELUM ADA"
    : linkedInProfile
    ? "TERBATAS (data otomatis)"
    : "TERBATAS (URL ada, belum diverifikasi)";

  const levelLabel: Record<CareerLevel, string> = {
    student: "Mahasiswa / Pelajar Aktif",
    fresh_grad: "Fresh Graduate",
    junior: "Early Career Professional (1–3 Tahun)",
    mid: "Mid-Level Professional (3–7 Tahun)",
    senior: "Senior Professional / People Manager (7+ Tahun)",
  };

  // Build personalized strings
  const eduParts: string[] = [];
  if (university) eduParts.push(university);
  if (major) eduParts.push(major);
  if (degree) eduParts.push(degree);
  if (gpa) eduParts.push(`IPK ${gpa}`);
  const eduDesc = eduParts.length > 0 ? eduParts.join(" — ") : null;

  const companyDesc =
    companies.length >= 2 ? `${companies[0]} dan ${companies[1]}` : companies.length === 1 ? companies[0] : null;

  // Problem list
  const problemList: string[] = [];
  if (passiveCount >= 3) {
    problemList.push(
      `**${passiveCount} kalimat pasif** — frasa seperti "bertanggung jawab atas", "membantu tim", dan "melakukan" muncul berulang. Rekruter mencari dampak, bukan deskripsi tugas`
    );
  } else if (passiveCount > 0) {
    problemList.push(
      `**${passiveCount} kalimat pasif perlu di-rewrite** — rumus dampak yang benar: Kata Kerja Aksi + Objek + Hasil Terukur + Konteks`
    );
  }
  if (!hasMetrics) {
    problemList.push(
      `**Hampir tidak ada angka atau metrik** di seluruh CV — tanpa data kuantitatif, rekruter tidak bisa membandingkan kontribusimu dengan kandidat lain`
    );
  } else if (metricsCount < 5) {
    problemList.push(
      `**Hanya ${metricsCount} data terukur** ditemukan — idealnya setiap pengalaman punya minimal satu angka konkret`
    );
  }
  if (!hasLinkedin) {
    problemList.push(
      `**Tidak ada URL LinkedIn** yang disertakan — di 2025, rekruter mencari kandidat di LinkedIn sebelum membalas email`
    );
  }
  if (skills.length < 4) {
    problemList.push(
      `**Bagian Skills perlu diperkuat** — tool dan kemampuan teknis spesifik adalah keyword yang dibaca ATS sebelum rekruter manusia melihat CV`
    );
  }

  // Opening sentence
  const openingParts: string[] = [];
  if (eduDesc) openingParts.push(`latar belakang dari ${eduDesc}`);
  if (companyDesc) openingParts.push(`pengalaman di ${companyDesc}`);
  if (skills.length > 0) openingParts.push(`skill seperti ${skills.slice(0, 3).join(", ")}`);
  const openingCtxStr =
    openingParts.length > 0
      ? `Saya sudah baca CV kamu dari atas ke bawah — termasuk ${openingParts.join(", ")}. Ada hal penting yang perlu kita bahas sekarang.`
      : `Saya sudah baca CV kamu dari atas ke bawah. Ada hal penting yang perlu kita bahas.`;

  // Scores
  const liScore = hasLinkedin ? (linkedInProfile ? 12 : 9) : 4;
  const cvScore = hasMetrics ? (metricsCount >= 5 ? 14 : 10) : 6;
  const nicheScore = industry !== "Profesional" ? 8 : 5;
  const contentScore = 4;
  const qualScore = skills.length >= 5 ? 13 : skills.length >= 2 ? 10 : 6;
  const metricScore = hasMetrics ? (metricsCount >= 5 ? 9 : 6) : 3;
  const totalScore = liScore + cvScore + nicheScore + contentScore + qualScore + metricScore;

  // Headline example
  const skill1 = skills.length > 0 ? skills[0] : industry.split(" & ")[0];
  const skill2 = skills.length > 1 ? skills[1] : industry.split(" & ").slice(-1)[0];
  const exampleHeadline = `${skill1} ${careerLevel === "student" || careerLevel === "fresh_grad" ? "| Fresh Graduate" : "Professional"} | ${skill2} | ${industry.split(" & ")[0]}`;

  // ── LinkedIn section (LEVEL 1) ────────────────────────────────────────────
  let linkedInSection: string;
  if (!hasLinkedin) {
    linkedInSection = `### Audit LinkedIn ${firstName} — Status: BELUM ADA

**TEMUAN:** Tidak ada URL LinkedIn yang disertakan dalam CV ${firstName}.

**ANALISA:** LinkedIn adalah mesin pencari personal brand nomor satu. Rekruter aktif menggunakan boolean search untuk menemukan kandidat secara proaktif — artinya mereka datang ke kamu, bukan menunggu lamaranmu. Tanpa profil publik yang teroptimasi, kamu tidak ada di radar mereka.

**DAMPAK:** Kandidat tanpa LinkedIn kehilangan 70%+ peluang dari rekruter yang mencari secara aktif. Ketika rekruter mencari namamu di Google, tidak ada aset digital yang mendukung narasi CV.

**REKOMENDASI:** Buat profil LinkedIn hari ini. Nama lengkap persis seperti di CV. Dalam 48 jam pertama selesaikan: foto profil, headline, About (pakai draf di 4C), pengalaman dari CV, dan Skills.

Headline langsung yang bisa dipakai: *"${exampleHeadline}"*

**PRIORITAS: 🔴 SANGAT TINGGI**

---

**TEMUAN:** Lima area LinkedIn wajib dioptimalkan segera.

**ANALISA:** Profil LinkedIn yang kosong atau setengah jadi memberi kesan negatif. Rekruter yang mengklik akan langsung menutup tab jika tidak menemukan isi yang menarik.

**DAMPAK:** Profil kosong = kesan ketidakprofesionalan yang tidak bisa diperbaiki di tahap selanjutnya.

**REKOMENDASI:** Urutan pengerjaan:
1. **Foto profil** — latar bersih, ekspresi natural, pakaian sesuai industri ${industry}
2. **Headline** — gunakan opsi di bagian 4B
3. **Banner** — buat di Canva, 1584×396px, cantumkan tagline dan ${skills.length > 0 ? skills.slice(0, 2).join("/") : "keahlian utama"}
4. **About** — gunakan draf di bagian 4C
5. **Skills** — minimal 10 skill, minta endorsement dari 3+ koneksi

**PRIORITAS: 🔴 SANGAT TINGGI**`;
  } else if (linkedInProfile) {
    const liHeadline = linkedInProfile.headline || "(kosong)";
    const headlineNote = !linkedInProfile.headline
      ? "Headline **kosong** — ini yang pertama dilihat rekruter di search result LinkedIn."
      : linkedInProfile.headline.length < 60
      ? `Hanya ${linkedInProfile.headline.length} karakter — jauh dari 220 karakter yang tersedia.`
      : "Perlu dicek apakah mengkomunikasikan nilai nyata, bukan sekadar jabatan.";
    const aboutStatus = linkedInProfile.summary
      ? `sudah diisi: *"${linkedInProfile.summary.slice(0, 200)}${linkedInProfile.summary.length > 200 ? "..." : ""}"* — perlu dicek kekuatan hook di kalimat pertama`
      : "**KOSONG** — ini real estate terbaik yang belum dimanfaatkan";
    const photoStatus = linkedInProfile.profile_pic_url ? "terdeteksi ✓" : "tidak terdeteksi — perlu dicek";
    const bannerStatus = linkedInProfile.background_cover_image_url
      ? "terdeteksi ✓ — pastikan on-brand"
      : "tidak terdeteksi — kemungkinan masih default biru LinkedIn";

    linkedInSection = `### Audit LinkedIn ${firstName} — Data Profil Terdeteksi

**TEMUAN:** Headline LinkedIn saat ini: *"${liHeadline}"*. ${headlineNote}

**ANALISA:** Headline muncul di search result LinkedIn dan notifikasi koneksi. Formula efektif: [Keahlian Utama] | [Nilai yang Kamu Bawa] | [Target Industri/Posisi].

**DAMPAK:** Headline yang dioptimalkan menghasilkan 40% lebih banyak klik profil dari pencarian rekruter.

**REKOMENDASI:** Ganti${linkedInProfile.headline ? ` dari "${linkedInProfile.headline}"` : ""} ke salah satu opsi di bagian 4B. Opsi cepat: *"${exampleHeadline}"*

**PRIORITAS: 🔴 TINGGI**

---

**TEMUAN:** Bagian About: ${aboutStatus}

**ANALISA:** Bagian About adalah 2.600 karakter real estate terbaik di LinkedIn. Kalimat pembuka menentukan apakah rekruter klik "lihat selengkapnya" atau scroll.

**DAMPAK:** About yang kosong atau hook yang lemah membuat ${firstName} tidak terbedakan dari ratusan kandidat lain.

**REKOMENDASI:** Gunakan draf di bagian 4C. Struktur: WHO → WHAT → WHY → CTA.

**PRIORITAS: 🔴 TINGGI**

---

**TEMUAN:** Foto profil: ${photoStatus}. Banner: ${bannerStatus}.

**ANALISA:** Profil dengan foto profesional mendapat 21× lebih banyak dilihat. Banner adalah iklan gratis 1584×396px yang mayoritas pengguna biarkan default.

**DAMPAK:** Kesan pertama terjadi secara visual dalam <1 detik — sebelum rekruter membaca satu kata dari headline.

**REKOMENDASI:** Foto: latar bersih, pakaian sesuai ${industry}, ekspresi natural, min 400×400px. Banner: Canva 1584×396px dengan tagline dan ${skills.length > 0 ? skills.slice(0, 2).join("/") : "keahlian utama"}.

**PRIORITAS: 🟡 SEDANG**

---

**TEMUAN:** Skills LinkedIn: ${linkedInProfile.skills && linkedInProfile.skills.length > 0 ? `terdeteksi ${linkedInProfile.skills.length} skill — ${linkedInProfile.skills.slice(0, 6).join(", ")}` : "belum terdeteksi atau kosong"}.

**ANALISA:** Skills section adalah keyword yang dibaca rekruter saat boolean search. Tanpa ini, profil tidak muncul di pencarian spesifik.

**DAMPAK:** Skills kosong = tidak terindeks untuk pencarian spesifik = kehilangan peluang yang tidak pernah disadari.

**REKOMENDASI:** ${linkedInProfile.skills && linkedInProfile.skills.length > 0 ? `Sinkronkan dengan CV: ${skills.length > 0 ? skills.slice(0, 5).join(", ") : "tool teknis utama"}. Tambahkan yang belum ada.` : `Tambahkan minimal 10 skill: ${skills.length > 0 ? skills.slice(0, 6).join(", ") : "tool teknis yang dikuasai"}. Minta endorsement dari 3+ koneksi.`}

**PRIORITAS: 🟡 SEDANG**

---

${(() => {
  // Deep audit of LinkedIn experiences
  if (!linkedInProfile.experiences || linkedInProfile.experiences.length === 0) {
    return `**TEMUAN:** Bagian Pengalaman di LinkedIn tidak terdeteksi atau kosong.\n\n**ANALISA:** Bagian Pengalaman adalah konten paling sering dibuka rekruter setelah headline. Tanpa ini, profil terlihat seperti akun baru yang tidak credible.\n\n**REKOMENDASI:** Salin minimal 3 posisi dari CV ke LinkedIn. Gunakan format dampak dari bagian 4D — bukan sekadar copy-paste CV lama.\n\n**PRIORITAS: 🔴 SANGAT TINGGI**`;
  }

  const expAuditRows = linkedInProfile.experiences.map((exp, i) => {
    const role = exp.title || "(jabatan tidak diisi)";
    const company = exp.company || "(perusahaan tidak diisi)";
    const desc = exp.description || "";
    const hasDesc = desc.length > 0;
    const hasNumbers = /\d/.test(desc);
    const isPassive = /\b(bertanggung jawab|bertanggungjawab|membantu|melakukan|melaksanakan|responsible for|assist|participated)\b/i.test(desc);
    const isShort = hasDesc && desc.length < 80;
    const period = (() => {
      const sy = exp.starts_at?.year;
      const ey = exp.ends_at?.year;
      if (!sy) return "-";
      return ey ? `${sy}–${ey}` : `${sy}–sekarang`;
    })();
    const status = !hasDesc ? "❌ Kosong" : isShort ? "⚠️ Terlalu singkat" : isPassive ? "⚠️ Pasif" : !hasNumbers ? "⚠️ Tanpa angka" : "✅ OK";
    return `| ${i + 1} | ${role} @ ${company} | ${period} | ${status} | ${!hasDesc ? "Tambahkan deskripsi segera" : isPassive ? "Ganti kata kerja pasif" : !hasNumbers ? "Tambahkan minimal 1 angka" : "Pertahankan, cek keyword ATS"} |`;
  }).join("\n");

  const expRewrites = linkedInProfile.experiences.slice(0, 5).map((exp, i) => {
    const role = exp.title || "Jabatan";
    const company = exp.company || "Perusahaan";
    const desc = exp.description || "";
    const after = desc.length > 0
      ? transformWeakBullet(desc.split(/[.\n]/)[0].trim() || desc.slice(0, 120))
      : `Mengeksekusi tanggung jawab sebagai ${role} di ${company} — [tambahkan: hasil terukur, jumlah orang terdampak, % peningkatan, atau budget yang dikelola]`;
    return `**Pengalaman ${i + 1}: ${role} @ ${company}**\n\n> **SEBELUM (LinkedIn saat ini):** "${desc.slice(0, 200) || "(deskripsi kosong)"}${desc.length > 200 ? "..." : ""}"\n\n> **SESUDAH:** "${after}"\n`;
  }).join("\n---\n\n");

  const totalExp = linkedInProfile.experiences.length;
  const emptyDesc = linkedInProfile.experiences.filter(e => !e.description || e.description.length === 0).length;
  const passiveDesc = linkedInProfile.experiences.filter(e => e.description && /\b(bertanggung jawab|membantu|melakukan|responsible for|assist)\b/i.test(e.description)).length;
  const noNumbers = linkedInProfile.experiences.filter(e => e.description && !/\d/.test(e.description)).length;

  return `**TEMUAN:** ${totalExp} pengalaman kerja terdeteksi di LinkedIn ${firstName}. Ringkasan kualitas deskripsi:

| # | Posisi | Periode | Status | Tindakan |
|---|--------|---------|--------|----------|
${expAuditRows}

**Ringkasan masalah:**
- ${emptyDesc} dari ${totalExp} pengalaman **tidak ada deskripsi sama sekali**
- ${passiveDesc} dari ${totalExp} pengalaman **menggunakan kalimat pasif**
- ${noNumbers} dari ${totalExp} pengalaman **tidak ada angka/metrik**

**ANALISA:** Rekruter yang mengklik profil LinkedIn ${firstName} dan membuka tab Pengalaman akan melihat ${emptyDesc > 0 ? `${emptyDesc} posisi tanpa deskripsi apapun — ini mengirim sinyal bahwa kandidat tidak serius mengoptimalkan profil.` : "deskripsi yang perlu ditingkatkan dari sisi dampak dan metrik."}

**DAMPAK:** Deskripsi pengalaman di LinkedIn bukan sekadar duplikasi CV — ini adalah narasi yang bisa lebih panjang, lebih personal, dan dioptimalkan untuk keyword pencarian rekruter.

**REKOMENDASI — Rewrite Setiap Deskripsi Pengalaman LinkedIn:**

${expRewrites}

**PRIORITAS: 🔴 SANGAT TINGGI**`;
})()}

${(() => {
  if (!linkedInProfile.connections && !linkedInProfile.follower_count) return "";
  const conn = linkedInProfile.connections ?? 0;
  const foll = linkedInProfile.follower_count ?? 0;
  const connLabel = conn >= 500 ? "500+" : conn >= 100 ? "100–499" : conn > 0 ? `${conn}` : "tidak terdeteksi";
  const connAdvice = conn >= 500
    ? "Network sudah solid. Fokus pada kualitas konten untuk mengkonversi koneksi menjadi peluang aktif."
    : conn >= 100
    ? "Network sedang berkembang. Target tambah 50 koneksi relevan per bulan dari rekruter dan senior di industri."
    : "Network masih sangat terbatas. Kirim 10 connection request per hari ke rekruter, alumni, dan profesional di industri yang sama.";
  return `---

**TEMUAN:** Koneksi LinkedIn: **${connLabel}**${foll > 0 ? `. Follower: **${foll}**` : ""}.

**ANALISA:** Koneksi 500+ memberi sinyal kredibilitas sosial yang dibaca rekruter secara tidak sadar. Follower count yang tinggi menunjukkan konten punya distribusi organik.

**REKOMENDASI:** ${connAdvice}

**PRIORITAS: 🟡 SEDANG**`;
})()}`;
  } else {
    linkedInSection = `### Audit LinkedIn ${firstName} — URL Ada, Data Perlu Verifikasi Manual

**TEMUAN:** URL LinkedIn disertakan (${linkedinUrl}). Data profil tidak bisa diakses otomatis — audit berdasarkan checklist standar.

**ANALISA:** Lima area menentukan apakah rekruter mau mengklik profil: headline, foto, banner, About, dan Skills.

**DAMPAK:** Profil yang tidak dioptimalkan sama buruknya dengan tidak punya profil.

**REKOMENDASI:** Buka profil LinkedIn sekarang dan cek satu per satu:
1. ✅/❌ **Headline** — pakai formula [Keahlian] | [Nilai] | [Industri]? Contoh: *"${exampleHeadline}"*
2. ✅/❌ **About** — ada hook kuat di 2 kalimat pertama?
3. ✅/❌ **Foto** — profesional, latar bersih?
4. ✅/❌ **Banner** — bukan default biru LinkedIn?
5. ✅/❌ **Skills** — minimal 10 skill relevan terdaftar?

Gunakan draf di bagian 4B dan 4C sebagai baseline.

**PRIORITAS: 🔴 TINGGI**

---

**TEMUAN:** Sinkronisasi CV ↔ LinkedIn perlu diverifikasi manual.

**ANALISA:** Rekruter sering membuka CV dan LinkedIn bersamaan. Inkonsistensi — jabatan berbeda, periode kerja berbeda, skill tidak selaras — menciptakan keraguan tentang kredibilitas.

**DAMPAK:** Inkonsistensi kecil sekalipun bisa menjadi alasan penolakan yang tidak pernah dikomunikasikan.

**REKOMENDASI:** Buka CV dan LinkedIn side by side. Pastikan: nama perusahaan identik, periode kerja sama, deskripsi konsisten, skills selaras. ${skills.length > 0 ? `Tambahkan ${skills.slice(0, 4).join(", ")} ke LinkedIn Skills jika belum.` : ""}

**PRIORITAS: 🟡 SEDANG**`;
  }

  // ── LEVEL 2: CV bullet rewrites ─────────────────────────────────────────
  const bulletsToRewrite = allBullets.slice(0, 20);
  const bulletRewrites = bulletsToRewrite.map((bullet, i) => {
    const transformed = transformWeakBullet(bullet);
    const isWeak = weakBullets.some((w) => w.toLowerCase() === bullet.toLowerCase());
    return `**Poin ${i + 1}:**

> **SEBELUM:** "${bullet}"

> **SESUDAH:** "${transformed}"

*Catatan: ${isWeak ? "Kalimat pasif — ubah kata kerja pertama menjadi kata kerja dampak, lalu tambahkan angka." : "Struktur sudah lebih aktif — pastikan ada minimal satu angka atau metrik konkret."}*`;
  });

  if (bulletRewrites.length === 0) {
    bulletRewrites.push(
      `**Poin 1 (Contoh):**\n\n> **SEBELUM:** "Bertanggung jawab atas pembuatan konten media sosial dan koordinasi acara"\n\n> **SESUDAH:** "Memproduksi [X] konten media sosial per bulan untuk [nama organisasi], menghasilkan pertumbuhan engagement [X]% dalam [X bulan] — [tambahkan angka nyata]"\n\n*Catatan: Ubah setiap bullet di CVmu menggunakan pola ini.*`,
      `**Poin 2 (Contoh):**\n\n> **SEBELUM:** "Membantu tim dalam pelaksanaan program kerja divisi"\n\n> **SESUDAH:** "Mengkoordinasikan [X] anggota tim dalam eksekusi [X] program kerja — [X]% diselesaikan tepat waktu dalam periode [bulan-bulan]"\n\n*Catatan: "Membantu" tidak menunjukkan kontribusi spesifikmu.*`,
      `**Poin 3 (Contoh):**\n\n> **SEBELUM:** "Melakukan presentasi dan membuat laporan untuk keperluan akademik"\n\n> **SESUDAH:** "Mempresentasikan hasil analisis kepada audiens [X orang] dan menghasilkan [X] laporan yang digunakan untuk [keputusan konkret]"\n\n*Catatan: "Melakukan" selalu bisa diganti kata kerja yang lebih spesifik.*`
    );
  }

  // ── Hook bank (15 hooks) ──────────────────────────────────────────────────
  const hookRows = [
    { no: 1, hook: `Saya habiskan ${careerLevel === "student" ? "4 tahun kuliah" : "bertahun-tahun"} belajar ${industry.split(" & ")[0]} — dan ini yang tidak ada yang ajarkan:`, tipe: "Pengungkapan" },
    { no: 2, hook: `Hot take: [pernyataan kontroversi tentang ${industry}]. Dan ini alasannya:`, tipe: "Opini Berani" },
    { no: 3, hook: `${gpa ? `IPK ${gpa}` : "Nilai sempurna"} tidak mengajarkan saya cara [skill kritis di ${industry}]. Ini yang mengajarkan saya:`, tipe: "Pengalaman Jujur" },
    { no: 4, hook: `Sebelum masuk ${industry}, saya wish tahu hal ini. Sekarang saya share:`, tipe: "Wishlist" },
    { no: 5, hook: `Saya pernah ditolak [X kali]. Baru sadar masalahnya bukan skill, tapi cara presentasinya. Thread:`, tipe: "Kerentanan" },
    { no: 6, hook: `Checklist yang saya gunakan sebelum submit lamaran ke perusahaan ${industry} (simpan ini):`, tipe: "Resource" },
    { no: 7, hook: `${companyDesc ? `Di ${companyDesc}` : "Di pekerjaan pertama saya"}, ada satu pelajaran yang tidak bisa dapat dari kelas manapun:`, tipe: "Story" },
    { no: 8, hook: `3 hal yang recruiter ${industry} tidak akan ceritakan ke kamu — tapi sangat mempengaruhi hasil lamaranmu:`, tipe: "Rahasia Industri" },
    { no: 9, hook: `Framework [X langkah] yang saya pakai untuk [tugas spesifik di ${industry}] — gratis di komentar:`, tipe: "How-to" },
    { no: 10, hook: `Tren ${industry} yang akan mendominasi tahun depan — dan cara posisikan diri sekarang:`, tipe: "Tren & Prediksi" },
    { no: 11, hook: `${skills.length > 0 ? skills[0] : `Skill kunci di ${industry}`} bukan tentang tekniknya — tapi tentang cara menggunakannya untuk [outcome]. Penjelasannya:`, tipe: "Reframing" },
    { no: 12, hook: `Saya compare dua pendekatan selama [X bulan]. Hasilnya mengejutkan:`, tipe: "Eksperimen" },
    { no: 13, hook: `Pertanyaan yang saya wish tanyakan ke diri sendiri 2 tahun lalu:`, tipe: "Refleksi" },
    { no: 14, hook: `Orang sukses di ${industry} tidak hanya kerja keras — mereka kerja dengan sistem ini:`, tipe: "Sistem" },
    { no: 15, hook: `Hari ini saya share sesuatu yang tidak nyaman diakui. Tapi mungkin kamu butuh dengar ini:`, tipe: "Keberanian" },
  ];

  // ── Content calendar 4 weeks ──────────────────────────────────────────────
  const calendarRows = [
    { minggu: 1, hari: "Selasa", tipe: "Story / Perkenalan", topik: `Siapa ${firstName} — bukan bio, tapi cerita mengapa memilih ${industry}`, format: "Text post 150–250 kata", cta: "Tag seseorang yang sedang di fase yang sama" },
    { minggu: 1, hari: "Kamis", tipe: "How-to / Resource", topik: `${skills.length > 0 ? `Cara menggunakan ${skills[0]} untuk [tugas spesifik]` : "Checklist yang saya pakai sebelum submit lamaran"}`, format: "List / numbered", cta: "Save jika berguna, share ke yang butuh" },
    { minggu: 2, hari: "Selasa", tipe: "Lesson Learned", topik: `Pelajaran terbesar dari${companyDesc ? ` ${companyDesc}` : " pengalaman pertama"}`, format: "Text post 200–300 kata", cta: "Kamu pernah pelajaran serupa? Cerita di komentar" },
    { minggu: 2, hari: "Kamis", tipe: "Opini / Hot Take", topik: `Hot take tentang ${industry} yang tidak populer tapi saya percaya`, format: "Text pendek + visual", cta: "Setuju atau tidak? Kenapa?" },
    { minggu: 3, hari: "Selasa", tipe: "Behind the Scene", topik: "Proses saya [mengerjakan X] — dari awal sampai selesai", format: "Text + foto/screenshot", cta: "Ada yang mau tahu lebih detail?" },
    { minggu: 3, hari: "Kamis", tipe: "How-to / Framework", topik: `Framework [X langkah] untuk [masalah spesifik di ${industry}]`, format: "Carousel / numbered list", cta: "Tag rekan yang butuh ini" },
    { minggu: 4, hari: "Selasa", tipe: "Refleksi / Update", topik: "30 hari pertama rutin posting LinkedIn — ini yang saya pelajari", format: "Text post 250–350 kata", cta: "Follow untuk update bulan berikutnya" },
    { minggu: 4, hari: "Kamis", tipe: "Engagement / Q&A", topik: `Pertanyaan terbuka: apa tantangan terbesar di ${industry} yang sedang kamu hadapi?`, format: "Text pendek + pertanyaan", cta: "Jawab di komentar — saya balas semua" },
  ];

  // ── Week 1 tasks ─────────────────────────────────────────────────────────
  const week1Tasks: string[] = [];
  if (!hasLinkedin) {
    week1Tasks.push("Buat profil LinkedIn hari ini — nama lengkap persis seperti di CV. Ini non-negotiable di 2025");
  } else {
    week1Tasks.push("Perbarui headline LinkedIn menggunakan salah satu opsi dari bagian 4B");
  }
  week1Tasks.push("Upload foto profil profesional dan buat banner custom di Canva (1584×396px)");
  week1Tasks.push("Salin draf About dari bagian 4C dan sesuaikan dengan detail nyata");
  week1Tasks.push(`Rewrite ${Math.min(allBullets.length > 0 ? allBullets.length : 5, 10)} bullet point CV menggunakan rumus dampak dari bagian 4D`);
  if (gpa && parseFloat(gpa) >= 3.2) {
    week1Tasks.push(`Pastikan IPK ${gpa} dan ${university || "nama universitas"} muncul jelas di CV dan LinkedIn`);
  }
  const skillGap = 10 - Math.min(skills.length, 10);
  if (skillGap > 0) {
    week1Tasks.push(`Tambahkan ${skillGap} skill ke LinkedIn Skills section — mulai dari ${skills.slice(0, 3).join(", ") || "tool teknis yang dikuasai"}`);
  } else {
    week1Tasks.push("Minta endorsement dari 3+ koneksi untuk skills yang sudah terdaftar di LinkedIn");
  }
  week1Tasks.push("Simpan CV versi baru: format PDF, nama file [NamaLengkap]_CV_[BulanTahun].pdf");
  week1Tasks.push("Minta 2–3 rekomendasi LinkedIn dari orang yang pernah bekerja atau berorganisasi bersama");

  // ── Build document ───────────────────────────────────────────────────────

  return `# CARA MEMBACA DOKUMEN INI

Dokumen ini bukan laporan akademis. Ini adalah peta kerja — detail, spesifik, dan dibuat khusus untuk ${firstName}.

**Dua konvensi penting:**

1. **[ANGKA]** — Ketika kamu melihat placeholder seperti [X orang] atau [X%], itu adalah instruksi eksplisit untuk mengisi dengan data nyata dari pengalamanmu sendiri. Estimasi yang jujur selalu lebih kuat dari klaim abstrak.

2. **PROVISIONAL** — Bagian yang ditandai PROVISIONAL dibuat berdasarkan profil LinkedIn yang tidak dapat diverifikasi sepenuhnya. Cek dan sesuaikan dengan kondisi aktual profilmu.

Cara optimal menggunakan dokumen ini: baca sekali dari awal sampai akhir, lalu kembali ke bagian 4D dan eksekusi satu bullet point per hari. Momentum dibangun dari aksi kecil yang konsisten.

---

# INVENTARIS INPUT & KONTEKS KLIEN

| Input | Status | Catatan |
|-------|--------|---------|
| CV | **${cvStatus}** | ${cvText.length > 3000 ? `${Math.round(cvText.length / 100) * 100} karakter terdeteksi — data cukup untuk analisa mendalam` : cvText.length > 1000 ? "CV ada tapi belum lengkap — beberapa seksi mungkin perlu ditambah" : "CV sangat singkat — analisa terbatas, rekomendasi bersifat umum"} |
| LinkedIn | **${liStatus}** | ${!hasLinkedin ? "Tidak ada URL LinkedIn — prioritas untuk dibuat segera" : linkedInProfile ? "Profil terdeteksi — headline, About, dan skills berhasil diambil" : "URL ada tapi profil tidak bisa diakses otomatis — rekomendasi berdasarkan checklist"} |

**Konteks Klien:**

| Parameter | Detail |
|-----------|--------|
| Nama | ${name} |
| Level Karir | ${levelLabel[careerLevel]} |
| Industri Terdeteksi | ${industry} |
| Pendidikan | ${eduDesc || "Tidak terdeteksi di CV"} |
| Perusahaan Utama | ${companyDesc || companies.join(", ") || "Tidak terdeteksi"} |
| Skills Utama | ${skills.slice(0, 6).join(", ") || "Perlu diperkuat"} |
| Jumlah Bullet Point | ${allBullets.length} poin terdeteksi |
| Kalimat Pasif | ${passiveCount} kalimat pasif terdeteksi |
| Metrik/Angka | ${metricsCount} data terukur terdeteksi |

**Kesimpulan Input:** CV ${firstName} ${cvStatus === "LENGKAP" ? "cukup lengkap untuk analisa mendalam" : cvStatus === "TERBATAS" ? "memberikan data cukup untuk analisa, meski beberapa detail mungkin perlu ditambah secara manual" : "terlalu singkat — pastikan semua pengalaman, pendidikan, dan skill sudah tercantum"}, dengan ${passiveCount} titik lemah yang bisa segera diperbaiki dan **${100 - totalScore} poin skor yang bisa diraih dalam 90 hari**.

---

# RINGKASAN EKSEKUTIF

${firstName}, ${openingCtxStr}

${problemList.length > 0 ? problemList.map((p, i) => `**Masalah ${i + 1}:** ${p}`).join("\n\n") : "Secara keseluruhan, CV dan personal brand kamu punya fondasi yang perlu dioptimalkan lebih jauh."}

Ini bukan tentang kemampuanmu. Masalahnya adalah **kemasan** — cara kamu mengkomunikasikan nilai nyata yang sudah ada di CV.${companyDesc ? ` Pengalaman di ${companyDesc} adalah aset yang kamu undervalue.` : university ? ` Background dari ${university} adalah modal yang belum dioptimalkan.` : ""}

Kabar baiknya: **semua ini bisa diperbaiki**. Dalam laporan ini kamu akan mendapatkan:
- Rewrite **setiap poin pengalaman** di CV dengan rumus dampak (bagian 4D)
- Tiga opsi **headline LinkedIn** yang siap pakai (bagian 4B)
- Draf lengkap **About LinkedIn** (bagian 4C)
- **15 hook konten** siap posting (bagian 4F)
- **Kalender konten 4 minggu** (bagian 4J)
- **Skor terukur** per area dengan rencana peningkatan

Bukan teori. Bukan motivasi kosong. Instruksi yang bisa kamu eksekusi besok pagi.

---

# YANG SUDAH KUAT

${gpa && parseFloat(gpa) >= 3.2
  ? `**1. Performa akademis yang solid.**
IPK ${gpa} dari ${university || "institusi pendidikanmu"}${major ? ` — jurusan ${major}` : ""} adalah sinyal kognitif yang konkret. Ini bukti kemampuan belajar yang konsisten dan disiplin. Relevan untuk posisi entry hingga mid-level. Jangan sembunyikan ini — jadikan pembuka yang strategis dengan format yang benar.`
  : `**1. Kamu sudah punya materi yang bisa diceritakan.**
CV kamu mengandung pengalaman nyata yang bisa diangkat menjadi narasi personal brand yang kuat. Ini modal utama yang tidak semua orang punya di tahap yang sama.`}

**2. ${companyDesc ? `Rekam jejak nyata di ${companyDesc}.` : "Pengalaman yang bisa jadi cerita kuat."}**
${companyDesc ? `Setiap hari yang kamu habiskan di ${companyDesc} adalah bahan konten, bahan jawaban interview, dan bukti bahwa kamu bisa deliver dalam lingkungan profesional nyata. Ini adalah "proof of work" yang tidak bisa dipalsukan.` : "Setiap pengalaman — sekecil apapun — adalah bahan konten, bahan jawaban interview, dan bukti kemampuan nyata yang terakumulasi."}

**3. ${skills.length > 0 ? `Kemampuan teknis di area ${industry} yang relevan.` : "Keberanian untuk mencari feedback dan mau dikritik."}**
${skills.length > 0 ? `Kamu sudah punya ${skills.slice(0, 4).join(", ")} — skill yang langsung bisa dipakai dan yang rekruter aktif cari. Dengan komunikasi yang benar, ini menjadi shortcut menuju wawancara.` : "Fakta bahwa kamu mencari feedback dan mau dikritik adalah tanda kedewasaan profesional. Banyak orang takut tahu kebenaran tentang CV mereka — kamu tidak."}

**4. Fondasi cerita yang kuat.**
${industry !== "Profesional" ? `Background di bidang ${industry} adalah niche yang spesifik. Niche yang spesifik artinya audiens yang lebih mudah dijangkau dan pesan yang lebih mudah diingat di LinkedIn.` : "Setiap pengalaman dan keahlian yang kamu miliki adalah bahan konten yang menunggu untuk diolah. Yang kurang bukan materinya — tapi cara mengkemasnya."}

**5. Kamu sudah mengambil langkah paling penting: mencari tahu.**
Banyak orang menunda karena takut tahu kebenaran tentang CV mereka. Kamu sudah melewati tahap itu. Ini yang akan membedakan hasil akhirmu dari kandidat lain yang hanya menunggu.

---

# TEMUAN & REKOMENDASI

## LEVEL 1 — Audit Fondasi Profil LinkedIn

${linkedInSection}

---

## LEVEL 2 — Audit CV: Rumus Dampak

### 2.1 — Pola Kalimat & Kata Kerja

**TEMUAN:** ${passiveCount > 0 ? `Terdeteksi **${passiveCount} penggunaan kalimat pasif** di CV ${firstName}${passiveCount >= 3 ? ` — termasuk frasa "bertanggung jawab atas", "membantu", dan "melakukan" yang muncul berulang` : ""}. ` : "Penggunaan kata pasif minimal — ini lebih baik dari rata-rata. "}${allBullets.length > 0 ? `Total ${allBullets.length} bullet point terdeteksi.` : "Bullet point perlu ditambahkan dengan format yang benar."}

**ANALISA:** Rumus CV yang benar: **Kata Kerja Aksi → Objek → Hasil Terukur → Metode/Konteks**. Kalimat pasif hanya mendeskripsikan tugas — bukan membedakan kontribusimu. Rekruter yang membaca 200 CV per hari tidak punya waktu menyimpulkan dampakmu sendiri.

**TIGA POLA BERMASALAH YANG DITEMUKAN:**

| # | Pola | Contoh Dari CV | Solusi |
|---|------|----------------|--------|
| 1 | Kata kerja pasif | ${weakBullets.length > 0 ? `"${weakBullets[0].slice(0, 60)}..."` : '"Bertanggung jawab atas..."'} | Ganti kata kerja dampak: Mengembangkan, Memimpin, Meningkatkan |
| 2 | Tidak ada angka | Klaim tanpa data kuantitatif | Tambahkan: berapa orang, berapa %, berapa bulan, berapa budget |
| 3 | Deskripsi terlalu singkat | Bullet 1–5 kata tanpa konteks | Perluas: Kata Kerja + Objek + Hasil + Konteks |

**ASET TERSEMBUNYI DI CV INI:**
${gpa ? `- IPK ${gpa} dari ${university || "universitas"} — angka konkret yang memperkuat narasi` : ""}
${companies.length > 0 ? companies.map((c) => `- Pengalaman di ${c} — nama brand dengan nilai sinyal kepada rekruter`).join("\n") : ""}
${skills.length > 0 ? `- Skill ${skills.slice(0, 4).join(", ")} — keyword ATS yang sudah ada, tapi belum diekspos optimal` : ""}
${gpa || companies.length > 0 || skills.length > 0 ? "" : "- Setiap pengalaman yang dicantumkan mengandung cerita yang belum diekstrak sepenuhnya"}

**DAMPAK:** ${passiveCount >= 3 ? `Dengan ${passiveCount} kalimat pasif, CV ${firstName} bercerita tentang apa yang dilakukan — bukan apa yang dicapai. Ini menempatkan kandidat di kategori "average" dalam 6 detik pertama screening rekruter.` : "Setiap kalimat pasif adalah peluang yang hilang untuk menunjukkan nilai nyata kepada rekruter."}

**REKOMENDASI:** Terapkan rumus dampak untuk **setiap** bullet point. Rewrite lengkap ada di bagian 4D.

**PRIORITAS: 🔴 SANGAT TINGGI**

---

### 2.2 — Metrik & Kuantifikasi

**TEMUAN:** ${!hasMetrics ? `Hampir tidak ada metrik terukur — hanya **${metricsCount} data point numerik** yang terdeteksi di seluruh CV.` : `Ada **${metricsCount} data terukur** — fondasi ada, tapi masih bisa ditingkatkan signifikan.`}

**ANALISA:** Kandidat yang mencantumkan angka spesifik mendapat 38% lebih banyak respons dari rekruter (berdasarkan analisis LinkedIn). Angka tidak harus sempurna — estimasi yang logis selalu lebih baik dari klaim abstrak.

**DAMPAK:** Tanpa metrik, pernyataan seperti "meningkatkan engagement" atau "mengelola tim" tidak bisa dibedakan dari klaim kandidat manapun.

**REKOMENDASI:** Untuk setiap pengalaman, jawab minimal satu: berapa orang terdampak? berapa % perubahannya? berapa budget? dalam berapa bulan? Lihat contoh konkret di bagian 4D.

**PRIORITAS: 🔴 TINGGI**

---

### 2.3 — Struktur & Urutan

**TEMUAN:** Urutan dan penekanan konten CV belum tentu selaras dengan prioritas rekruter di bidang ${industry}.

**ANALISA:** CV yang efektif bukan kronologi hidup — ini dokumen pemasaran dengan satu tujuan: lolos ke tahap wawancara. Pengalaman yang paling relevan dengan posisi target harus muncul pertama dan mendapat porsi terbesar.

**DAMPAK:** Pengalaman paling relevan yang terkubur di halaman 2 tidak akan ditemukan rekruter yang punya 6 detik untuk screening.

**REKOMENDASI:** Identifikasi 2–3 pengalaman paling relevan dengan target posisi ${industry}. Pindahkan ke atas, beri 4–5 bullet point format dampak, kurangi porsi pengalaman tidak relevan ke 1–2 bullet ringkas.

**PRIORITAS: 🟡 SEDANG**

---

### 2.4 — Skills & ATS Optimization

**TEMUAN:** ${skills.length >= 6 ? `${skills.length} skill terdeteksi: ${skills.join(", ")}. Perlu dipastikan penulisannya sesuai keyword di job description.` : skills.length > 0 ? `Hanya ${skills.length} skill terdeteksi: ${skills.join(", ")}. Perlu diperkuat.` : "Bagian Skills tidak terdeteksi atau sangat minim — ini gap kritis."}

**ANALISA:** Mayoritas perusahaan skala menengah ke atas menggunakan ATS untuk menyaring CV. ATS membaca keyword, bukan konteks. Jika skillmu tidak ditulis persis seperti yang ada di job description, kamu tersaring otomatis.

**DAMPAK:** CV yang tidak lolos ATS tidak pernah sampai ke rekruter, bahkan jika kamu kandidat terbaik.

**REKOMENDASI:** Buat Skills section terkategorisasi:
- **Technical Skills:** ${skills.slice(0, 5).join(", ")}${skills.length > 5 ? `, +${skills.length - 5} lainnya` : ""}
- **Soft Skills:** maksimal 4, yang bisa dibuktikan dengan pengalaman konkret
- **Languages:** bahasa yang dikuasai beserta level (Basic/Intermediate/Fluent/Native)

Hindari grafik atau bar skill — ATS hanya bisa membaca teks.

**PRIORITAS: 🔴 TINGGI**

---

## LEVEL 3 — Audit Strategi: Niche, Persona & Content Pillar

### 3.1 — Niche & Positioning

**TEMUAN:** ${industry !== "Profesional" ? `Berdasarkan CV, ${firstName} berada di area ${industry}. Arah sudah terlihat — tapi positioning spesifik dalam industri ini belum terdefinisi tajam.` : "Niche atau positioning spesifik personal brand belum terdefinisi jelas dari CV yang dikirimkan."}

**ANALISA:** Personal branding yang efektif bukan tentang menjadi segalanya untuk semua orang. Semakin sempit niche, semakin mudah orang — termasuk rekruter — mengingat kamu untuk sesuatu yang konkret.

**DAMPAK:** Tanpa niche yang jelas, konten LinkedIn tidak menarik audiens konsisten, dan rekruter tidak mengasosiasikan nama kamu dengan keahlian tertentu.

**REKOMENDASI:** Temukan intersection antara:
1. **Apa yang dikuasai** ${skills.length > 0 ? `— ${skills.slice(0, 3).join(", ")}` : ""}
2. **Apa yang disukai** — bisa dibicarakan dengan antusias tanpa persiapan
3. **Apa yang dibutuhkan pasar** — ada demand di ${industry}

Pilih satu sudut pandang dan commit 90 hari. Kalimat positioning ada di bagian 4A.

**PRIORITAS: 🔴 TINGGI**

---

### 3.2 — Persona Konten

**TEMUAN:** Persona konten — karakter yang dimainkan secara konsisten di LinkedIn — belum terdefinisi.

**ANALISA:** Orang follow orang, bukan CV. Persona yang jelas membuat audiens terhubung dan ingin terus mengikuti perjalanan.

**REKOMENDASI:** Tulis 3–5 kalimat yang menggambarkan karakter kontenmu: siapa kamu, apa yang diperjuangkan, apa yang dipercayai, bagaimana gaya bicara.

Contoh persona untuk ${firstName}:
${careerLevel === "student"
  ? `*"Mahasiswa ${major || industry} yang jujur mendokumentasikan proses belajar dan kesalahan — karena belajar dari kegagalan orang lain lebih murah dari kegagalan sendiri."*`
  : careerLevel === "fresh_grad"
  ? `*"Fresh grad ${industry} yang mendokumentasikan transisi dari dunia kampus ke kerja nyata — dengan semua kesulitan, keberhasilan, dan lesson learned-nya."*`
  : `*"Profesional ${industry} yang berbagi perspektif praktis dari lapangan — bukan teori, tapi yang benar-benar bekerja dalam pekerjaan nyata sehari-hari."*`}

**PRIORITAS: 🟡 SEDANG**

---

### 3.3 — Content Pillar

**TEMUAN:** Content pillar — kategori konten yang dibuat secara konsisten — belum ada struktur yang jelas.

**ANALISA:** Tanpa pillar yang dipilih di awal, setiap kali mau posting akan ada pertanyaan "mau nulis apa ya?" yang berujung tidak posting sama sekali.

**REKOMENDASI:**

| Pillar | Deskripsi | Contoh Topik | Frekuensi |
|--------|-----------|-------------|-----------|
| Lesson Learned | Pengalaman nyata dari ${companyDesc || "lingkungan profesional/akademis"} | "Hal yang tidak ada yang ceritakan tentang bekerja di ${companies[0] || industry}" | 1×/minggu |
| How-to Praktis | Tutorial/framework menggunakan ${skills.slice(0, 2).join(" atau ") || "keahlian yang dimiliki"} | "Framework [X langkah] untuk [masalah spesifik]" | 1×/minggu |
| Opini Industri | Sudut pandang tentang tren ${industry} | "Hot take: [pernyataan kontroversi tapi berdasar]" | 2×/bulan |
| Behind the Scene | Proses belajar atau bekerja sehari-hari | "Timeline jujur perjalanan saya dari [titik awal] ke posisi sekarang" | 2×/bulan |

**PRIORITAS: 🟡 SEDANG**

---

## LEVEL 4 — Audit Konten & Format

**TEMUAN:** Format konten LinkedIn — jika sudah posting — kemungkinan belum dioptimalkan untuk mobile reading.

**ANALISA:** Lebih dari 80% pengguna LinkedIn mengakses lewat mobile. Paragraf panjang tanpa jeda terlihat seperti dinding teks di layar kecil.

**DAMPAK:** Engagement rate rendah → distribusi organik rendah → personal brand tidak berkembang meski sudah rutin posting.

**REKOMENDASI — Formula Konten yang Bekerja di LinkedIn:**
1. **Hook** — 1 kalimat yang bikin orang berhenti scroll
2. **Konteks** — 2–3 kalimat, kenapa ini penting
3. **Isi utama** — list atau paragraf pendek, satu kalimat per baris
4. **Insight/Pelajaran** — 1–2 kalimat
5. **CTA** — 1 pertanyaan spesifik yang mudah dijawab

**CHECKLIST KONTEN LINKEDIN:**

| Area | Target | Tindakan |
|------|--------|----------|
| Foto profil | Profesional, latar bersih, ≥400×400px | Upload foto terbaru |
| Banner | Custom (bukan default biru) | Buat di Canva 1584×396px |
| Headline | Formula [Keahlian]\|[Nilai]\|[Industri] | Gunakan opsi dari 4B |
| About | Hook kuat di kalimat pertama | Gunakan draf dari 4C |
| Pengalaman | Semua pakai format dampak | Salin dari 4D |
| Skills | Min 10 skill, ada endorsement | Tambahkan dari list di CV |
| Posting | 2–3×/minggu, konsisten | Mulai dari konten di 4J |
| Engagement | Balas komentar dalam 1 jam | Set notifikasi LinkedIn |

**PRIORITAS: 🟡 SEDANG**

---

## LEVEL 5 — Audit Metrik & Algoritma

**TEMUAN:** Belum ada sistem untuk mengukur pertumbuhan personal brand ${firstName} secara objektif.

**ANALISA:** Tanpa metrik, tidak ada cara tahu apakah strategi yang dijalankan bekerja atau tidak.

**REKOMENDASI — 5 Metrik Wajib Dipantau Tiap Minggu:**

| # | Metrik | Target Bulan 1 | Target Bulan 3 |
|---|--------|---------------|---------------|
| 1 | Jumlah follower | +50 | +200 |
| 2 | Rata-rata impressions/post | >200 | >500 |
| 3 | Engagement rate | >2% | >5% |
| 4 | Connection request masuk | 5/minggu | 15/minggu |
| 5 | Pesan/peluang masuk | 1/bulan | 3/bulan |

**Cara Kerja Algoritma LinkedIn:**
- Komentar bernilai 4–8× lebih tinggi dari likes
- "Golden window" 30–60 menit pertama menentukan distribusi
- Posting optimal: Selasa–Kamis, 07.00–09.00 atau 12.00–13.00 WIB
- Balas setiap komentar dalam 1 jam pertama
- Engage dengan 5–10 post orang lain sebelum posting

**PRIORITAS: 🟡 SEDANG**

---

# CONTOH PERBAIKAN KONKRET

## 4A — Kalimat Positioning

Digunakan di cover letter, About LinkedIn, dan saat perkenalan networking:

> *"Saya ${name} — ${levelLabel[careerLevel].toLowerCase()} di bidang ${industry}${eduDesc ? ` dengan ${gpa ? `IPK ${gpa} dari ${university || "universitas"}` : `background dari ${university || "institusi pendidikan"}`}` : ""}. ${companyDesc ? `Rekam jejak saya mencakup pengalaman di ${companyDesc}` : "Saya membawa pengalaman langsung dari lapangan"}${skills.length > 0 ? `, dengan keahlian di ${skills.slice(0, 3).join(", ")}` : ""}. Saya tidak datang untuk sekadar mengisi posisi — saya datang dengan track record nyata dan kemampuan yang siap berkontribusi dari hari pertama."*

**Versi pendek (elevator pitch 30 detik):**

> *"${firstName}, ${industry} ${careerLevel === "student" || careerLevel === "fresh_grad" ? "graduate" : "professional"}${university ? ` dari ${university}` : ""}. Spesialisasi: ${skills.length > 0 ? skills.slice(0, 2).join(" dan ") : industry.split(" & ")[0]}${companyDesc ? `. Experience di ${companyDesc}` : ""}."*

---

## 4B — Headline LinkedIn (3 Opsi)

**Opsi 1 — Fokus Keahlian:**
> *"${skill1} ${careerLevel === "student" || careerLevel === "fresh_grad" ? "Enthusiast" : "Professional"} | ${industry.split(" & ")[0]} | ${skill2 !== skill1 ? skill2 : skills[2] || "Problem Solver"} | ${university ? university.split(" ").slice(-1)[0] : "Passionate Learner"}"*

**Opsi 2 — Fokus Nilai/Dampak:**
> *"Membantu ${industry.split(" & ")[0]} teams ${industry.includes("Marketing") ? "grow & convert" : industry.includes("Teknologi") ? "build & ship faster" : industry.includes("Keuangan") ? "manage risk & optimize" : "deliver real results"} | ${skill1} | ${careerLevel === "student" || careerLevel === "fresh_grad" ? "Open to Opportunities" : "Open to New Challenges"}"*

**Opsi 3 — Fokus Journey:**
> *"${careerLevel === "student" ? `Mahasiswa ${major || industry.split(" & ")[0]}` : careerLevel === "fresh_grad" ? `Fresh Graduate ${industry.split(" & ")[0]}` : `${industry.split(" & ")[0]} Professional`}${university ? ` @ ${university.split(" ").slice(-1)[0]}` : ""} | Building ${skill1 !== skill2 ? `${skill1} + ${skill2}` : skill1} for ${industry.split(" & ")[0]} | Let's connect"*

*PROVISIONAL — sesuaikan dengan kondisi aktual profil LinkedIn kamu*

---

## 4C — Draf Bagian About / Summary LinkedIn

*Gunakan draf ini sebagai basis, sesuaikan dengan detail konkret dari pengalamanmu.*

---

**[WHO]**
Saya ${name} — ${levelLabel[careerLevel].toLowerCase()} di bidang ${industry}${university ? ` dengan background dari ${university}${gpa ? ` (IPK ${gpa})` : ""}` : ""}.

**[WHAT]**
${companyDesc ? `Selama di ${companyDesc}, saya belajar bahwa [pelajaran terbesar]. Pengalaman ini membentuk cara saya [pendekatan kerja spesifik].` : `Selama perjalanan di ${industry}, saya belajar bahwa [tuliskan pelajaran terbesar yang membentuk cara kerjamu].`}

Yang saya bawa ke setiap pekerjaan: ${skills.length > 0 ? `kemampuan ${skills.slice(0, 3).join(", ")}` : "kemampuan teknis yang relevan"} dikombinasikan dengan [tambahkan: soft skill yang bisa dibuktikan dengan cerita nyata].

**[WHY]**
Saya percaya bahwa ${industry.includes("Teknologi") ? "teknologi yang baik adalah yang menyelesaikan masalah nyata, bukan yang terlihat keren di atas kertas" : industry.includes("Marketing") ? "marketing yang baik dimulai dari memahami manusia, bukan algoritma" : industry.includes("Keuangan") ? "keuangan yang baik adalah tentang membuat keputusan dengan data yang benar di waktu yang tepat" : "[tuliskan filosofi kerjamu dalam satu kalimat]"}.

**[CTA]**
Saya sedang [mencari peluang baru di / terbuka untuk kolaborasi di] ${industry}. Jika kamu ${industry.includes("Teknologi") ? "sedang build sesuatu yang meaningful" : industry.includes("Marketing") ? "punya tantangan growth yang belum terpecahkan" : "butuh partner yang bisa deliver"} — let's talk.

📩 DM atau email saya di [email kamu]

---

*PROVISIONAL — sesuaikan dengan kondisi aktual dan voice aslimu*

---

## 4D — Penulisan Ulang Seluruh Poin Pengalaman

*Rewrite untuk setiap bullet point yang terdeteksi di CV. Isi [tanda kurung] dengan data nyata dari pengalamanmu.*

${bulletRewrites.join("\n\n---\n\n")}

${bulletRewrites.length <= 3 ? `\n*Catatan: Hanya ${allBullets.length} bullet point terdeteksi. Jika CV lebih panjang, pastikan teks CV sudah di-paste lengkap. Untuk setiap poin tambahan, gunakan pola: Kata Kerja Dampak + Objek + Hasil Terukur + Konteks.*` : ""}

---

## 4E — Draf Konten LinkedIn Lengkap

*Post perdana yang bisa langsung digunakan — edit sesuai detail nyatamu.*

---

Saya pernah salah paham tentang ${industry.split(" & ")[0]}.

Saya pikir yang paling penting adalah [skill teknis atau teori yang dipelajari di awal].

Ternyata saya salah.

Yang paling menentukan adalah cara kamu [insight yang kamu punya setelah pengalaman nyata].

${companyDesc ? `Di ${companyDesc}, saya belajar ini secara langsung:` : "Dari pengalaman langsung, saya belajar:"}

→ [Pelajaran 1 yang konkret dan spesifik]
→ [Pelajaran 2 yang mengubah cara kerjamu]
→ [Pelajaran 3 yang tidak akan kamu temukan di buku teks]

Dan ini yang akan saya sampaikan ke diri sendiri 2 tahun lalu:

[1–2 kalimat saran yang paling berharga]

Kamu sedang di fase mana sekarang?

---

*Format: text post 150–250 kata. Posting Selasa atau Rabu, 07.30–08.30 WIB. Balas semua komentar dalam 1 jam pertama.*

---

## 4F — Bank Ide Hook (15 Hook Siap Pakai)

*Hook adalah kalimat pembuka yang menentukan apakah orang berhenti scroll atau tidak.*

| # | Hook | Tipe |
|---|------|------|
${hookRows.map((h) => `| ${h.no} | ${h.hook} | ${h.tipe} |`).join("\n")}

---

## 4G — Mengubah Aset Jadi Jasa Berbayar

*Setelah membangun personal brand yang kuat di ${industry}, inilah cara monetisasinya.*

| Paket | Isi | Kisaran Harga | Target Klien |
|-------|-----|--------------|-------------|
| Konsultasi 1:1 | Review CV + LinkedIn 30 menit, feedback langsung, recording | Rp 299.000–499.000/sesi | Kandidat aktif mencari kerja di ${industry} |
| Template & Resource | Template CV format dampak, headline LinkedIn, bank ide konten | Rp 49.000–99.000/bundle | Fresh grad dan career switcher |
| Workshop Online | Workshop 2 jam Personal Branding ${industry} — live Q&A | Rp 150.000–250.000/orang | Komunitas profesional ${industry} |
| Jasa Review CV | Audit CV tertulis dengan BEFORE/AFTER setiap bullet point | Rp 199.000–349.000/dokumen | Profesional yang tidak sempat revisi sendiri |

*Mulai dari paket paling sederhana (Template & Resource) untuk memvalidasi demand sebelum investasi waktu lebih besar.*

---

## 4H — Skrip Siap Pakai

**Cold DM ke Rekruter:**

> "Halo [Nama Rekruter], saya [nama] — ${levelLabel[careerLevel].toLowerCase()} di bidang ${industry}${university ? ` dengan background ${university}` : ""}. Saya menemukan profil Anda karena sering membahas [topik relevan]. Saya tertarik pada posisi [nama posisi] di [perusahaan]. Boleh saya tanya 15 menit untuk belajar lebih tentang tim dan budaya kerja di sana?"

**Perkenalan di Networking Event:**

> "Halo, saya ${firstName}. Saya bekerja di bidang ${industry}${skills.length > 0 ? `, spesifik di ${skills.slice(0, 2).join(" dan ")}` : ""}${companyDesc ? `. Sebelumnya di ${companyDesc}` : ""}. Kamu di bidang apa?"

**Follow-up Setelah Interview:**

> "Halo [Nama], terima kasih atas kesempatan diskusi kemarin. Saya makin antusias dengan [sesuatu spesifik yang dibahas]. Satu hal yang ingin saya tambahkan: [poin yang lupa disampaikan, maksimal 2 kalimat]. Saya nantikan kabar selanjutnya."

---

## 4I — Draf About Alternatif (Jalur Karir)

*Versi untuk ${firstName} yang sedang career switching atau ingin menonjolkan angle berbeda.*

---

Ada momen ketika saya sadar bahwa [insight yang mengubah arah].

Sebelumnya saya di [latar belakang sebelumnya]. Tapi satu pengalaman di [konteks] membuat saya melihat ${industry} dari sudut pandang yang berbeda.

Sejak itu, saya fokus membangun keahlian di [area spesifik] — dan hasilnya: [pencapaian konkret atau progress terukur].

Hari ini saya ${levelLabel[careerLevel].toLowerCase()} yang [deskripsi singkat apa yang dilakukan sekarang].

Yang membedakan saya: [unique value proposition yang tidak bisa dikopas kandidat lain].

📩 Terbuka untuk [jenis peluang yang dicari] — let's connect.

---

## 4J — Kalender Konten 4 Minggu

| Minggu | Hari | Tipe Konten | Topik | Format | CTA |
|--------|------|------------|-------|--------|-----|
${calendarRows.map((c) => `| ${c.minggu} | ${c.hari} | ${c.tipe} | ${c.topik} | ${c.format} | ${c.cta} |`).join("\n")}

*Tips: Siapkan semua 8 post di akhir pekan sebelum mulai. Engagement tertinggi biasanya di Post Minggu 1 (perkenalan) dan Minggu 3 (behind the scene).*

---

## 4K — Tiga Hambatan Mental

Berdasarkan pola di level ${levelLabel[careerLevel]}, inilah tiga hambatan yang paling sering muncul:

**Hambatan 1: "Saya belum cukup ahli untuk posting tentang ${industry}"**

Kamu tidak harus jadi expert untuk berbagi. Audiens paling terhubung dengan perjalanan, bukan kesempurnaan. Post tentang apa yang sedang kamu pelajari hari ini — itu lebih berharga dari teori yang sudah dikuasai expert.

*Solusi:* Ganti framing dari "saya harus mengajar" ke "saya mendokumentasikan perjalanan". Satu post per minggu tentang satu hal yang baru dipelajari.

**Hambatan 2: "Tidak ada yang tertarik dengan cerita saya"**

Data mengatakan sebaliknya: konten yang paling tinggi engagement di LinkedIn adalah konten personal dan jujur. Orang follow orang, bukan CV.

*Solusi:* Ingat bahwa ada ribuan orang di level yang sama denganmu yang butuh melihat bahwa seseorang berhasil melewati fase yang mereka jalani. Kamu adalah bukti nyata itu.

**Hambatan 3: "Saya takut dikritik atau dihakimi"**

Kebanyakan orang terlalu sibuk dengan masalah mereka sendiri untuk mengkritik kamu. Dan yang mengkritik? Itu sinyal kontenmu cukup kuat untuk memancing reaksi — yang berarti distribusi algoritma yang lebih tinggi.

*Solusi:* Buat aturan: publish dulu, edit mindset kemudian. Setiap post yang dipublish adalah data — yang tidak dipublish tidak menghasilkan apapun.

---

# RENCANA EKSEKUSI

## Minggu 1 — Benahi Etalase

${week1Tasks.map((t) => `- [ ] ${t}`).join("\n")}

## Minggu 2–4 — Mulai Posting

- [ ] Publish Post 1: perkenalan storytelling dari template di bagian 4E
- [ ] Jadwal posting: Selasa dan Kamis, jam 07.30 atau 12.00 WIB
- [ ] Gunakan 4 content pillar dari bagian 3.3 — rotasi agar tidak monoton
- [ ] Balas SEMUA komentar dalam 1 jam pertama setelah posting
- [ ] Engage dengan 5–10 post orang lain setiap hari (komentar bermakna)
- [ ] Kirim 5 connection request per hari ke orang relevan dengan target karier
- [ ] Track metrik mingguan di spreadsheet: follower, impressions, engagement, koneksi masuk

## Bulan 2–3 — Iterasi & Scale

- [ ] Review performa konten mingguan: post mana yang paling banyak impressions dan komentar?
- [ ] Identifikasi pola: topik, format, dan waktu yang paling perform
- [ ] Double down pada yang berhasil — hentikan yang tidak menghasilkan setelah 4× percobaan
- [ ] Lamar 3–5 posisi per minggu menggunakan CV yang sudah diperbarui
- [ ] Track semua lamaran di spreadsheet${skills.includes("Excel") || skills.includes("Google Sheets") ? ` (gunakan ${skills.includes("Excel") ? "Excel" : "Google Sheets"})` : ""}: perusahaan, posisi, tanggal, status, kontak
- [ ] Update CV setiap 2 minggu berdasarkan feedback proses lamaran
- [ ] Target bulan 3: follower +100, engagement rate >3%, respons lamaran >15%

---

# SKOR AKHIR

| Komponen | Skor | Maks | Catatan |
|----------|------|------|---------|
| Fondasi Profil LinkedIn | ${liScore} | 20 | ${hasLinkedin ? (linkedInProfile ? "URL ada & data terdeteksi — perlu optimasi headline, About, dan Skills" : "URL ada, profil perlu diaudit manual menggunakan checklist") : "Tidak ada URL LinkedIn — prioritas tertinggi"} |
| CV & Impact | ${cvScore} | 20 | ${hasMetrics ? `${metricsCount} metrik terdeteksi — fondasi ada, tingkatkan ke min 1 angka/pengalaman` : "Hampir tidak ada angka terukur — setiap pengalaman butuh min 1 data point"} |
| Niche & Positioning | ${nicheScore} | 15 | ${industry !== "Profesional" ? `Arah ${industry} terlihat, positioning spesifik belum tajam` : "Positioning belum terdefinisi — terlalu general"} |
| Content Pillar | ${contentScore} | 10 | Pillar belum terdefinisi — mulai dari 4 pillar yang sudah disiapkan di 3.3 |
| Kualitas Konten | ${qualScore} | 20 | ${skills.length >= 5 ? `${skills.length} skill terdeteksi — bahan konten kuat, format komunikasi perlu dioptimalkan` : skills.length >= 2 ? `${skills.length} skill terdeteksi — perlu dikembangkan lebih jauh` : "Bagian skills perlu diperkuat"} |
| Strategi Metrik | ${metricScore} | 15 | Belum ada sistem tracking aktif — mulai dari 5 metrik di Level 5 |
| **TOTAL** | **${totalScore}** | **100** | **${totalScore >= 70 ? "Fondasi kuat — fokus pada konsistensi eksekusi" : totalScore >= 50 ? "Fondasi ada — upgrade signifikan pada komunikasi dampak diperlukan" : `Titik awal jelas — ${100 - totalScore} poin bisa diraih dalam 90 hari`}** |

Skor ${totalScore}/100 adalah titik awal yang jujur, bukan penilaian final. Ada **${100 - totalScore} poin** yang bisa diraih dalam 90 hari dengan eksekusi yang konsisten. Profesional di level ${levelLabel[careerLevel]} yang mengikuti rencana ini biasanya melihat:
- Peningkatan 25–35 poin skor dalam satu kuartal
- Respons lamaran meningkat 2–3× setelah CV diperbarui
- Connection masuk dari rekruter mulai muncul setelah 4–6 minggu posting konsisten

---

# PENUTUP DARI DONATALKS

${firstName}, laporan ini adalah peta yang spesifik untuk kondisi CV dan personal brand kamu — bukan template generik.

Satu hal yang perlu diingat: **dokumen ini tidak bekerja jika hanya dibaca**.

Mulai dari satu hal hari ini. Pilih satu bullet point di CV kamu — cari yang dimulai dengan "bertanggung jawab" atau "membantu" — dan rewrite sekarang menggunakan rumus di bagian 4D.

Besok, perbarui headline LinkedIn menggunakan salah satu opsi dari 4B.

Lusa, publish konten pertama menggunakan template dari 4E.

Momentum personal brand dibangun dari aksi kecil yang konsisten, bukan dari rencana besar yang tidak pernah dimulai.

Kamu sudah punya petanya — sekarang saatnya jalan.

— Tim DonaTalks`;
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

    // Preview = first ~50% of the document, cut at a clean section boundary
    const midpoint = Math.floor(fullContent.length / 2);
    let breakPoint = fullContent.indexOf("\n---\n", midpoint);
    if (breakPoint === -1) breakPoint = fullContent.lastIndexOf("\n## ", midpoint + 2000);
    if (breakPoint === -1) breakPoint = midpoint;
    const previewContent =
      fullContent.substring(0, breakPoint) +
      "\n\n---\n\n> 🔒 **Lanjutan laporan tersedia setelah aktivasi** — termasuk: rewrite setiap poin CV (4D), 3 opsi headline LinkedIn (4B), draf About lengkap (4C), 15 hook konten (4F), kalender konten 4 minggu (4J), tabel Skor Akhir, dan Rencana Eksekusi lengkap.";

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
