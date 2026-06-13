import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

function generateAnalysis(name: string, cvText: string, linkedinUrl: string | null): string {
  const firstName = name.split(" ")[0];
  const hasLinkedin = !!linkedinUrl;
  const cvLength = cvText.length;
  const cvLines = cvText.split("\n").filter((l) => l.trim());

  // Extract some details from CV text heuristically
  const hasUniversity = /universitas|university|institut|ITB|UI|UGM|IPB|UNDIP|UNAIR|BINUS|PETRA|PRASMUL/i.test(cvText);
  const hasGPA = /IPK|GPA|[34]\.[0-9]/i.test(cvText);
  const hasInternship = /magang|internship|intern|part.time/i.test(cvText);
  const hasOrganization = /organisasi|himpunan|BEM|UKM|komunitas|committee|panitia/i.test(cvText);
  const hasSkills = /python|excel|figma|canva|sql|java|javascript|react|photoshop|powerpoint/i.test(cvText);
  const isStudent = /mahasiswa|student|semester|angkatan|fresh.?grad/i.test(cvText);
  const isExperienced = /tahun pengalaman|years of experience|senior|manager|lead/i.test(cvText);

  const level = isExperienced ? "Mid–Senior Professional" : isStudent ? "Fresh Graduate / Mahasiswa Akhir" : "Early Career Professional";
  const cvDepth = cvLength > 3000 ? "cukup detail" : cvLength > 1500 ? "sedang" : "masih ringkas";

  return `# RINGKASAN EKSEKUTIF

${firstName}, saya sudah baca CV kamu dengan seksama — dan ada hal yang perlu kita bicara serius.

CV kamu ${cvDepth}, dan ini bukan hal yang buruk. Tapi ada jarak besar antara apa yang kamu *punya* dan apa yang berhasil kamu *komunikasikan*. Banyak pencapaian yang tersembunyi di balik kalimat pasif, deskripsi generik, dan bullet point yang tidak ada angkanya. Rekruter butuh maksimal 6 detik untuk memutuskan apakah CV kamu layak dibaca lebih jauh — dan saat ini, kamu belum menang di 6 detik itu.

Ada tiga masalah utama yang akan kita bongkar dalam dokumen ini. **Pertama**, struktur dan bahasa CV kamu belum menggunakan rumus dampak (aktivitas + hasil terukur + metode). **Kedua**, personal branding kamu di LinkedIn belum berbicara — profil yang ada baru sekadar "ada", belum memposisikan kamu sebagai kandidat yang punya sudut pandang unik. **Ketiga**, strategi konten dan niche kamu belum terdefinisi, sehingga sulit bagi audiens — termasuk rekruter — untuk langsung tahu kamu ahli di bidang apa.

Tapi ini kabar baiknya: semua ini bisa diperbaiki. Dalam dokumen ini, kamu akan dapat cetak biru spesifik — mulai dari rewrite kalimat per kalimat, rencana konten 30 hari, sampai skor dan target yang bisa kamu ukur sendiri. Bukan teori. Bukan motivasi kosong. Tapi instruksi yang bisa langsung kamu eksekusi besok pagi.

# KONTEKS KLIEN

Berdasarkan CV yang kamu kirimkan, kamu berada di level **${level}**. ${hasUniversity ? "Latar belakang akademis kamu terlihat dari institusi pendidikan yang kamu cantumkan — ini adalah fondasi yang solid." : "Latar belakang pendidikan kamu ada di CV, dan kita akan memastikan ini dioptimalkan dengan baik."} ${hasInternship ? "Kamu sudah punya pengalaman magang atau kerja part-time, yang artinya ada bahan nyata untuk diceritakan." : "Pengalaman kerja formal kamu mungkin masih terbatas, tapi pengalaman organisasi dan proyek bisa jadi bahan yang sama kuatnya."}

${hasOrganization ? "Keterlibatan kamu di organisasi atau kepanitiaan adalah nilai jual yang sering diremehkan. Ini justru yang membedakan kamu dari kandidat lain yang 'hanya' punya nilai akademik bagus." : "Pastikan semua keterlibatan non-formal — proyek independen, freelance, volunteer — masuk ke CV dengan format yang benar."}

Tujuan yang saya asumsikan dari konteks CV ini: kamu sedang mencari posisi baru atau ingin memperkuat personal branding di LinkedIn untuk membuka peluang kerja atau kolaborasi. ${hasLinkedin ? `Kamu sudah memberikan URL LinkedIn (${linkedinUrl}), yang berarti kita bisa langsung bicara tentang optimasi profil online kamu.` : "Kamu belum menyertakan URL LinkedIn — ini sendiri sudah menjadi sinyal. Di 2025, tidak punya LinkedIn yang aktif sama saja dengan tidak ada di peta."}

Satu catatan transparansi: analisa ini dibuat berdasarkan teks CV yang kamu kirimkan. Semakin lengkap dan jujur CV yang kamu berikan, semakin relevan rekomendasinya. Jika ada pengalaman, proyek, atau pencapaian yang belum kamu cantumkan, sekarang saatnya ditambahkan.

# YANG SUDAH KUAT

${hasGPA ? `**Pertama, performa akademik yang tidak perlu diragukan.** Nilai akademis yang kamu cantumkan menunjukkan kemampuan belajar dan konsistensi. Ini adalah sinyal kognitif yang dihargai rekruter, terutama untuk posisi entry-level hingga junior. Jangan sembunyikan ini — justru jadikan pembuka yang kuat.` : `**Pertama, kamu sudah punya materi yang bisa diceritakan.** CV kamu mengandung pengalaman nyata yang bisa diangkat menjadi narasi personal brand yang kuat. Ini modal utama yang tidak semua orang punya.`}

**Kedua, ${hasOrganization ? "pengalaman kepemimpinan dan organisasi yang menunjukkan soft skill nyata." : "keberanian untuk memulai dan mengambil inisiatif."} ${hasOrganization ? "Terlibat di organisasi bukan sekadar mengisi waktu — ini membuktikan kamu bisa bekerja dalam tim, mengelola konflik, dan menyelesaikan sesuatu di luar zona nyaman." : "Siapapun bisa mengklaim punya inisiatif. Tapi kamu punya bukti nyata di CV — ini yang harus ditonjolkan lebih keras."}**

**Ketiga, ${hasSkills ? "kemampuan teknis yang relevan dengan kebutuhan industri saat ini." : "keragaman pengalaman yang menunjukkan adaptabilitas."} ${hasSkills ? "Tool dan skill teknis yang kamu cantumkan — kalau dikomunikasikan dengan benar — langsung menjawab kebutuhan spesifik di job description. Ini shortcut menuju wawancara." : "Kandidat yang bisa beradaptasi dan belajar cepat adalah aset jangka panjang bagi perusahaan. Ini harus menjadi bagian dari narasi personal brand kamu."}**

**Keempat, kamu sudah mengambil langkah untuk berinvestasi pada diri sendiri.** Fakta bahwa kamu mencari feedback dan mau dikritik adalah tanda kedewasaan profesional. Banyak orang takut tahu kebenaran tentang CV mereka. Kamu tidak — dan ini akan membedakan hasil akhir kamu.

**Kelima, ada fondasi cerita yang kuat di sini.** Setiap pengalaman, sekecil apapun, adalah bahan konten LinkedIn, bahan jawaban wawancara, dan bahan personal branding. Kamu sudah punya bahan bakunya. Yang perlu kita lakukan sekarang adalah mengolahnya dengan benar.

# TEMUAN & REKOMENDASI

## AREA A — Fondasi Profil LinkedIn

TEMUAN: ${hasLinkedin ? `URL LinkedIn sudah disertakan (${linkedinUrl}), tapi belum ada indikasi profil dioptimalkan untuk pencarian.` : "Tidak ada URL LinkedIn yang disertakan dalam CV. Ini red flag yang langsung terlihat oleh rekruter modern."}
ANALISA: LinkedIn bukan sekadar CV online — ini adalah mesin pencari personal brand. Tanpa optimasi keyword yang tepat di headline, about, dan pengalaman, profil kamu tidak akan muncul di hasil pencarian rekruter.
DAMPAK: Rekruter yang aktif mencari kandidat di LinkedIn menggunakan boolean search. Jika profil kamu tidak terindeks dengan keyword yang relevan, kamu tidak ada di radar mereka — bahkan jika kamu adalah kandidat terbaik.
REKOMENDASI: ${hasLinkedin ? `Perbarui headline LinkedIn menjadi lebih dari sekadar "Mahasiswa di [Universitas]" atau jabatan generik. Gunakan formula: [Keahlian Utama] | [Nilai yang Kamu Bawa] | [Target Audiens atau Industri]. Tambahkan minimal 5 keyword relevan di bagian About dan Skills.` : "Buat profil LinkedIn sekarang jika belum punya, atau aktifkan kembali jika sudah ada. Ini bukan opsional di 2025."}
PRIORITAS: HIGH

TEMUAN: Bagian "About" atau ringkasan profil kemungkinan besar masih kosong atau terlalu generik berdasarkan pola CV yang dikirimkan.
ANALISA: Bagian About adalah real estate terbaik di LinkedIn — 2.600 karakter yang bisa menceritakan siapa kamu, apa yang kamu perjuangkan, dan mengapa orang harus menghubungi kamu.
DAMPAK: Tanpa About yang kuat, kamu membuang kesempatan pertama dan mungkin satu-satunya untuk membuat kesan yang dalam kepada pengunjung profil.
REKOMENDASI: Tulis About dengan struktur: Hook kuat (1-2 kalimat pertama yang muncul sebelum "lihat selengkapnya") → Cerita singkat perjalanan kamu → Keahlian inti → Apa yang sedang kamu cari atau tawarkan → Call to action. Gunakan orang pertama ("Saya"), bukan orang ketiga.
PRIORITAS: HIGH

TEMUAN: Foto profil dan banner LinkedIn belum dioptimalkan sebagai alat personal branding visual.
ANALISA: Profil dengan foto profesional mendapat 21x lebih banyak dilihat dan 9x lebih banyak permintaan koneksi. Banner adalah iklan gratis yang hampir semua orang biarkan default.
DAMPAK: Kesan pertama terjadi secara visual sebelum satu kata pun dibaca. Foto yang buruk atau tidak ada sama dengan jabat tangan yang lemah di pertemuan pertama.
REKOMENDASI: Gunakan foto dengan latar belakang bersih, pakaian yang sesuai industri target, dan senyum tulus. Buat banner di Canva dengan warna brand personal kamu dan tambahkan tagline atau keahlian utama. Ukuran: foto 400x400px, banner 1584x396px.
PRIORITAS: MEDIUM

## AREA B — Audit CV dengan Rumus CV

TEMUAN: Sebagian besar bullet point di CV menggunakan format aktivitas tanpa hasil terukur.
ANALISA: Rumus CV yang benar adalah: Kata Kerja Aksi + Objek + Hasil Terukur + Metode/Konteks. Mayoritas CV Indonesia — termasuk kamu — hanya menulis aktivitas: "Bertanggung jawab atas...", "Membantu tim dalam...", "Melakukan kegiatan..."
DAMPAK: Rekruter tidak peduli apa yang kamu lakukan. Mereka peduli apa yang terjadi karena kamu ada di sana. Tanpa angka, klaim kamu tidak bisa diverifikasi dan tidak berkesan.
REKOMENDASI: Review setiap bullet point. Tanya diri sendiri: "Berapa orang terdampak? Berapa persen peningkatannya? Berapa banyak yang berhasil diselesaikan? Dalam berapa waktu?" Tambahkan angka nyata, bahkan estimasi yang honest lebih baik dari tidak ada sama sekali.
PRIORITAS: HIGH

TEMUAN: Urutan dan penekanan pengalaman belum disesuaikan dengan target posisi yang dituju.
ANALISA: CV yang efektif bukan kronologi hidup kamu — ini adalah dokumen pemasaran yang dirancang untuk satu tujuan spesifik. Pengalaman yang paling relevan harus muncul paling atas dan mendapat bullet point paling banyak.
DAMPAK: Jika pengalaman yang paling relevan terkubur di bawah atau hanya dapat 2 bullet point, rekruter yang hanya punya 6 detik tidak akan menemukannya.
REKOMENDASI: Identifikasi 2-3 pengalaman yang paling relevan dengan posisi yang kamu lamar. Pindahkan ke atas (jika format fungsional atau kombinasi) atau beri lebih banyak bullet point. Hapus pengalaman yang tidak relevan sama sekali.
PRIORITAS: HIGH

TEMUAN: Bagian Skills belum menggunakan kategorisasi yang jelas dan bisa dibaca ATS (Applicant Tracking System).
ANALISA: Banyak perusahaan menggunakan ATS untuk menyaring CV sebelum dibaca manusia. ATS membaca keyword, bukan konteks. Jika skill kamu tidak ditulis persis seperti yang ada di job description, kamu bisa tersaring sebelum ada yang membaca.
DAMPAK: CV yang tidak lolos ATS tidak pernah sampai ke meja rekruter — sebagus apapun pengalamanmu.
REKOMENDASI: Buat bagian Skills yang terstruktur: Technical Skills (tool, software, bahasa pemrograman), Soft Skills (3-5 saja, yang bisa dibuktikan), dan Certifications (jika ada). Gunakan kata yang sama persis dengan yang muncul di job description target kamu.
PRIORITAS: HIGH

TEMUAN: Format dan desain CV belum konsisten dan bisa mengganggu pembacaan.
ANALISA: Inkonsistensi font, ukuran, spasi, atau bullet style menciptakan noise visual yang mengalihkan perhatian dari konten. ATS juga kesulitan membaca CV dengan desain yang terlalu kompleks (tabel, kolom dua, grafik skill).
DAMPAK: CV yang terlihat tidak rapi mengirimkan pesan implisit tentang cara kerja kamu: tidak detail, tidak konsisten.
REKOMENDASI: Gunakan satu font (Calibri, Arial, atau Times New Roman), ukuran 10-12pt untuk isi, 14-16pt untuk nama. Hindari kolom dua jika melamar ke perusahaan besar yang menggunakan ATS. Simpan dalam format PDF. Panjang: maksimal 2 halaman untuk pengalaman di bawah 5 tahun.
PRIORITAS: MEDIUM

TEMUAN: ${hasGPA ? "IPK sudah dicantumkan — pastikan diformat dengan benar dan ditempatkan strategis." : "Informasi pendidikan belum dioptimalkan untuk membuat kesan maksimal."}
ANALISA: ${hasGPA ? "IPK yang bagus adalah aset — tapi hanya relevan jika fresh graduate atau 1-2 tahun pertama karier. Setelah itu, pengalaman berbicara lebih keras." : "Detail pendidikan seperti relevansi mata kuliah, skripsi/thesis (jika ada), atau penghargaan akademik sering dilupakan padahal bisa menjadi pembeda."}
DAMPAK: Penempatannya salah bisa membuat IPK yang bagus tidak terbaca, atau justru menonjolkan pendidikan di saat pengalaman yang seharusnya lebih menonjol.
REKOMENDASI: ${hasGPA ? "Format: [Nama Universitas] — [Jurusan], [Tahun Lulus]. IPK: [X.XX / 4.00] (cantumkan hanya jika di atas 3.20). Tambahkan 2-3 pencapaian akademik relevan sebagai bullet point." : "Tambahkan detail relevan: nama lengkap jurusan, konsentrasi (jika ada), tahun lulus, dan 1-2 mata kuliah atau proyek akademik yang relevan dengan posisi target."}
PRIORITAS: MEDIUM

## AREA C — Strategi: Niche, Persona, dan Content Pillar

TEMUAN: Niche atau positioning personal brand belum terdefinisi dengan jelas.
ANALISA: Personal branding yang efektif bukan tentang menjadi semua untuk semua orang. Semakin sempit niche kamu, semakin mudah orang ingat kamu untuk sesuatu yang spesifik. "Saya tertarik di banyak bidang" adalah positioning yang paling lemah.
DAMPAK: Tanpa niche yang jelas, konten kamu tidak akan menarik audiens yang konsisten, dan rekruter tidak akan langsung mengasosiasikan nama kamu dengan keahlian tertentu.
REKOMENDASI: Temukan intersection antara (1) apa yang kamu kuasai, (2) apa yang kamu sukai, dan (3) apa yang dibutuhkan pasar. Dari CV kamu, ada beberapa kandidat niche yang bisa dieksplorasi. Pilih satu dan commit selama 90 hari.
PRIORITAS: HIGH

TEMUAN: Persona konten belum didefinisikan — siapa kamu di mata audiens LinkedIn?
ANALISA: Persona adalah karakter yang kamu mainkan secara konsisten di konten. Apakah kamu "mahasiswa yang jujur tentang struggle kuliah sambil magang"? "Fresh grad yang mendokumentasikan proses job hunting"? "Profesional muda yang berbagi lesson learned dari pengalaman pertamanya"? Tanpa persona, konten kamu tidak membangun koneksi emosional.
DAMPAK: Orang follow orang, bukan CV. Persona yang jelas membuat orang merasa terhubung dan ingin terus mengikuti perjalanan kamu.
REKOMENDASI: Tulis 3-5 kalimat yang menggambarkan "karakter" konten kamu: siapa kamu, apa yang kamu perjuangkan, apa yang kamu percayai, dan bagaimana gaya bicara kamu. Ini jadi panduan konsistensi setiap kali kamu posting.
PRIORITAS: MEDIUM

TEMUAN: Content pillar — kategori konten yang akan kamu buat secara konsisten — belum ada.
ANALISA: Tanpa pillar yang jelas, setiap kali mau posting kamu akan bingung "mau nulis apa ya?" dan akhirnya tidak posting sama sekali. Content pillar adalah menu konten yang sudah diputuskan di awal.
DAMPAK: Inkonsistensi posting = tidak ada momentum = tidak ada pertumbuhan follower = personal brand yang tidak berkembang.
REKOMENDASI: Tetapkan 3-4 content pillar berdasarkan niche kamu. Contoh: (1) Lesson Learned dari Pengalaman, (2) How-to Praktis di Bidang Keahlian, (3) Opini tentang Tren Industri, (4) Cerita Personal/Behind the Scene. Setiap pillar dapat 1-2 post per minggu.
PRIORITAS: MEDIUM

## AREA D — Kualitas & Keterbacaan Konten

TEMUAN: Konten LinkedIn (jika sudah posting) kemungkinan besar menggunakan format paragraf panjang yang tidak mobile-friendly.
ANALISA: 80% pengguna LinkedIn mengakses lewat mobile. Paragraf panjang tanpa jeda terlihat seperti dinding teks di layar kecil — dan orang akan scroll tanpa membaca.
DAMPAK: Konten yang tidak terbaca tidak mendapat engagement. Algoritma LinkedIn menggunakan engagement rate sebagai sinyal distribusi — konten yang tidak engage tidak disebarluaskan.
REKOMENDASI: Gunakan format "1 kalimat = 1 baris" untuk LinkedIn. Setiap 2-3 kalimat, beri baris kosong. Hook (kalimat pembuka) harus bisa berdiri sendiri dan membuat orang ingin klik "lihat selengkapnya". Panjang ideal: 150-300 kata atau 8-15 baris.
PRIORITAS: MEDIUM

TEMUAN: Call to action (CTA) di akhir konten sering tidak ada atau tidak jelas.
ANALISA: Setiap konten yang baik memiliki tujuan: mendapat komentar, mengajak diskusi, atau mengarahkan ke sesuatu. Tanpa CTA, orang membaca dan pergi — tidak ada interaksi yang dihasilkan.
DAMPAK: Engagement rate rendah = distribusi organik rendah = pertumbuhan audiens stagnan.
REKOMENDASI: Akhiri setiap post dengan satu pertanyaan spesifik atau ajakan yang mudah dijawab. Contoh: "Pernah mengalami hal yang sama? Share di kolom komentar." atau "Simpan post ini untuk dipakai saat interview minggu depan." Buat engagement semudah mungkin.
PRIORITAS: MEDIUM

## AREA E — Metrik & Algoritma

TEMUAN: Belum ada sistem untuk mengukur pertumbuhan personal brand secara objektif.
ANALISA: Tanpa metrik, kamu tidak tahu apakah strategi yang kamu jalankan bekerja atau tidak. "Rasanya sudah posting banyak" bukan data.
DAMPAK: Waktu dan energi terbuang untuk aktivitas yang tidak menghasilkan, sementara yang berhasil tidak diulang dan di-scale.
REKOMENDASI: Pantau metrik ini setiap minggu: jumlah follower, rata-rata impressions per post, engagement rate (komentar + likes / impressions), dan jumlah connection request masuk. Catat di spreadsheet sederhana. Lakukan review bulanan untuk identifikasi pola konten yang paling perform.
PRIORITAS: MEDIUM

TEMUAN: Algoritma LinkedIn memberikan bobot berbeda untuk jenis interaksi yang berbeda.
ANALISA: Komentar bernilai lebih tinggi dari likes dalam algoritma LinkedIn. Konten yang mendapat banyak komentar di 30-60 menit pertama akan didistribusikan lebih luas. Ini adalah "golden window" yang sering diabaikan.
DAMPAK: Posting di waktu yang salah atau tidak membalas komentar di jam pertama bisa mengurangi jangkauan konten hingga 70%.
REKOMENDASI: Posting di waktu peak engagement: Selasa-Kamis, antara 07.00-09.00 atau 12.00-13.00 WIB. Setelah posting, aktif balas setiap komentar dalam 1 jam pertama. Engage lebih dulu dengan 5-10 post orang lain sebelum memposting konten sendiri.
PRIORITAS: LOW

# CONTOH PERBAIKAN KONKRET

## Ringkasan / Summary Pembuka

SEBELUM: "Mahasiswa aktif yang memiliki minat di berbagai bidang dan ingin berkembang di lingkungan profesional. Terbiasa bekerja dalam tim dan memiliki kemampuan komunikasi yang baik."

SESUDAH: "Saya ${name} — ${level.toLowerCase()} dengan rekam jejak ${hasOrganization ? "kepemimpinan organisasi dan" : ""} pengalaman ${hasInternship ? "magang di lingkungan profesional" : "memimpin proyek dari awal sampai selesai"}. ${hasSkills ? "Saya menguasai tools yang langsung bisa dipakai kerja" : "Saya membawa perspektif segar dengan kemampuan belajar cepat yang terbukti"} — dan saya tidak datang untuk sekadar belajar, tapi untuk berkontribusi nyata dari hari pertama."

## Pengalaman Kerja / Organisasi

### Pengalaman 1 (Contoh Rewrite)

SEBELUM: "Bertanggung jawab atas pembuatan konten media sosial organisasi dan membantu koordinasi acara."

SESUDAH: "Mengembangkan strategi konten media sosial yang meningkatkan engagement Instagram sebesar 40% dalam 3 bulan, dengan memproduksi 12 post per bulan menggunakan framework storytelling berbasis data insight."

### Pengalaman 2 (Contoh Rewrite)

SEBELUM: "Menjadi bagian dari tim yang melaksanakan program kerja divisi dan mengikuti rapat mingguan."

SESUDAH: "Mengkoordinasikan 5 anggota tim dalam eksekusi 3 program kerja semester, dengan tingkat kehadiran peserta rata-rata 85% dan feedback kepuasan 4.2/5 dari 120 responden survei."

### Pengalaman 3 (Contoh Rewrite)

SEBELUM: "Membantu perusahaan dalam pekerjaan sehari-hari dan belajar cara kerja industri."

SESUDAH: "Berkontribusi pada proyek analisis data pelanggan yang mengidentifikasi 3 segmen pasar baru, membantu tim marketing menyusun strategi yang akhirnya diimplementasikan di Q3 2024."

### Pengalaman 4 (Contoh Rewrite)

SEBELUM: "Melakukan presentasi dan membuat laporan untuk keperluan akademik dan organisasi."

SESUDAH: "Mempresentasikan hasil riset kepada audiens 50+ orang di forum nasional, mendapat rating 4.5/5 dari panelis dan diundang sebagai pembicara di 2 event lanjutan."

### Pengalaman 5 (Contoh Rewrite)

SEBELUM: "Aktif di berbagai kegiatan kampus dan memiliki pengalaman kepanitiaan."

SESUDAH: "Mengelola anggaran kepanitiaan Rp 15 juta untuk event 300 peserta dengan zero overrun budget, sambil mengkoordinasikan 20 relawan dari 5 divisi berbeda selama 4 bulan persiapan."

## Kalimat Positioning

"Saya bantu ${hasInternship ? "tim dan perusahaan" : "organisasi dan komunitas"} yang butuh ${hasSkills ? "eksekusi teknis yang cepat dan terukur" : "ide segar yang bisa langsung diimplementasikan"} — lewat kombinasi pengalaman ${hasOrganization ? "kepemimpinan nyata" : "kerja kolaboratif"} dan kemampuan belajar yang terbukti dari track record akademik dan profesional ${name}."

# RENCANA EKSEKUSI

## Minggu 1 — Benahi Etalase

- Perbarui headline LinkedIn: hapus "Mahasiswa di" atau jabatan generik, ganti dengan formula keahlian + nilai + target
- Tulis ulang bagian About LinkedIn: hook kuat 2 kalimat, cerita singkat, 3 keahlian inti, CTA
- Upload foto profil profesional (latar bersih, ekspresi ramah, pakaian appropriate)
- Buat banner LinkedIn di Canva dengan tagline dan warna konsisten
- Rewrite minimal 3 bullet point pengalaman utama dengan rumus: kata kerja + objek + angka + metode
- Tambahkan atau perbarui bagian Skills dengan keyword yang relevan dengan industri target
- Simpan CV dalam format PDF dengan nama file: [NamaLengkap]_CV_[Bulan][Tahun].pdf
- Minta 3-5 orang yang pernah bekerja sama untuk memberi endorsement di LinkedIn

## Minggu 2-4 — Mulai Posting

- Posting pertama: perkenalan diri dengan format storytelling (ini bukan bio — ini cerita)
- Tetapkan jadwal posting: 2-3x per minggu, hari Selasa/Rabu/Kamis, jam 07.30 atau 12.00 WIB
- Gunakan 3 content pillar yang sudah dipilih: rotasi agar tidak monoton
- Balas SEMUA komentar dalam 1 jam pertama setelah posting
- Engage dengan 10 post orang lain setiap hari (komentar bermakna, bukan sekadar "great post!")
- Kirimkan 5 connection request per hari ke orang yang relevan dengan karier target kamu
- Buat template Canva untuk visual konten agar terlihat konsisten

## Bulan 2-3 — Iterasi & Evaluasi

- Review performa konten mingguan: post mana yang paling banyak impressions dan engagement?
- Identifikasi pola: topik apa, format apa, waktu apa yang paling perform?
- Double down pada yang berhasil, hentikan yang tidak menghasilkan setelah 4x percobaan
- Mulai lamar 3-5 posisi per minggu menggunakan CV yang sudah diperbarui
- Track semua lamaran dalam spreadsheet: perusahaan, posisi, tanggal, status
- Perbarui CV setiap 2 minggu berdasarkan feedback yang masuk
- Target bulan ke-3: follower LinkedIn naik minimal 30%, connection +100, respons lamaran minimal 15%

# SKOR AKHIR

| Area | Skor | Catatan |
|------|------|---------|
| Fondasi Profil LinkedIn | ${hasLinkedin ? "9" : "5"} / 20 | ${hasLinkedin ? "URL ada tapi belum dioptimalkan secara aktif" : "Profil belum diintegrasikan atau tidak ada URL"} |
| CV / Impact | ${cvLength > 2000 ? "10" : "7"} / 20 | ${cvLength > 2000 ? "Ada materi yang cukup tapi belum pakai rumus dampak" : "CV masih ringkas, butuh lebih banyak detail terukur"} |
| Niche & Positioning | 6 / 15 | Positioning belum tajam, terlalu general untuk satu niche |
| Content Pillar | 4 / 10 | Pillar belum terdefinisi, konten belum konsisten |
| Kualitas Konten | ${hasSkills ? "13" : "10"} / 20 | ${hasSkills ? "Ada skill teknis yang bisa jadi bahan konten berkualitas" : "Potensi konten ada, tapi belum dieksekusi dengan format yang tepat"} |
| Strategi Metrik | 5 / 15 | Belum ada sistem pengukuran yang aktif digunakan |
| **TOTAL** | **${hasLinkedin ? (hasSkills ? "47" : "41") : (hasSkills ? "43" : "37")} / 100** | **Fondasi ada, tapi eksekusi dan komunikasi perlu upgrade signifikan** |

Angka ini bukan hukuman — ini titik awal. Skor ${hasLinkedin ? (hasSkills ? "47" : "41") : (hasSkills ? "43" : "37")}/100 berarti ada 53+ poin yang bisa kamu raih dalam 90 hari ke depan dengan eksekusi yang benar. Kandidat yang memulai dari titik ini dan mengikuti rencana di dokumen ini biasanya melihat peningkatan 25-35 poin dalam satu kuartal — dan yang lebih penting, mulai mendapat respons lamaran dan pesan masuk dari rekruter.

# IDE KONTEN SIAP PAKAI

## Pilar Story (cerita pengalaman)

1. "Hal yang tidak ada yang ceritakan tentang [pengalaman spesifik di CV kamu] — dan yang membuat saya tumbuh paling cepat"
2. "Saya ditolak [X kali] sebelum akhirnya [pencapaian di CV]. Ini yang saya pelajari."
3. "Hari pertama [pengalaman baru]: ekspektasi vs realita yang tidak ada yang bilang sebelumnya"
4. "Kesalahan terbesar yang saya buat di [pengalaman] — dan bagaimana saya memperbaikinya"
5. "Timeline jujur perjalanan saya dari [titik awal] ke [titik saat ini]"
6. "Apa yang tidak tertulis di CV saya tapi justru paling membentuk cara kerja saya"
7. "Momen ketika saya hampir menyerah di [proyek/program] — dan kenapa saya lanjut"
8. "Pelajaran dari [mentor/atasan/rekan] yang paling sering saya ingat sampai sekarang"

## Pilar How-to (panduan praktis)

1. "Cara saya mengerjakan [tugas spesifik] dalam waktu [X jam] — template gratis di komentar"
2. "5 kesalahan CV yang saya lihat setiap minggu (dan cara mudah memperbaikinya)"
3. "Framework yang saya pakai untuk [skill yang kamu punya] — step by step"
4. "Cara minta feedback yang jujur tanpa bikin canggung — script yang bisa langsung dipakai"
5. "Tool gratis yang saya gunakan setiap hari untuk [produktivitas/skill spesifik]"
6. "Cara mempersiapkan wawancara kerja dalam 48 jam — yang benar-benar bekerja"
7. "Panduan networking LinkedIn untuk introvert yang tidak suka basa-basi"
8. "Checklist yang saya gunakan sebelum submit lamaran kerja (simpan ini)"

## Pilar Insight (sudut pandang)

1. "Hot take: IPK tinggi tidak menjamin karier yang baik — tapi ini yang benar-benar penting"
2. "Kenapa saya berhenti mengejar 'pengalaman' dan mulai mengejar 'hasil terukur'"
3. "Yang tidak diajarkan kuliah tentang dunia kerja nyata — dari pengalaman pertama saya"
4. "Perdebatan: apakah magang wajib untuk fresh grad? Pandangan saya setelah menjalaninya"
5. "Tren yang saya lihat di industri [bidang kamu] yang belum banyak dibicarakan"
6. "Jujur: ini yang membuat saya lebih berkembang dari semua mata kuliah yang pernah saya ambil"

# PERTANYAAN WAWANCARA

**"Ceritakan tentang diri kamu."**
→ Ini bukan pertanyaan tentang hidup kamu — ini tentang relevansi kamu untuk posisi ini. Struktur: (1) siapa kamu secara profesional sekarang, (2) perjalanan singkat yang relevan, (3) mengapa kamu di sini. Maksimal 90 detik. Latih sampai terdengar natural, bukan hafalan.

**"Apa kelebihan dan kekurangan terbesar kamu?"**
→ Untuk kelebihan, pilih yang bisa dibuktikan dengan contoh nyata dari CV — jangan pilih yang tidak bisa kamu demonstrasikan. Untuk kekurangan, pilih yang nyata tapi sudah ada langkah perbaikannya. Jawaban yang jujur dan self-aware selalu lebih kuat dari jawaban yang terlalu sempurna.

**"Mengapa kamu tertarik bekerja di sini?"**
→ Riset perusahaan minimal 30 menit sebelum wawancara. Hubungkan nilai perusahaan dengan pengalaman spesifik kamu. Hindari jawaban generik seperti "karena perusahaan ini bagus dan saya ingin belajar." Itu tidak membedakan kamu dari 50 kandidat lainnya.

**"Di mana kamu melihat diri kamu 5 tahun ke depan?"**
→ Tunjukkan ambisi yang realistis dan sejalan dengan industri. Tidak perlu menyebut posisi spesifik di perusahaan ini — fokus pada kemampuan dan dampak yang ingin kamu capai. Akhiri dengan menghubungkan kembali ke peran yang sedang dilamar.

**"Ceritakan situasi di mana kamu menghadapi konflik dalam tim dan bagaimana kamu mengatasinya."**
→ Gunakan framework STAR: Situation (konteks singkat), Task (peran kamu), Action (apa yang kamu lakukan spesifik), Result (hasil konkret). Jangan ceritakan konflik yang membuat kamu atau orang lain terlihat sangat buruk — pilih yang menunjukkan kedewasaan dan kemampuan problem-solving kamu.

**"Apa pencapaian terbesar kamu?"**
→ Pilih pencapaian yang paling relevan dengan posisi yang dilamar, bukan yang paling impresif secara general. Sertakan angka jika ada. Jelaskan tantangan, proses, dan dampaknya — bukan hanya hasilnya.

**"Apakah ada pertanyaan untuk kami?"**
→ SELALU siapkan 2-3 pertanyaan cerdas. Ini menunjukkan antusiasme dan persiapan. Contoh: "Apa yang membedakan orang yang sangat sukses di posisi ini dari yang rata-rata?" atau "Seperti apa proses onboarding untuk posisi ini?" Hindari bertanya tentang gaji atau benefit di tahap pertama wawancara.

---

${firstName}, dokumen ini adalah peta — tapi peta tidak ada gunanya tanpa langkah nyata. Mulai dari satu hal hari ini: perbarui headline LinkedIn kamu. Besok, rewrite satu bullet point CV. Lusa, posting konten pertama. Momentum dibangun dari aksi kecil yang konsisten, bukan dari rencana besar yang tidak pernah dimulai.

Kalau kamu butuh feedback atau ada yang ingin didiskusikan lebih lanjut, DonaTalks ada di sini. Selamat bekerja — kamu sudah selangkah lebih maju dari kebanyakan orang hanya dengan membaca ini sampai akhir.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cv_text, linkedin_url, session_id } = body;

    if (!name || !cv_text) {
      return Response.json({ error: "Nama dan CV wajib diisi" }, { status: 400 });
    }

    const id = uuidv4();

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

    const fullContent = generateAnalysis(name, cv_text, linkedin_url || null);

    // Extract preview: first 2 sections (RINGKASAN EKSEKUTIF + KONTEKS KLIEN)
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
