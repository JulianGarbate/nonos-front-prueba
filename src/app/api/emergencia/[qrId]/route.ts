import { NextResponse } from "next/server";

// Proxy hacia POST /qr/:id/acceder del backend (el código viaja en el body).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: Request, ctx: { params: Promise<{ qrId: string }> }) {
  const { qrId } = await ctx.params;
  const { codigo } = (await request.json().catch(() => ({}))) as { codigo?: string };
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });

  try {
    const r = await fetch(`${API_URL.replace(/\/$/, "")}/qr/${encodeURIComponent(qrId)}/acceder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const json: unknown = await r.json().catch(() => ({}));
    return NextResponse.json(json, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo comunicar con NONOS" }, { status: 502 });
  }
}
