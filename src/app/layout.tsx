import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FactuVérif — Contrôle des factures fournisseurs",
  description:
    "Comparez les prix des factures de vos fournisseurs avec vos prix négociés et repérez les écarts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          FactuVérif · Contrôle des factures fournisseurs pour la restauration
        </footer>
      </body>
    </html>
  );
}
