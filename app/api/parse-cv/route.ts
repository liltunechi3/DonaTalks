import { NextRequest } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();

    let text = "";

    if (fileName.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (fileName.endsWith(".doc")) {
      return Response.json(
        { error: "Format .doc lama tidak didukung. Simpan ulang sebagai .docx atau .pdf." },
        { status: 400 }
      );
    } else {
      return Response.json({ error: "Format tidak didukung. Gunakan PDF atau DOCX." }, { status: 400 });
    }

    // Clean up extracted text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 50) {
      return Response.json(
        { error: "Gagal membaca teks dari file. Pastikan file tidak berupa scan/gambar." },
        { status: 400 }
      );
    }

    return Response.json({ text });
  } catch (err: unknown) {
    console.error("Parse CV error:", err);
    return Response.json({ error: "Gagal memproses file. Coba lagi." }, { status: 500 });
  }
}
