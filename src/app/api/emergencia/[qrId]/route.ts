import http from "node:http";
import https from "node:https";
import { NextResponse } from "next/server";

// El backend expone GET /qr/:id y recibe el código en el BODY. Los navegadores
// (y fetch) no pueden enviar un body en un GET, así que este endpoint lo hace
// desde el servidor de Next con el módulo http de Node.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getConBody(url: string, body: unknown): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(body);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      u,
      { method: "GET", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 500, data }));
      },
    );
    req.setTimeout(15_000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ qrId: string }> }) {
  const { qrId } = await ctx.params;
  const { codigo } = (await request.json().catch(() => ({}))) as { codigo?: string };
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });

  try {
    const r = await getConBody(`${API_URL.replace(/\/$/, "")}/qr/${encodeURIComponent(qrId)}`, { codigo });
    let json: unknown = {};
    try {
      json = JSON.parse(r.data);
    } catch {
      /* respuesta no JSON */
    }
    return NextResponse.json(json, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo comunicar con NONOS" }, { status: 502 });
  }
}
