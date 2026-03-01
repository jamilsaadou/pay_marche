import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marche de la Refondation - Paiements",
  description: "Plateforme de gestion de paiements, collectes et attribution de boutiques",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${dmSans.variable} ${playfair.variable} antialiased`}>{children}</body>
    </html>
  );
}
