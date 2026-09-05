import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ variable: "--font-kosmos-body", subsets: ["latin"] });

const spaceGrotesk = Space_Grotesk({
  variable: "--font-kosmos-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kosmos",
  description: "Decentralized event ticketing",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
