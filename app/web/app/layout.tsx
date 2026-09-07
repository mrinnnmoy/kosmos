import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

import "./globals.css";

const inter = Inter({
  variable: "--font-kosmos-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-kosmos-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kosmos — Tickets backed by escrow, not promises.",
  description:
    "Event ticketing with escrowed payments, Selfie Check identity verification, and NFT proof of attendance.",
  openGraph: {
    title: "Kosmos",
    description: "Tickets backed by escrow, not promises.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
