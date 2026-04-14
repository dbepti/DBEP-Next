import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DocType, DocStatus } from "@/types/ppdm";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number, currency = "USD"): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date?: string): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getTahun(date?: string): string {
  if (!date) return "—";
  return new Date(date).getFullYear().toString();
}

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  WPB_EKSPLORASI:  "WP&B Eksplorasi",
  WPB_EKSPLOITASI: "WP&B Eksploitasi",
  AFE:             "AFE",
  POD:             "POD",
  POP:             "POP",
  CADANGAN:        "Cadangan Migas",
  PROSPECT_LEADS:  "Prospect & Leads",
  KOMITMEN:        "Komitmen",
  JIAN:            "JIAN",
};

export const STATUS_COLOR: Record<DocStatus, string> = {
  ORIGINAL: "bg-blue-50 text-blue-800 border-blue-200",
  REVISI:   "bg-amber-50 text-amber-800 border-amber-200",
  VALID:    "bg-green-50 text-green-800 border-green-200",
};

export const WK_CATEGORY_COLOR: Record<string, string> = {
  WK_ACTIVE:       "bg-green-50 text-green-800",
  WK_TERMINATED:   "bg-gray-100 text-gray-600",
  WK_RELINQUISHED: "bg-red-50 text-red-700",
  WK_UNITIZED:     "bg-purple-50 text-purple-800",
  WK_CANDIDATE:    "bg-orange-50 text-orange-800",
};
