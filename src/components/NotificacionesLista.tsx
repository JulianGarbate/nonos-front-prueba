"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, Footprints, HeartPulse, Moon, PartyPopper, Pill, Siren, Watch, Wind, type LucideIcon } from "lucide-react";
import { Notificacion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotificaciones } from "@/lib/use-notificaciones";
import { Badge, Btn, Empty, IconBubble, SkeletonList, Tabs, cx, stagger, tiempoRelativo } from "@/components/ui";

/** El backend arma el título según el tipo de alerta (ver elegirTituloAlerta); de ahí sale el ícono. */
function visual(n: Notificacion): { icon: LucideIcon; tone: "danger" | "accent" | "ok" | "brand" } {
  const t = n.titulo.toLowerCase();
  if (t.includes("emergencia")) return { icon: Siren, tone: "danger" };
  if (t.includes("frecuencia")) return { icon: HeartPulse, tone: "danger" };
  if (t.includes("oxígeno") || t.includes("oxigeno")) return { icon: Wind, tone: "danger" };
  if (t.includes("sueño")) return { icon: Moon, tone: "accent" };
  if (t.includes("rutina")) return { icon: Footprints, tone: "accent" };
  if (t.includes("logro")) return { icon: PartyPopper, tone: "ok" };
  if (t.includes("stock") || t.includes("medicación")) return { icon: Pill, tone: "accent" };
  if (t.includes("dispositivo")) return { icon: Watch, tone: "accent" };
  return { icon: Bell, tone: "brand" };
}

function nombreDia(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

export default function NotificacionesLista() {
  const { user } = useAuth();
  const { items, noLeidas, cargando, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const [filtro, setFiltro] = useState<"todas" | "sin-leer">("todas");
  const esAdulto = user?.rol === "ADULTO_MAYOR";

  const visibles = useMemo(() => (filtro === "sin-leer" ? items.filter((n) => !n.leida) : items), [items, filtro]);
  const grupos = useMemo(() => {
    const m = new Map<string, Notificacion[]>();
    for (const n of visibles) {
      const k = nombreDia(n.enviadaEn);
      m.set(k, [...(m.get(k) ?? []), n]);
    }
    return [...m.entries()];
  }, [visibles]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="segmented"
          label="Filtrar avisos"
          value={filtro}
          onChange={setFiltro}
          tabs={[
            { key: "todas", label: "Todos" },
            { key: "sin-leer", label: "Sin leer", badge: noLeidas || undefined },
          ]}
        />
        {noLeidas > 0 && (
          <Btn variant="secondary" size="sm" onClick={marcarTodasLeidas}>
            <CheckCheck size={16} aria-hidden /> Marcar todo como leído
          </Btn>
        )}
      </div>

      {cargando && <SkeletonList rows={4} />}
      {!cargando && visibles.length === 0 && (
        <Empty icon={filtro === "sin-leer" ? CheckCheck : BellOff} title={filtro === "sin-leer" ? "Estás al día" : "No hay avisos todavía"}>
          {filtro === "sin-leer" ? "No tenés avisos sin leer." : "Cuando pase algo importante, lo vas a ver acá y en tu dispositivo."}
        </Empty>
      )}

      {grupos.map(([dia, lista]) => (
        <section key={dia} className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-3">{dia}</h2>
          <ul className="flex flex-col gap-2.5">
            {lista.map((n, i) => {
              const v = visual(n);
              const dispositivo = n.titulo.toLowerCase().includes("dispositivo");
              return (
                <li key={n.id} className="rise" style={stagger(i)}>
                  <div
                    className={cx(
                      "flex items-start gap-3.5 rounded-2xl border p-4 transition-all duration-300",
                      n.leida ? "border-line bg-surface" : "border-brand/40 bg-brand-soft/60 shadow-card",
                    )}
                  >
                    <div className="relative">
                      <IconBubble icon={v.icon} tone={v.tone} size={44} />
                      {!n.leida && <span aria-label="Sin leer" className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-pulse rounded-full bg-brand ring-2 ring-surface" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cx("font-bold text-ink", n.leida && "font-semibold")}>{n.titulo}</p>
                        {!n.leida && <Badge tone="ok">Nuevo</Badge>}
                      </div>
                      <p className="text-sm leading-relaxed text-ink-2">{n.mensaje}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-xs text-ink-3">{tiempoRelativo(n.enviadaEn)}</p>
                        {dispositivo && esAdulto && (
                          <Link href="/adulto-mayor/dispositivos" className="text-xs font-bold text-brand underline-offset-4 hover:underline">
                            Ir a mis dispositivos
                          </Link>
                        )}
                        {n.alertaId && !esAdulto && (
                          <Link href="/familiar#alertas" className="text-xs font-bold text-brand underline-offset-4 hover:underline">
                            Ver alertas
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.leida && (
                      <Btn variant="ghost" size="sm" onClick={() => marcarLeida(n.id)} aria-label="Marcar como leído">
                        <CheckCheck size={18} aria-hidden />
                        <span className="hidden sm:inline">Leído</span>
                      </Btn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
