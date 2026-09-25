"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartPulse, Wind, Moon, Activity, Footprints, ChevronDown, type LucideIcon } from "lucide-react";
import { Medicion, TipoMedicion, getMediciones, mensajeDeError } from "@/lib/api";
import { Card, Empty, ErrorText, formatFecha, Loading, SectionTitle } from "@/components/ui";

const TIPOS: { tipo: TipoMedicion; label: string; unidad: string; icon: LucideIcon }[] = [
  { tipo: "FRECUENCIA_CARDIACA", label: "Frecuencia cardíaca", unidad: "bpm", icon: HeartPulse },
  { tipo: "SPO2", label: "Oxígeno en sangre", unidad: "%", icon: Wind },
  { tipo: "PASOS", label: "Pasos", unidad: "pasos", icon: Footprints },
  { tipo: "SUENO", label: "Sueño", unidad: "", icon: Moon },
  { tipo: "HRV", label: "Variabilidad cardíaca", unidad: "ms", icon: Activity },
];

const horasMin = (min: number) => `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`;
const fmt = (tipo: TipoMedicion, v: number) => (tipo === "SUENO" ? horasMin(v) : Number.isInteger(v) ? String(v) : v.toFixed(1));

function Sparkline({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const w = 120, h = 36, pad = 4;
  const min = Math.min(...valores), max = Math.max(...valores), rango = max - min || 1;
  const pts = valores.map((v, i) => [pad + (i * (w - pad * 2)) / (valores.length - 1), pad + (1 - (v - min) / rango) * (h - pad * 2)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Tendencia de las últimas lecturas" className="shrink-0">
      <path d={pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} fill="none" stroke="#25665F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill="#25665F" stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

function TarjetaTipo({ def, datos }: { def: (typeof TIPOS)[number]; datos: Medicion[] }) {
  const [abierto, setAbierto] = useState(false);
  const Icon = def.icon;
  // datos vienen del más reciente al más viejo
  const ultimo = datos[0];
  const ult24 = datos.filter((m) => Date.now() - new Date(m.timestamp).getTime() < 24 * 3600 * 1000);
  const vals = ult24.map((m) => m.valor);
  const prom = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const hoy = new Date().toDateString();
  const totalHoy = datos.filter((m) => new Date(m.timestamp).toDateString() === hoy).reduce((a, m) => a + m.valor, 0);
  const serie = [...datos].slice(0, 24).reverse().map((m) => m.valor);

  return (
    <Card className="flex flex-col gap-3 !p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F0EE] text-[#25665F]"><Icon size={20} aria-hidden /></span>
          <div>
            <p className="text-sm font-semibold text-[#3F4947]">{def.label}</p>
            {ultimo ? (
              <p className="text-2xl font-bold text-[#181C1B]">{fmt(def.tipo, ultimo.valor)} <span className="text-sm font-normal text-[#3F4947]">{def.unidad}</span></p>
            ) : (
              <p className="text-sm text-[#6F7977]">Sin datos recibidos</p>
            )}
          </div>
        </div>
        <Sparkline valores={serie} />
      </div>
      {ultimo && (
        <>
          <p className="text-xs text-[#6F7977]">Última lectura: {formatFecha(ultimo.timestamp, true)} · {datos.length} lecturas en este rango</p>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            {def.tipo === "PASOS" ? (
              <div className="col-span-3"><dt className="text-xs text-[#6F7977]">Total de hoy</dt><dd className="font-semibold">{totalHoy.toLocaleString("es-AR")} pasos</dd></div>
            ) : (
              <>
                <div><dt className="text-xs text-[#6F7977]">Promedio 24 h</dt><dd className="font-semibold">{prom != null ? fmt(def.tipo, prom) : "—"}</dd></div>
                <div><dt className="text-xs text-[#6F7977]">Mínimo</dt><dd className="font-semibold">{vals.length ? fmt(def.tipo, Math.min(...vals)) : "—"}</dd></div>
                <div><dt className="text-xs text-[#6F7977]">Máximo</dt><dd className="font-semibold">{vals.length ? fmt(def.tipo, Math.max(...vals)) : "—"}</dd></div>
              </>
            )}
          </dl>
          <button onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="flex min-h-9 items-center gap-1 self-start text-sm font-semibold text-[#25665F] underline">
            <ChevronDown size={16} className={abierto ? "rotate-180" : ""} aria-hidden /> {abierto ? "Ocultar lecturas" : "Ver lecturas recibidas"}
          </button>
          {abierto && (
            <div className="max-h-64 overflow-auto rounded-lg border border-[#E0E4E3]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#F1F4F2] text-left text-xs text-[#3F4947]"><tr><th className="p-2">Fecha y hora</th><th className="p-2">Valor</th></tr></thead>
                <tbody>
                  {datos.slice(0, 300).map((m) => (
                    <tr key={m.id} className="border-t border-[#E0E4E3]"><td className="p-2">{formatFecha(m.timestamp, true)}</td><td className="p-2 font-semibold">{fmt(def.tipo, m.valor)} {def.unidad}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/** Datos que llegaron desde Google Health (últimos 7 días), tal como los guardó el backend. */
const RANGOS = [
  { key: "1", label: "24 horas", dias: 1 },
  { key: "7", label: "7 días", dias: 7 },
  { key: "30", label: "30 días", dias: 30 },
  { key: "todo", label: "Todo el historial", dias: null },
] as const;

export default function DatosPulsera({ usuarioId, refreshKey = 0 }: { usuarioId: string; refreshKey?: number }) {
  const [rango, setRango] = useState<(typeof RANGOS)[number]["key"]>("7");
  const [datos, setDatos] = useState<Record<string, Medicion[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    const dias = RANGOS.find((r) => r.key === rango)?.dias ?? null;
    const desde = dias ? new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString() : undefined;
    try {
      const res = await Promise.all(TIPOS.map((t) => getMediciones(usuarioId, t.tipo, desde)));
      setDatos(Object.fromEntries(TIPOS.map((t, i) => [t.tipo, res[i]])));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudieron cargar los datos de la pulsera."));
    } finally {
      setCargando(false);
    }
  }, [usuarioId, rango]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  const total = Object.values(datos).reduce((a, l) => a + l.length, 0);

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Datos recibidos de Google Health</SectionTitle>
      <div role="group" aria-label="Rango de tiempo" className="flex flex-wrap gap-2">
        {RANGOS.map((r) => (
          <button key={r.key} aria-pressed={rango === r.key} onClick={() => { setCargando(true); setRango(r.key); }} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${rango === r.key ? "bg-[#25665F] text-white" : "border border-[#E0E4E3] bg-white text-[#3F4947]"}`}>{r.label}</button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      {cargando && <Loading />}
      {!cargando && total === 0 && !error && <Empty>Todavía no llegaron datos. Conectá la pulsera y tocá “Sincronizar”: si Google no tiene lecturas recientes, esto queda vacío.</Empty>}
      {!cargando && total > 0 && <ul className="flex flex-col gap-3">{TIPOS.map((t) => <li key={t.tipo}><TarjetaTipo def={t} datos={datos[t.tipo] ?? []} /></li>)}</ul>}
    </div>
  );
}
