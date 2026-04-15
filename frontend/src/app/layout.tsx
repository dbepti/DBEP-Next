import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DBEP-Next | SKK Migas",
  description: "Database Eksplorasi & Produksi — Spektrum IOG 4.0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ display:"flex", height:"100vh", background:"#212121", overflow:"hidden", margin:0 }}>
        <Sidebar />
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
