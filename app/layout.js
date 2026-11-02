import { SerwistProvider } from "@serwist/turbopack/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "DuetKu",
    template: "%s | DuetKu",
  },
  description:
    "Keuangan pribadi, lebih terarah. Catat transaksi, pantau anggaran, dan pahami arus kasmu.",
  applicationName: "DuetKu",

  appleWebApp: {
    capable: true,
    title: "DuetKu",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "DuetKu",
    description: "Keuangan pribadi, lebih terarah.",
    siteName: "DuetKu",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "DuetKu",
    description: "Keuangan pribadi, lebih terarah.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full">
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
