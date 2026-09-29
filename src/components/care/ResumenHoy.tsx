"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Phone, Pill, ScrollText, ShieldAlert, Siren, TriangleAlert } from "lucide-react";
import { EventoHistorial, Medicamento, ResumenMedicion, getHistorial, getMedicamentos, getResumenMediciones } from "@/lib/api";
import { mensajeParaCuidador, tituloAlerta } from "@/lib/alertas-format";
import { MEDICIONES, ORDEN_MEDICIONES, formatValor } from "@/lib/mediciones-format";
import { useAlertas } from "@/components/care/AlertasPanel";
import { Card, IconBubble, SectionTitle, Skeleton, cx, formatDia, stagger, tiempoRelativo } from "@/components/ui";

export default function ResumenHoy({ adultoMayorId, nombre, telefono }: { adultoMayorId: string; nombre: string; telefono?: string | null }) {
  const { items: alertas, cargando } = useAlertas(adultoMayorId);
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  const [vitales, setVitales] = useState<ResumenMedicion[]>([]);

  useEffect(() => {
    getMedicamentos(adultoMayorId).then(setMeds).catch(() => {});
    getHistorial(adultoMayorId).then(setHistorial).catch(() => {});
    getResumenMediciones(adultoMayorId).then(setVitales).catch(() => {});
  }, [adultoMayorId]);

  const primerNombre = nombre.split(" ")[0];
  const pendientes = alertas.filter((a) => a.estado === "PENDIENTE" && a.tipo !== "LOGRO_POSITIVO");
  const criticas = pendientes.filter((a) => a.categoria === "CRITICO");
  const logro = alertas.find((a) => a.tipo === "LOGRO_POSITIVO" && Date.now() - new Date(a.createdAt).getTime() < 48 * 3600 * 1000);
  const stockBajo = meds.filter((m) => m.lowStock);
  const ultimoEvento = historial[0];
  const hayCriticas = criticas.length > 0;

  const tilesVitales = ORDEN_MEDICIONES.filter((t) => t !== "PASOS" && t !== "HRV")
    .map((t) => vitales.find((v) => v.tipo === t))
    .filter((v): v is ResumenMedicion => !!v);

  return (
    <div className="flex flex-col gap-5">
      {/* Estado general */}
      {cargando ? (
        <Skeleton className="h-36" />
      ) : (
        <div
          className={cx(
            "relative flex animate-pop flex-col gap-4 overflow-hidden rounded-3xl p-6 sm:flex-row sm:items-center",
            hayCriticas ? "bg-gradient-to-br from-[#d63a3a] to-[#a31414] text-white" : "bg-gradient-to-br from-[#2f7d74] to-[#1d544e] text-white",
          )}
        >
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
            {hayCriticas && <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-white/40" />}
            {hayCriticas ? <Siren size={32} className="relative" aria-hidden /> : <CircleCheck size={34} className="relative" aria-hidden />}
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/75">Estado de {primerNombre}</p>
            {hayCriticas ? (
              <>
                <h2 className="text-2xl font-extrabold leading-tight">
                  {criticas.length} alerta{criticas.length > 1 ? "s" : ""} crítica{criticas.length > 1 ? "s" : ""} sin resolver
                </h2>
                <p className="mt-1 text-[0.95rem] text-white/90">
                  <strong>{tituloAlerta(criticas[0])}:</strong> {mensajeParaCuidador(criticas[0], primerNombre)} · {tiempoRelativo(criticas[0].createdAt)}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold leading-tight">Todo en orden</h2>
                <p className="mt-1 text-[0.95rem] text-white/90">No hay alertas críticas pendientes.</p>
              </>
            )}
          </div>
          {hayCriticas && telefono && (
            <a href={`tel:${telefono}`} className="relative inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-[#a31414] shadow-md transition hover:-translate-y-0.5 active:scale-95">
              <Phone size={18} aria-hidden /> Llamar a {primerNombre}
            </a>
          )}
        </div>
      )}

      {/* Signos vitales de las últimas 24 h (pulsera) */}
      {tilesVitales.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>Últimas 24 horas</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {tilesVitales.map((v, i) => {
              const def = MEDICIONES[v.tipo];
              const Icon = def.icon;
              return (
                <Card key={v.tipo} className="rise flex flex-col gap-1 !p-4" style={stagger(i)}>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                    <Icon size={16} className="text-brand" aria-hidden /> {def.label}
                  </p>
                  <p className="text-3xl font-extrabold tracking-tight text-ink">
                    {formatValor(v.tipo, v.ultimoValor)} <span className="text-base font-medium text-ink-3">{def.unidad}</span>
                  </p>
                  <p className="text-xs text-ink-3">
                    {v.tipo === "SUENO" ? `Registrado ${tiempoRelativo(v.ultimaMedicion)}` : `Entre ${formatValor(v.tipo, v.minimo)} y ${formatValor(v.tipo, v.maximo)} · ${tiempoRelativo(v.ultimaMedicion)}`}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionTitle>Un vistazo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex items-start gap-3.5 !p-4">
            <IconBubble icon={stockBajo.length ? TriangleAlert : Pill} tone={stockBajo.length ? "accent" : "ok"} size={44} />
            <div>
              <p className="font-bold text-ink">Medicación</p>
              <p className="text-sm text-ink-2">
                {stockBajo.length === 0 ? (
                  meds.length ? "Con stock suficiente." : "Sin medicación cargada."
                ) : (
                  <>
                    Poco stock de <strong>{stockBajo.map((m) => m.nombre).join(", ")}</strong>.
                  </>
                )}
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3.5 !p-4">
            <IconBubble icon={pendientes.length > criticas.length ? ShieldAlert : CircleCheck} tone={pendientes.length > criticas.length ? "accent" : "ok"} size={44} />
            <div>
              <p className="font-bold text-ink">Otros avisos</p>
              <p className="text-sm text-ink-2">
                {pendientes.length === criticas.length ? "Sin avisos pendientes." : `${pendientes.length - criticas.length} aviso(s) informativo(s) para revisar en Alertas.`}
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3.5 !p-4 sm:col-span-2">
            <IconBubble icon={ScrollText} size={44} />
            <div>
              <p className="font-bold text-ink">Último acontecimiento</p>
              <p className="text-sm text-ink-2">
                {ultimoEvento ? (
                  <>
                    <strong>{ultimoEvento.descripcion}</strong> ({formatDia(ultimoEvento.fecha)}).
                  </>
                ) : (
                  "Sin acontecimientos registrados."
                )}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {logro && (
        <Card className="animate-pop !border-brand/30 !bg-ok-soft">
          <p className="font-semibold text-ok-ink">{mensajeParaCuidador(logro, primerNombre)}</p>
        </Card>
      )}
    </div>
  );
}
