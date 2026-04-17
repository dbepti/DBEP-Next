/**
 * Next.js API Route — Proxy ke FastAPI backend
 * Frontend memanggil /api/proxy/wk/... → diteruskan ke localhost:8000/api/wk/...
 * Port 8000 tidak perlu public — semua lewat port 3000
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path    = params.path.join("/");
  const search  = req.nextUrl.search || "";
  const url     = `${BACKEND}/api/${path}${search}`;

  try {
    const init: RequestInit = {
      method : req.method,
      headers: { "Content-Type": "application/json" },
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = await req.text();
      if (body) init.body = body;
    }

    const res  = await fetch(url, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { detail: `Backend error: ${e.message}` },
      { status: 502 }
    );
  }
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const DELETE = handler;
