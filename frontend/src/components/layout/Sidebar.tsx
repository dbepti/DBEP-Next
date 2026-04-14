"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV = [
  {
    section: "Semua Dokumen",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Unggah Dokumen", href: "/upload" },
    ],
  },
  {
    section: "Eksplorasi",
    items: [
      { label: "Komitmen WP&B", href: "/dokumen/wpb", count: null },
      { label: "WP&B Eksplorasi", href: "/dokumen/wpb-eksplorasi", sub: true },
      { label: "AFE", href: "/dokumen/afe", sub: true },
      { label: "Resources (P/L)", href: "/dokumen/resources", sub: true },
    ],
  },
  {
    section: "Development",
    items: [
      { label: "POD / POP", href: "/dokumen/pod", sub: true },
      { label: "PMF / EOR", href: "/dokumen/pmf", sub: true },
    ],
  },
  {
    section: "Eksploitasi",
    items: [
      { label: "WP&B Eksploitasi", href: "/dokumen/wpb-eksploitasi", sub: true },
      { label: "AFE", href: "/dokumen/afe-eksploitasi", sub: true },
      { label: "Cadangan Migas", href: "/dokumen/cadangan", sub: true },
    ],
  },
  {
    section: "Kelola",
    items: [
      { label: "Wilayah Kerja", href: "/wk" },
      { label: "KKKS", href: "/kkks" },
      { label: "Pencarian AI", href: "/search" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex flex-col flex-shrink-0 bg-[#0f2744] text-white">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="text-[13px] font-medium leading-tight">DBEP-Next</div>
        <div className="text-[10px] text-white/40 mt-0.5">SKK Migas · Spektrum IOG 4.0</div>
      </div>

      {/* User */}
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[#185fa5] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
          HM
        </div>
        <div>
          <div className="text-[12px] text-white/85 truncate">Heru Murdha...</div>
          <div className="text-[10px] text-white/40">Analis Data WK</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-3.5 pt-3 pb-1 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
              {group.section}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 text-[11px] transition-colors",
                  item.sub ? "pl-7 pr-3 py-1.5" : "px-3.5 py-1.5",
                  pathname === item.href
                    ? item.sub
                      ? "bg-[#185fa5]/50 text-[#9fe1cb]"
                      : "bg-[#185fa5] text-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white/90"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3.5 py-2.5 border-t border-white/10 flex gap-4 text-[11px] text-white/40">
        <Link href="/settings" className="hover:text-white/70">Pengaturan</Link>
        <button className="hover:text-white/70">Keluar</button>
      </div>
    </aside>
  );
}
