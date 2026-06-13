import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "DonaTalks — Analisa Personal Branding & CV",
  description:
    "Dari CV yang padat prestasi, menjadi personal brand yang kepake. Audit mendalam CV & personal branding-mu oleh AI.",
  openGraph: {
    title: "DonaTalks — Analisa Personal Branding & CV",
    description:
      "Audit mendalam CV & personal branding-mu oleh AI, dengan gaya konsultan nyata.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
