// ============================================================
// DBEP-Next — API Client
// Wrapper untuk FastAPI backend
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

// ---- Wilayah Kerja ----
export const wkApi = {
  list: (params?: { status?: string; tipe?: string; limit?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return fetchAPI<any[]>(`/api/wk?${q}`);
  },
  get: (id: string) => fetchAPI<any>(`/api/wk/${id}`),
  dokumen: (id: string, params?: { doc_type?: string; tahun?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return fetchAPI<any>(`/api/wk/${id}/dokumen?${q}`);
  },
  operatorship: (id: string) => fetchAPI<any>(`/api/wk/${id}/operatorship`),
  stats: () => fetchAPI<any>(`/api/wk/stats/ringkasan`),
};

// ---- Dokumen ----
export const dokumenApi = {
  list: (params?: {
    wk_id?: string;
    doc_type?: string;
    tahun?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    );
    return fetchAPI<any[]>(`/api/dokumen?${q}`);
  },
  get: (id: string) => fetchAPI<any>(`/api/dokumen/${id}`),
  stats: (wk_id?: string) =>
    fetchAPI<any>(`/api/dokumen/stats${wk_id ? `?wk_id=${wk_id}` : ""}`),
  upload: (formData: FormData) =>
    fetch(`${API_BASE}/api/dokumen/upload`, { method: "POST", body: formData })
      .then((r) => r.json()),
};

// ---- KKKS ----
export const kkksApi = {
  list: () => fetchAPI<any[]>(`/api/kkks`),
  get: (id: string) => fetchAPI<any>(`/api/kkks/${id}`),
  wk: (id: string) => fetchAPI<any>(`/api/kkks/${id}/wk`),
};

// ---- Search ----
export const searchApi = {
  search: (q: string, params?: { wk_id?: string; doc_type?: string; mode?: "fts" | "semantic" }) => {
    const query = new URLSearchParams({ q, ...params } as Record<string, string>);
    return fetchAPI<any>(`/api/search?${query}`);
  },
  suggest: (q: string) => fetchAPI<any>(`/api/search/suggest?q=${q}`),
};
