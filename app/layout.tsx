import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "PDFのページを、整える。｜iruagaru";
const description = "PDFの結合、ページの並べ替え、回転、削除をブラウザ内だけで行うPDF編集ツール。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const imageUrl = new URL("/og.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title,
    description,
    applicationName: "iruagaru / PDF Tools",
    icons: { icon: "/favicon.png", apple: "/favicon.png" },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "PDFのページを、整える。" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
