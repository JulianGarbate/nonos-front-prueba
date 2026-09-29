"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, MailPlus, Moon, Pill, Siren, Sun, Sunset, TriangleAlert, UserRound, Users, Watch, type LucideIcon } from "lucide-react";
import { useRequireAuth } from "@/lib/auth-context";
import { Dispositivo, Medicamento, Vinculo, getDispositivos, getInvitacionesRecibidas, getMedicamentos, getVinculos } from "@/lib/api";
import { AlertaPendienteAdulto } from "@/components/care/AlertasPanel";
import { Card, IconBubble, Notice, Skeleton, cx, stagger, tiempoRelativo } from "@/components/ui";

interface Toma {
  hora: string;
  min: number;
  nombre: string;
  dosis: string;
}

/** Tomas programadas para hoy, ordenadas. NONOS no registra si se tomó: solo muestra qué corresponde. */
function tomasDeHoy(meds: Medicamento[], ahora: Date): Toma[] {
  const hoy = ahora.getDay();
  const tomas: Toma[] = [];
  for (const m of meds) {
    if (m.diasSemana.length && !m.diasSemana.includes(hoy)) continue;
    for (const h of m.horariosDelDia) {
      const [hh, mm] = h.split(":").map(Number);
      tomas.push({ hora: h, min: hh * 60 + mm, nombre: m.nombre, dosis: m.dosis });
    }
  }
  return tomas.sort((a, b) => a.min - b.min);
}

function saludo(hora: number): { texto: string; icon: LucideIcon } {
  if (hora < 12) return { texto: "Buen día", icon: Sun };
  if (hora < 20) return { texto: "Buenas tardes", icon: Sunset };
  return { texto: "Buenas noches", icon: Moon };
}

export default function AdultoMayorHome() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [meds, setMeds] = useState<Medicamento[] | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[] | null>(null);
  const [dispositivos, setDispositivos] = useState<Dispositivo[] | null>(null);
  const [invitaciones, setInvitaciones] = useState(0);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    getMedicamentos(user.id).then(setMeds).catch(() => setMeds([]));
    getVinculos(user.id).then(setVinculos).catch(() => setVinculos([]));
    getDispositivos(user.id).then(setDispositivos).catch(() => setDispositivos([]));
    getInvitacionesRecibidas().then((i) => setInvitaciones(i.length)).catch(() => {});
  }, [user]);

  const tomas = useMemo(() => (meds ? tomasDeHoy(meds, ahora) : []), [meds, ahora]);

  if (!ready || !user) return null;

  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const proxima = tomas.find((t) => t.min >= minAhora);
  const { texto: saludoTexto, icon: SaludoIcon } = saludo(ahora.getHours());
  const fechaLarga = ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const fecha = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);
  const fitbit = dispositivos?.find((d) => d.tipo === "FITBIT_AIR");

  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-3">
          <SaludoIcon size={18} className="text-accent" aria-hidden /> {fecha}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">
          {saludoTexto}, <span className="text-brand">{user.nombreCompleto.split(" ")[0]}</span>
        </h1>
        <p className="text-lg text-ink-2">Acá está todo lo importante.</p>
      </header>

      <AlertaPendienteAdulto adultoMayorId={user.id} />

      {invitaciones > 0 && (
        <Link
          href="/invitaciones"
          className="flex min-h-16 animate-pop items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4 text-brand-ink transition hover:-translate-y-0.5 hover:shadow-card"
        >
          <MailPlus size={26} aria-hidden />
          <span className="flex-1 text-lg font-bold">
            Tenés {invitaciones} invitación{invitaciones > 1 ? "es" : ""} para revisar
          </span>
          <ChevronRight aria-hidden />
        </Link>
      )}

      {fitbit?.requiereReautenticacion && (
        <Notice
          tone="warn"
          icon={TriangleAlert}
          title="Tu pulsera dejó de sincronizar"
          action={
            <Link href="/adulto-mayor/dispositivos" className="inline-flex min-h-10 items-center rounded-xl bg-accent-ink px-4 text-sm font-bold text-canvas">
              Volver a conectarla
            </Link>
          }
        >
          Google Health pidió que la conectes de nuevo para seguir enviando tus datos.
        </Notice>
      )}

      {/* Botón principal de ayuda */}
      <Link
        href="/adulto-mayor/emergencia"
        className="group relative flex min-h-32 items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#d63a3a] to-[#a31414] p-6 text-white shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]"
      >
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20">
          <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-white/40" />
          <Siren size={40} className="relative" aria-hidden />
        </span>
        <span className="relative">
          <span className="block text-3xl font-extrabold tracking-wide">PEDIR AYUDA</span>
          <span className="block text-base text-white/85">Avisamos a tus contactos de inmediato.</span>
        </span>
        <ChevronRight size={28} className="relative ml-auto transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Medicación de hoy */}
        <Card className="flex flex-col gap-4 md:col-span-2">
          <div className="flex items-center gap-4">
            <IconBubble icon={Pill} tone="accent" size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-3">{proxima ? "Tu próxima medicación" : "Medicación de hoy"}</p>
              {meds === null ? (
                <Skeleton className="mt-2 h-7 w-48" />
              ) : proxima ? (
                <p className="text-2xl font-bold text-ink">
                  {proxima.nombre} <span className="text-brand">· {proxima.hora}</span>
                  <span className="block text-base font-normal text-ink-2">{proxima.dosis}</span>
                </p>
              ) : (
                <p className="text-xl font-bold text-ink">{meds.length ? "Ya no hay más tomas para hoy." : "Todavía no hay medicación cargada."}</p>
              )}
            </div>
            <Link href="/adulto-mayor/medicacion" className="hidden min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-brand transition hover:bg-brand-soft sm:flex">
              Ver todo <ChevronRight size={16} aria-hidden />
            </Link>
          </div>

          {tomas.length > 0 && (
            <ol className="flex flex-col border-t border-line pt-3">
              {tomas.map((t, i) => {
                const pasada = t.min < minAhora;
                const esProxima = t === proxima;
                return (
                  <li key={`${t.hora}-${t.nombre}-${i}`} className="rise flex items-center gap-3 py-2" style={stagger(i)}>
                    <span
                      className={cx(
                        "flex h-9 w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-full text-sm font-bold tabular-nums",
                        esProxima ? "bg-brand text-on-brand shadow-md" : pasada ? "bg-surface-3 text-ink-3" : "bg-brand-soft text-brand-ink",
                      )}
                    >
                      <Clock size={13} aria-hidden /> {t.hora}
                    </span>
                    <span className={cx("min-w-0 flex-1 truncate", pasada ? "text-ink-3" : "font-semibold text-ink")}>
                      {t.nombre} <span className="font-normal text-ink-3">· {t.dosis}</span>
                    </span>
                    {esProxima && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent-ink">Próxima</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        {/* Red de cuidado */}
        <Link href="/adulto-mayor/red" className="block">
          <Card interactive className="flex h-full items-center gap-4">
            <IconBubble icon={Users} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-3">Tu red de cuidado</p>
              {vinculos === null ? (
                <Skeleton className="mt-2 h-6 w-40" />
              ) : (
                <p className="text-xl font-bold text-ink">
                  {vinculos.length ? `${vinculos.length} persona${vinculos.length > 1 ? "s" : ""} te acompañan` : "Todavía no sumaste a nadie"}
                </p>
              )}
              {!!vinculos?.length && (
                <div className="mt-2 flex -space-x-2" aria-hidden>
                  {vinculos.slice(0, 5).map((v) => (
                    <IconBubble key={v.id} icon={UserRound} tone="brand" size={30} className="ring-2 ring-surface" />
                  ))}
                </div>
              )}
            </div>
            <ChevronRight aria-hidden className="text-ink-3" />
          </Card>
        </Link>

        {/* Pulsera */}
        <Link href="/adulto-mayor/dispositivos" className="block">
          <Card interactive className="flex h-full items-center gap-4">
            <IconBubble icon={Watch} tone={fitbit?.requiereReautenticacion ? "accent" : "ok"} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-3">Tu pulsera</p>
              {dispositivos === null ? (
                <Skeleton className="mt-2 h-6 w-40" />
              ) : fitbit ? (
                <p className="text-xl font-bold text-ink">
                  {fitbit.requiereReautenticacion ? "Hay que reconectarla" : "Conectada"}
                  <span className="block text-sm font-normal text-ink-2">
                    {fitbit.ultimaSincronizacion ? `Última lectura ${tiempoRelativo(fitbit.ultimaSincronizacion)}` : "Todavía sin lecturas"}
                  </span>
                </p>
              ) : (
                <p className="text-xl font-bold text-ink">
                  Sin pulsera
                  <span className="block text-sm font-normal text-ink-2">Conectala para cuidar tu salud.</span>
                </p>
              )}
            </div>
            <ChevronRight aria-hidden className="text-ink-3" />
          </Card>
        </Link>
      </div>
    </>
  );
}
