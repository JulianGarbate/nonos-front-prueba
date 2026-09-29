"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Save } from "lucide-react";
import { TipoAlerta, editarNotificacionesRecibidas, getNotificacionesRecibidas, getVinculos, mensajeDeError } from "@/lib/api";
import { ALERTA_INFO, PRESET_IMPORTANTES, PRESET_TODAS, TIPOS_ALERTA } from "@/lib/alertas-format";
import { useToast } from "@/components/feedback";
import { Badge, Btn, Card, ErrorText, SectionTitle, Skeleton, Switch, cx, stagger } from "@/components/ui";

const mismo = (a: TipoAlerta[], b: TipoAlerta[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function NotificacionesConfig({ familiarId, adultoMayorId, nombre }: { familiarId: string; adultoMayorId: string; nombre: string }) {
  const toast = useToast();
  const [tipos, setTipos] = useState<TipoAlerta[] | null>(null);
  const [guardados, setGuardados] = useState<TipoAlerta[]>([]);
  const [rol, setRol] = useState<string>("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTipos(null);
    setError(null);
    getNotificacionesRecibidas(familiarId, adultoMayorId)
      .then((t) => {
        setTipos(t);
        setGuardados(t);
      })
      .catch((e) => setError(mensajeDeError(e)));
    getVinculos(adultoMayorId)
      .then((vs) => {
        const v = vs.find((x) => x.familiarId === familiarId);
        if (v) setRol(v.tipoVinculo === "FAMILIAR" ? "Familiar" : v.tipoCuidador === "FISICO" ? "Cuidador/a físico" : "Cuidador/a digital");
      })
      .catch(() => {});
  }, [familiarId, adultoMayorId]);

  const cambios = useMemo(() => !!tipos && !mismo(tipos, guardados), [tipos, guardados]);

  function toggle(t: TipoAlerta) {
    setTipos((prev) => (prev ? (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]) : prev));
  }

  async function guardar() {
    if (!tipos) return;
    setGuardando(true);
    setError(null);
    try {
      const nuevos = await editarNotificacionesRecibidas(familiarId, adultoMayorId, tipos);
      setTipos(nuevos);
      setGuardados(nuevos);
      toast.ok("Preferencias de avisos guardadas.");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const presets = [
    { label: "Solo lo importante", valor: PRESET_IMPORTANTES },
    { label: "Todo", valor: PRESET_TODAS },
    { label: "Ninguno", valor: [] as TipoAlerta[] },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle icon={BellRing}>Qué avisos querés recibir sobre {nombre.split(" ")[0]}</SectionTitle>
      <p className="text-sm leading-relaxed text-ink-2">
        {rol && (
          <>
            Tu rol: <Badge tone="ok">{rol}</Badge>{" "}
          </>
        )}
        Por defecto el cuidador físico recibe lo más importante y el digital recibe todo, pero podés activar o desactivar cada categoría —incluso todas—. Los pedidos de ayuda
        (S.O.S) siempre llegan a los contactos de emergencia.
      </p>
      <ErrorText>{error}</ErrorText>
      {!tipos && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64" />
        </div>
      )}
      {tipos && (
        <>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Btn key={p.label} variant={mismo(tipos, p.valor) ? "primary" : "secondary"} size="sm" onClick={() => setTipos(p.valor)}>
                {p.label}
              </Btn>
            ))}
          </div>
          <Card className="!p-2">
            <ul className="divide-y divide-line">
              {TIPOS_ALERTA.map((t, i) => {
                const on = tipos.includes(t);
                const info = ALERTA_INFO[t];
                return (
                  <li key={t} className="rise" style={stagger(i)}>
                    <div className="flex min-h-[4.5rem] items-center justify-between gap-4 rounded-xl p-3 transition-colors hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                          {info.titulo}
                          {info.critica && <Badge tone="crit">Importante</Badge>}
                        </p>
                        <p className={cx("text-sm text-ink-2 transition-opacity", !on && "opacity-70")}>{info.detalle}</p>
                      </div>
                      <Switch checked={on} onChange={() => toggle(t)} label={info.titulo} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <div aria-hidden={!cambios} inert={!cambios} className={cx("sticky bottom-24 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lift transition-all duration-300 lg:bottom-6", cambios ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
            <p className="pl-2 text-sm font-semibold text-ink-2">Tenés cambios sin guardar</p>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setTipos(guardados)}>
                Descartar
              </Btn>
              <Btn size="sm" loading={guardando} onClick={guardar}>
                <Save size={16} aria-hidden /> Guardar
              </Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
