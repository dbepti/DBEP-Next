"use client";
import { useEffect, useState } from "react";
import { wkApi, dokumenApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Stats {
  total_wk: number;
  wk_aktif: number;
  wk_terminasi: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [docStats, setDocStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([wkApi.stats(), dokumenApi.stats()])
      .then(([wkData, docData]) => {
        setStats(wkData);
        setDocStats(docData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <h1 className="text-[15px] font-medium text-gray-900 flex-1">Dashboard</h1>
        <span className="text-[11px] text-gray-400">DBEP-Next · SKK Migas · Spektrum IOG 4.0</span>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Dokumen", value: docStats?.total ?? "—", color: "text-gray-900" },
            { label: "WK Aktif", value: stats?.wk_aktif ?? "—", color: "text-green-700" },
            { label: "WK Terminasi", value: stats?.wk_terminasi ?? "—", color: "text-gray-500" },
            { label: "Total WK", value: stats?.total_wk ?? "—", color: "text-blue-700" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-4 text-center">
              <div className={`text-2xl font-medium ${s.color}`}>
                {loading ? "..." : s.value.toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick access grid */}
        <div>
          <h2 className="text-[13px] font-medium text-gray-700 mb-3">Akses Cepat</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "WP&B Eksplorasi", href: "/dokumen/wpb-eksplorasi", desc: "Rencana Kerja & Anggaran", color: "border-blue-200 hover:border-blue-400" },
              { label: "AFE", href: "/dokumen/afe", desc: "Authorization For Expenditure", color: "border-amber-200 hover:border-amber-400" },
              { label: "POD / POP", href: "/dokumen/pod", desc: "Plan of Development", color: "border-green-200 hover:border-green-400" },
              { label: "Cadangan Migas", href: "/dokumen/cadangan", desc: "Laporan Cadangan Tahunan", color: "border-purple-200 hover:border-purple-400" },
              { label: "Prospect & Leads", href: "/dokumen/prospect-leads", desc: "Laporan Prospek Tahunan", color: "border-teal-200 hover:border-teal-400" },
              { label: "Pencarian AI", href: "/search", desc: "Cari dengan bahasa natural", color: "border-pink-200 hover:border-pink-400" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`bg-white border rounded-lg p-4 transition-colors ${item.color}`}
              >
                <div className="text-[13px] font-medium text-gray-900">{item.label}</div>
                <div className="text-[11px] text-gray-400 mt-1">{item.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Upload zone */}
        <div>
          <h2 className="text-[13px] font-medium text-gray-700 mb-3">Unggah Dokumen Baru</h2>
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
            <div className="text-[13px] text-gray-500">
              Seret & lepas file PDF di sini, atau{" "}
              <span className="text-blue-600 font-medium">pilih file</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-2">PDF, TIFF, JPG — maks 50 MB per file</div>
          </div>
        </div>
      </div>
    </div>
  );
}
