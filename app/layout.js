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
  title: "Daily Finance",
  description:
    "Aplikasi pencatatan pemasukan dan pengeluaran harian.",
  applicationName: "Daily Finance",

  appleWebApp: {
    capable: true,
    title: "Daily Finance",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
