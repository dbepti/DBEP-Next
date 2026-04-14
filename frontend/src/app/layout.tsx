import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DBEP-Next | SKK Migas",
  description: "Database Eksplorasi & Produksi — Spektrum IOG 4.0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
