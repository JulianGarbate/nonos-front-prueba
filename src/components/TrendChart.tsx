"use client";

import { useId, useMemo, useState } from "react";

export interface Punto {
  t: number; // ms epoch
  v: number;
}

interface Props {
  puntos: Punto[];
  modo?: "linea" | "barras";
  /** Banda de referencia (por ejemplo, la rutina habitual): [mínimo, máximo] y promedio. */
  banda?: { min: number; max: number; media: number } | null;
  dominio?: [number, number];
  formatoValor: (v: number) => string;
  /** Etiquetas cortas del eje Y (por defecto, las mismas que el valor). */
  formatoTick?: (v: number) => string;
  formatoEje?: (t: number) => string;
  unidad?: string;
  etiqueta: string;
  alto?: number;
}

const W = 600;
const M = { l: 50, r: 10, t: 12, b: 24 };

const fechaCorta = (t: number) => new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
const fechaLarga = (t: number) => new Date(t).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });

/** Gráfico SVG sin dependencias: línea con área o barras, banda de rutina y lectura al pasar el cursor. */
export default function TrendChart({ puntos, modo = "linea", banda, dominio, formatoValor, formatoTick, formatoEje = fechaCorta, unidad, etiqueta, alto = 150 }: Props) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const g = useMemo(() => {
    if (!puntos.length) return null;
    const ts = puntos.map((p) => p.t);
    const t0 = dominio?.[0] ?? Math.min(...ts);
    let t1 = dominio?.[1] ?? Math.max(...ts);
    if (t1 === t0) t1 = t0 + 1;
    const vals = puntos.map((p) => p.v);
    let lo = Math.min(...vals, ...(banda ? [banda.min] : []));
    let hi = Math.max(...vals, ...(banda ? [banda.max] : []));
    if (modo === "barras") lo = Math.min(0, lo);
    if (hi === lo) hi = lo + 1;
    const pad = (hi - lo) * 0.08;
    if (modo !== "barras") lo -= pad;
    hi += pad;
    const x = (t: number) => M.l + ((t - t0) / (t1 - t0)) * (W - M.l - M.r);
    const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * (alto - M.t - M.b);
    return { t0, t1, lo, hi, x, y };
  }, [puntos, banda, dominio, modo, alto]);

  if (!g) return null;

  const xs = puntos.map((p) => g.x(p.t));
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${xs[i].toFixed(1)} ${g.y(p.v).toFixed(1)}`).join(" ");
  const base = alto - M.b;
  const area = `${linea} L${xs[xs.length - 1].toFixed(1)} ${base} L${xs[0].toFixed(1)} ${base} Z`;
  const ticks = [g.lo + (g.hi - g.lo) * 0.05, (g.lo + g.hi) / 2, g.hi - (g.hi - g.lo) * 0.05];
  const ancho = Math.max(3, Math.min(28, ((W - M.l - M.r) / puntos.length) * 0.62));

  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let mejor = 0;
    let dmin = Infinity;
    xs.forEach((x, i) => {
      const d = Math.abs(x - px);
      if (d < dmin) {
        dmin = d;
        mejor = i;
      }
    });
    setHover(mejor);
  }

  const hp = hover !== null ? puntos[hover] : null;
  const hx = hover !== null ? xs[hover] : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${alto}`}
        role="img"
        aria-label={etiqueta}
        className="h-auto w-full touch-pan-y select-none overflow-visible"
        onPointerMove={mover}
        onPointerLeave={() => setHover(null)}
        onPointerDown={mover}
      >
        <defs>
          <linearGradient id={`${gid}-a`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rejilla y eje Y */}
        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={g.y(tv)} y2={g.y(tv)} stroke="var(--line)" strokeDasharray="3 5" />
            <text x={M.l - 8} y={g.y(tv) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {(formatoTick ?? formatoValor)(tv)}
            </text>
          </g>
        ))}

        {/* Banda de rutina habitual */}
        {banda && (
          <g>
            <rect x={M.l} y={g.y(banda.max)} width={W - M.l - M.r} height={Math.max(2, g.y(banda.min) - g.y(banda.max))} fill="var(--accent)" opacity="0.14" rx="4" />
            <line x1={M.l} x2={W - M.r} y1={g.y(banda.media)} y2={g.y(banda.media)} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.8" />
          </g>
        )}

        {modo === "linea" ? (
          <>
            {puntos.length > 1 && <path d={area} fill={`url(#${gid}-a)`} className="animate-fade" />}
            <path
              d={linea}
              pathLength={1}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw"
              style={{ strokeDasharray: 1, ["--len" as string]: 1 }}
            />
            {puntos.length === 1 && <circle cx={xs[0]} cy={g.y(puntos[0].v)} r={4.5} fill="var(--brand)" />}
          </>
        ) : (
          puntos.map((p, i) => {
            const top = g.y(p.v);
            const activo = hover === i;
            return (
              <rect
                key={i}
                x={xs[i] - ancho / 2}
                y={top}
                width={ancho}
                height={Math.max(2, base - top)}
                rx={Math.min(6, ancho / 2)}
                fill="var(--brand)"
                opacity={hover === null || activo ? 1 : 0.45}
                style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `grow 650ms ${Math.min(i, 30) * 25}ms cubic-bezier(0.2,0.75,0.25,1) both` }}
              />
            );
          })
        )}

        {/* Eje X */}
        <text x={M.l} y={alto - 6} fontSize="11" fill="var(--ink-3)">
          {formatoEje(g.t0)}
        </text>
        <text x={W - M.r} y={alto - 6} fontSize="11" fill="var(--ink-3)" textAnchor="end">
          {formatoEje(g.t1)}
        </text>

        {/* Cursor */}
        {hp && modo === "linea" && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={M.t} y2={base} stroke="var(--ink-3)" strokeDasharray="3 4" />
            <circle cx={hx} cy={g.y(hp.v)} r={6} fill="var(--brand)" stroke="var(--surface)" strokeWidth="3" />
          </g>
        )}
        {!hp && modo === "linea" && puntos.length > 1 && (
          <circle cx={xs[xs.length - 1]} cy={g.y(puntos[puntos.length - 1].v)} r={4.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth="2.5" />
        )}
      </svg>

      {hp && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-1.5 text-xs shadow-lift"
          style={{ left: `${(hx / W) * 100}%`, transform: `translateX(${hx / W < 0.15 ? "0%" : hx / W > 0.85 ? "-100%" : "-50%"})` }}
        >
          <p className="text-base font-extrabold text-ink">
            {formatoValor(hp.v)} <span className="text-xs font-medium text-ink-3">{unidad}</span>
          </p>
          <p className="text-ink-3">{fechaLarga(hp.t)}</p>
        </div>
      )}
    </div>
  );
}
