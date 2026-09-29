"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Table2, Watch } from "lucide-react";
import {
  Medicion,
  ResumenMedicion,
  RutinaMedicion,
  TipoMedicion,
  getMediciones,
  getResumenMediciones,
  getRutina,
  mensajeDeError,
} from "@/lib/api";
import { MEDICIONES, ORDEN_MEDICIONES, formatValor, horasMin } from "@/lib/mediciones-format";
import TrendChart, { Punto } from "@/components/TrendChart";
import { Btn, Card, Disclosure, Empty, ErrorText, IconBubble, Notice, SectionTitle, Skeleton, Tabs, cx, formatFecha, stagger, tiempoRelativo } from "@/components/ui";

const RANGOS = [
  { key: "1", label: "24 horas", dias: 1 },
  { key: "7", label: "7 días", dias: 7 },
  { key: "30", label: "30 días", dias: 30 },
  { key: "todo", label: "Todo el historial", dias: null },
] as const;
type RangoKey = (typeof RANGOS)[number]["key"];

/** Tipos para los que el backend calcula una rutina habitual con sentido clínico. */
const CON_RUTINA: TipoMedicion[] = ["FRECUENCIA_CARDIACA", "SPO2", "HRV", "SUENO"];
const DIA = 24 * 3600 * 1000;

/**
 * Reduce una serie larga a un máximo de puntos. En cada tramo conserva el punto más alejado del
 * promedio general, así los picos (una taquicardia, una caída de oxígeno) no se pierden al promediar.
 */
function reducir(datos: Punto[], max: number): Punto[] {
  if (datos.length <= max) return datos;
  const media = datos.reduce((a, p) => a + p.v, 0) / datos.length;
  const tam = datos.length / max;
  const out: Punto[] = [];
  for (let i = 0; i < max; i++) {
    const tramo = datos.slice(Math.floor(i * tam), Math.floor((i + 1) * tam));
    if (!tramo.length) continue;
    out.push(tramo.reduce((mejor, p) => (Math.abs(p.v - media) > Math.abs(mejor.v - media) ? p : mejor)));
  }
  return out;
}

/** Suma por día calendario (pasos y sueño se leen mejor como barras diarias). */
function porDia(datos: Punto[]): Punto[] {
  const mapa = new Map<string, Punto>();
  for (const p of datos) {
    const d = new Date(p.t);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const previo = mapa.get(k);
    if (previo) previo.v += p.v;
    else mapa.set(k, { t: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime(), v: p.v });
  }
  return [...mapa.values()].sort((a, b) => a.t - b.t);
}

function descargarCsv(tipo: TipoMedicion, datos: Medicion[]) {
  const def = MEDICIONES[tipo];
  const filas = ["timestamp,valor,unidad", ...datos.map((m) => `${m.timestamp},${m.valor},${m.unidad || def.unidad}`)];
  const blob = new Blob([filas.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nonos-${tipo.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TarjetaTipo({
  tipo,
  datos,
  rutina,
  rango,
  indice,
}: {
  tipo: TipoMedicion;
  datos: Medicion[];
  rutina: RutinaMedicion | null;
  rango: (typeof RANGOS)[number];
  indice: number;
}) {
  const def = MEDICIONES[tipo];
  const Icon = def.icon;
  const ultimo = datos[0]; // el backend responde del más reciente al más viejo

  const asc = useMemo(() => [...datos].reverse().map((m) => ({ t: new Date(m.timestamp).getTime(), v: m.valor })), [datos]);
  const barras = tipo === "PASOS" || tipo === "SUENO";
  const serie = useMemo(() => (barras ? porDia(asc) : reducir(asc, 140)), [asc, barras]);

  const vals = datos.map((m) => m.valor);
  const prom = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const hoy = new Date().toDateString();
  const totalHoy = datos.filter((m) => new Date(m.timestamp).toDateString() === hoy).reduce((a, m) => a + m.valor, 0);
  const totalRango = vals.reduce((a, b) => a + b, 0);

  const banda =
    rutina && rutina.promedio != null && rutina.desviacion != null && CON_RUTINA.includes(tipo)
      ? { media: rutina.promedio, min: Math.max(0, rutina.promedio - 2 * rutina.desviacion), max: rutina.promedio + 2 * rutina.desviacion }
      : null;

  const ahora = Date.now();
  const dominio: [number, number] | undefined = rango.dias ? [ahora - rango.dias * DIA, ahora] : undefined;
  const formatoEje = rango.dias === 1 ? (t: number) => new Date(t).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : undefined;

  const stat = (etiqueta: string, valor: string) => (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <dt className="text-xs text-ink-3">{etiqueta}</dt>
      <dd className="font-bold tabular-nums text-ink">{valor}</dd>
    </div>
  );

  return (
    <Card className="@container rise flex flex-col gap-4" style={stagger(indice)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <IconBubble icon={Icon} size={46} />
          <div>
            <p className="text-sm font-semibold text-ink-2">{def.label}</p>
            {ultimo ? (
              <p className="text-3xl font-extrabold tracking-tight text-ink">
                {formatValor(tipo, tipo === "PASOS" ? totalHoy : ultimo.valor)} <span className="text-base font-medium text-ink-3">{def.unidad}</span>
                {tipo === "PASOS" && <span className="ml-2 text-sm font-semibold text-ink-3">hoy</span>}
                {tipo === "SUENO" && <span className="ml-2 text-sm font-semibold text-ink-3">última noche</span>}
              </p>
            ) : (
              <p className="text-sm text-ink-3">Sin datos en este rango</p>
            )}
          </div>
        </div>
        {ultimo && <p className="text-right text-xs leading-snug text-ink-3">Última lectura<br />{tiempoRelativo(ultimo.timestamp)}</p>}
      </div>

      {ultimo && serie.length > 0 && (
        <TrendChart
          puntos={serie}
          modo={barras ? "barras" : "linea"}
          banda={banda}
          dominio={barras ? undefined : dominio}
          formatoValor={(v) => (tipo === "SUENO" ? horasMin(v) : tipo === "PASOS" ? Math.round(v).toLocaleString("es-AR") : formatValor(tipo, Math.round(v * 10) / 10))}
          formatoTick={(v) => (tipo === "SUENO" ? `${Math.round(v / 60)} h` : tipo === "PASOS" ? (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} mil` : String(Math.round(v))) : formatValor(tipo, Math.round(v)))}
          formatoEje={formatoEje}
          unidad={def.unidad}
          etiqueta={`Evolución de ${def.label.toLowerCase()}`}
        />
      )}

      {ultimo && (
        <dl className="grid grid-cols-2 gap-2 text-sm @md:grid-cols-4">
          {tipo === "PASOS" ? (
            <>
              {stat("Total de hoy", `${totalHoy.toLocaleString("es-AR")} pasos`)}
              {stat(`Total (${rango.label.toLowerCase()})`, totalRango.toLocaleString("es-AR"))}
              {stat("Días con datos", String(serie.length))}
              {stat("Lecturas", datos.length.toLocaleString("es-AR"))}
            </>
          ) : (
            <>
              {stat("Promedio", prom != null ? formatValor(tipo, prom) : "—")}
              {stat("Mínimo", formatValor(tipo, Math.min(...vals)))}
              {stat("Máximo", formatValor(tipo, Math.max(...vals)))}
              {stat("Lecturas", datos.length.toLocaleString("es-AR"))}
            </>
          )}
        </dl>
      )}

      {banda && ultimo && (
        <p className="flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2 text-xs leading-relaxed text-accent-ink">
          <span aria-hidden className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-accent" />
          <span>
            <strong>Rango habitual</strong> (últimos 30 días, {rutina!.cantidadMuestras.toLocaleString("es-AR")} muestras):{" "}
            {formatValor(tipo, banda.min)} – {formatValor(tipo, banda.max)} {def.unidad}. Si la medición se aleja mucho de esta franja, NONOS avisa a la red de cuidado.
          </span>
        </p>
      )}

      {ultimo && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Disclosure label={["Ver lecturas recibidas", "Ocultar lecturas"]} icon={Table2}>
            <div className="max-h-72 overflow-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2 text-left text-xs text-ink-2">
                  <tr>
                    <th className="p-2.5">Fecha y hora</th>
                    <th className="p-2.5">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.slice(0, 300).map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <td className="p-2.5 tabular-nums">{formatFecha(m.timestamp, true)}</td>
                      <td className="p-2.5 font-semibold tabular-nums">
                        {formatValor(tipo, m.valor)} {def.unidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {datos.length > 300 && <p className="mt-2 text-xs text-ink-3">Mostrando las 300 más recientes de {datos.length.toLocaleString("es-AR")}. Descargá el CSV para verlas todas.</p>}
          </Disclosure>
          <Btn variant="ghost" size="sm" onClick={() => descargarCsv(tipo, datos)}>
            <Download size={16} aria-hidden /> CSV
          </Btn>
        </div>
      )}
    </Card>
  );
}

/** Datos que llegaron desde Google Health, tal como los guardó el backend. */
export default function DatosPulsera({ usuarioId, refreshKey = 0 }: { usuarioId: string; refreshKey?: number }) {
  const [rangoKey, setRangoKey] = useState<RangoKey>("7");
  const [datos, setDatos] = useState<Partial<Record<TipoMedicion, Medicion[]>>>({});
  const [resumen, setResumen] = useState<ResumenMedicion[]>([]);
  const [rutinas, setRutinas] = useState<Partial<Record<TipoMedicion, RutinaMedicion | null>>>({});
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rango = RANGOS.find((r) => r.key === rangoKey)!;

  const cargar = useCallback(async () => {
    setError(null);
    const desde = rango.dias ? new Date(Date.now() - rango.dias * DIA).toISOString() : undefined;
    try {
      const [res, sum, rut] = await Promise.all([
        Promise.all(ORDEN_MEDICIONES.map((t) => getMediciones(usuarioId, t, desde))),
        getResumenMediciones(usuarioId).catch(() => [] as ResumenMedicion[]),
        Promise.all(CON_RUTINA.map((t) => getRutina(usuarioId, t).catch(() => null))),
      ]);
      setDatos(Object.fromEntries(ORDEN_MEDICIONES.map((t, i) => [t, res[i]])));
      setResumen(sum);
      setRutinas(Object.fromEntries(CON_RUTINA.map((t, i) => [t, rut[i]])));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudieron cargar los datos de la pulsera."));
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [usuarioId, rango]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  const total = Object.values(datos).reduce((a, l) => a + (l?.length ?? 0), 0);
  const tiposConDatos = ORDEN_MEDICIONES.filter((t) => (datos[t]?.length ?? 0) > 0);
  const ultima = resumen.reduce<string | null>((a, r) => (!a || r.ultimaMedicion > a ? r.ultimaMedicion : a), null);

  return (
    <div className="@container flex flex-col gap-4">
      <SectionTitle
        icon={Watch}
        action={
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => {
              setActualizando(true);
              cargar();
            }}
            disabled={actualizando || cargando}
          >
            <RefreshCw size={16} aria-hidden className={cx(actualizando && "animate-spin")} /> Actualizar
          </Btn>
        }
      >
        Datos de la pulsera
      </SectionTitle>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="segmented"
          label="Rango de tiempo"
          value={rangoKey}
          onChange={(k) => {
            setCargando(true);
            setRangoKey(k);
          }}
          tabs={RANGOS.map((r) => ({ key: r.key, label: r.label }))}
        />
        {ultima && <p className="text-xs text-ink-3">Último dato recibido {tiempoRelativo(ultima)}</p>}
      </div>

      {rango.key === "todo" && cargando && (
        <Notice tone="info" title="Trayendo todo el historial guardado">
          Puede tardar unos segundos si hay muchas lecturas.
        </Notice>
      )}
      <ErrorText>{error}</ErrorText>

      {cargando && (
        <div className="grid gap-4 @3xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      )}

      {!cargando && total === 0 && !error && (
        <Empty icon={Watch} title="Todavía no llegaron datos">
          Conectá la pulsera y tocá “Sincronizar”: si Google no tiene lecturas en este rango, esto queda vacío. Probá con “Todo el historial”.
        </Empty>
      )}

      {!cargando && total > 0 && (
        <div className="grid gap-4 @3xl:grid-cols-2">
          {tiposConDatos.map((t, i) => (
            <TarjetaTipo key={`${t}-${rangoKey}`} tipo={t} datos={datos[t] ?? []} rutina={rutinas[t] ?? null} rango={rango} indice={i} />
          ))}
        </div>
      )}
    </div>
  );
}
