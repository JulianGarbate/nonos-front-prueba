"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CircleCheck,
  Footprints,
  HeartPulse,
  MessageSquare,
  Moon,
  PartyPopper,
  Pill,
  Siren,
  TrendingDown,
  TrendingUp,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Feedback,
  TipoMedicion,
  confirmarAlerta,
  crearFeedback,
  getAlertas,
  getFeedback,
  mensajeDeError,
} from "@/lib/api";
import { MEDICIONES, formatValor } from "@/lib/mediciones-format";
import { ALERTA_ESTADO_LABEL, ALERTA_INFO, mensajeParaAdulto, mensajeParaCuidador, tituloAlerta } from "@/lib/alertas-format";
import { useToast } from "@/components/feedback";
import {
  Badge,
  Btn,
  Card,
  Disclosure,
  Empty,
  ErrorText,
  Field,
  IconBubble,
  SectionTitle,
  SkeletonList,
  Tabs,
  Textarea,
  cx,
  formatFecha,
  stagger,
  tiempoRelativo,
} from "@/components/ui";

/** El sueño se guarda en minutos: se muestra como horas; el resto lleva su unidad. */
function valorContexto(tipo: TipoMedicion | undefined, v: number) {
  if (!tipo) return String(Math.round(v));
  const u = MEDICIONES[tipo].unidad;
  return `${formatValor(tipo, Math.round(v))}${u ? ` ${u}` : ""}`;
}

function iconoDe(a: Alerta): { icon: LucideIcon; tone: "danger" | "accent" | "ok" } {
  switch (a.tipo) {
    case "SOS_DIRECTO":
      return { icon: Siren, tone: "danger" };
    case "FC_ELEVADA":
      return { icon: TrendingUp, tone: "danger" };
    case "FC_BAJA":
      return { icon: TrendingDown, tone: "danger" };
    case "SP02_BAJO":
      return { icon: Wind, tone: "danger" };
    case "MEDICACION_STOCK_BAJO":
      return { icon: Pill, tone: "accent" };
    case "CAMBIO_DE_RUTINA":
      return { icon: a.datosContexto?.tipoMedicion === "SUENO" ? Moon : Footprints, tone: "accent" };
    case "LOGRO_POSITIVO":
      return { icon: PartyPopper, tone: "ok" };
  }
}

/** Milisegundos que faltan para `iso` (o null). Se actualiza cada segundo solo si hay fecha futura. */
function useCuentaRegresiva(iso?: string | null) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return setMs(null);
    const tick = () => setMs(new Date(iso).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return ms;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function useAlertas(adultoMayorId: string, intervaloMs = 30_000) {
  const [items, setItems] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setItems(await getAlertas(adultoMayorId));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudieron cargar las alertas."));
    } finally {
      setCargando(false);
    }
  }, [adultoMayorId]);

  useEffect(() => {
    setCargando(true);
    recargar();
    const id = setInterval(() => document.visibilityState === "visible" && recargar(), intervaloMs);
    return () => clearInterval(id);
  }, [recargar, intervaloMs]);

  return { items, cargando, error, recargar };
}

/* ───── Vista del adulto mayor: solo lo que requiere su respuesta ───── */

export function AlertaPendienteAdulto({ adultoMayorId }: { adultoMayorId: string }) {
  const { items, recargar } = useAlertas(adultoMayorId, 15_000);
  const toast = useToast();
  const [enviando, setEnviando] = useState<"ok" | "ayuda" | null>(null);

  const pendiente = items.find(
    (a) => a.estado === "PENDIENTE" && !a.confirmadaEn && a.tipo !== "LOGRO_POSITIVO" && a.tipo !== "MEDICACION_STOCK_BAJO",
  );
  const logro = items.find((a) => a.tipo === "LOGRO_POSITIVO" && Date.now() - new Date(a.createdAt).getTime() < 24 * 3600 * 1000);
  const restante = useCuentaRegresiva(pendiente?.ventanaExpiraEn);

  async function responder(isOk: boolean) {
    if (!pendiente) return;
    setEnviando(isOk ? "ok" : "ayuda");
    try {
      await confirmarAlerta(pendiente.id, isOk);
      toast.ok(isOk ? "Gracias por avisar. Qué bueno que estés bien." : "Avisamos a tu red que necesitás ayuda.");
      await recargar();
    } catch (e) {
      toast.error(mensajeDeError(e));
    } finally {
      setEnviando(null);
    }
  }

  return (
    <>
      {pendiente && (
        <Card className="relative flex animate-pop flex-col gap-4 overflow-hidden !border-2 !border-danger/50 !bg-danger-wash">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 animate-pulse bg-danger-fill" />
          <div className="flex items-start gap-4">
            <IconBubble icon={pendiente.tipo === "SOS_DIRECTO" ? Siren : BellRing} tone="danger" size={52} />
            <div>
              <p className="text-xl font-bold leading-snug text-ink">{mensajeParaAdulto(pendiente)}</p>
              {pendiente.tipo !== "SOS_DIRECTO" && restante !== null && restante > 0 && (
                <p className="mt-1 text-sm text-ink-2">
                  Respondé en <strong className="tabular-nums">{mmss(restante)}</strong>: si no, avisamos a tu red de cuidado.
                </p>
              )}
              {pendiente.tipo !== "SOS_DIRECTO" && restante !== null && restante <= 0 && (
                <p className="mt-1 text-sm text-ink-2">Ya avisamos a tu red de cuidado. Igual podés responder.</p>
              )}
            </div>
          </div>
          {pendiente.tipo !== "SOS_DIRECTO" && (
            <div className="grid grid-cols-2 gap-3">
              <Btn size="lg" loading={enviando === "ok"} disabled={!!enviando} onClick={() => responder(true)}>
                <CircleCheck size={20} aria-hidden /> Estoy bien
              </Btn>
              <Btn size="lg" variant="sos" loading={enviando === "ayuda"} disabled={!!enviando} onClick={() => responder(false)}>
                Necesito ayuda
              </Btn>
            </div>
          )}
        </Card>
      )}
      {logro && (
        <Card className="flex animate-pop items-center gap-3 !border-brand/30 !bg-ok-soft">
          <PartyPopper size={28} className="shrink-0 text-brand" aria-hidden />
          <p className="font-semibold text-ink">{mensajeParaAdulto(logro)}</p>
        </Card>
      )}
    </>
  );
}

/* ───── Vista del cuidador/familiar: listado con feedback ───── */

type Filtro = "todas" | "pendientes" | "criticas";

export function AlertasCuidador({ adultoMayorId, nombre }: { adultoMayorId: string; nombre: string }) {
  const { items, cargando, error } = useAlertas(adultoMayorId);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const pendientes = items.filter((a) => a.estado === "PENDIENTE" && a.tipo !== "LOGRO_POSITIVO");
  const criticas = items.filter((a) => ALERTA_INFO[a.tipo].critica);
  const visibles = useMemo(
    () => (filtro === "pendientes" ? pendientes : filtro === "criticas" ? criticas : items),
    [filtro, items, pendientes, criticas],
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon={BellRing}
        action={
          <Tabs
            variant="segmented"
            label="Filtrar alertas"
            value={filtro}
            onChange={setFiltro}
            tabs={[
              { key: "todas", label: "Todas" },
              { key: "pendientes", label: "Pendientes", badge: pendientes.length || undefined },
              { key: "criticas", label: "Críticas" },
            ]}
          />
        }
      >
        Alertas
      </SectionTitle>
      <ErrorText>{error}</ErrorText>
      {cargando && <SkeletonList rows={3} />}
      {!cargando && visibles.length === 0 && (
        <Empty icon={CircleCheck} title={filtro === "todas" ? "Sin alertas" : "Nada por acá"}>
          {filtro === "todas" ? "Cuando haya algo relevante, aparece acá y te avisamos." : "No hay alertas que coincidan con este filtro."}
        </Empty>
      )}
      <ul className="flex flex-col gap-3">
        {visibles.map((a, i) => (
          <li key={a.id} className="rise" style={stagger(i)}>
            <AlertaItem alerta={a} nombre={nombre} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertaItem({ alerta: a, nombre }: { alerta: Alerta; nombre: string }) {
  const toast = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[] | null>(null);
  const [comentario, setComentario] = useState("");
  const [real, setReal] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const restante = useCuentaRegresiva(a.estado === "PENDIENTE" && !a.confirmadaEn ? a.ventanaExpiraEn : null);

  const cargarFeedback = useCallback(() => getFeedback(a.id).then(setFeedbacks).catch(() => setFeedbacks([])), [a.id]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (real === null) return setError("Indicá si fue una emergencia real.");
    setEnviando(true);
    setError(null);
    try {
      await crearFeedback({ alertaId: a.id, comentario, fueEmergenciaReal: real });
      setComentario("");
      setReal(null);
      toast.ok("Comentario enviado. Gracias por ayudar a mejorar los avisos.");
      await cargarFeedback();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo enviar. Puede que esta alerta ya tenga un comentario."));
    } finally {
      setEnviando(false);
    }
  }

  const info = ALERTA_INFO[a.tipo];
  const { icon, tone } = iconoDe(a);
  const urgente = info.critica && a.estado === "PENDIENTE";
  const ctx = a.datosContexto;

  return (
    <Card className={cx("flex flex-col gap-3 !p-4 sm:!p-5", urgente && "!border-danger/50 !bg-danger-wash")}>
      <div className="flex items-start gap-3.5">
        <div className="relative">
          <IconBubble icon={icon} tone={tone} size={46} />
          {urgente && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-pulse rounded-full bg-danger-fill ring-2 ring-surface" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold text-ink">{tituloAlerta(a)}</p>
            <Badge tone={a.estado === "RESUELTA" ? "ok" : a.estado === "PENDIENTE" ? (info.critica ? "crit" : "warn") : "neutral"}>{ALERTA_ESTADO_LABEL[a.estado]}</Badge>
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{mensajeParaCuidador(a, nombre)}</p>
          {ctx?.valorMedido != null && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2">
              <HeartPulse size={13} aria-hidden /> Medido: {valorContexto(ctx.tipoMedicion, ctx.valorMedido)}
              {ctx.promedio != null && <> · promedio habitual {valorContexto(ctx.tipoMedicion, ctx.promedio)}</>}
            </p>
          )}
          <p className="mt-1.5 text-xs text-ink-3" title={formatFecha(a.createdAt, true)}>
            {tiempoRelativo(a.createdAt)} · {formatFecha(a.createdAt, true)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.confirmadaEn && a.estado === "PENDIENTE" && <Badge tone="warn">Respondió: necesita ayuda</Badge>}
            {a.confirmadaEn && a.estado === "RESUELTA" && <Badge tone="ok">Respondió: está bien</Badge>}
            {a.escaladaEn && (
              <Badge tone="warn">
                <BellRing size={12} aria-hidden /> Se volvió a avisar {tiempoRelativo(a.escaladaEn)}
              </Badge>
            )}
            {restante !== null && restante > 0 && <Badge tone="neutral">Esperando respuesta · {mmss(restante)}</Badge>}
          </div>
        </div>
      </div>

      <Disclosure label={["Comentarios", "Ocultar comentarios"]} icon={MessageSquare} onOpen={() => feedbacks === null && cargarFeedback()}>
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3.5">
          {feedbacks === null && <SkeletonList rows={1} />}
          {feedbacks?.map((f) => (
            <div key={f.id} className="text-sm">
              <p className="font-semibold text-ink">
                {f.autor?.nombreCompleto ?? "Alguien de la red"} · {f.fueEmergenciaReal ? "Fue una emergencia real" : "Falsa alarma"}
              </p>
              {f.comentario && <p className="text-ink-2">{f.comentario}</p>}
            </div>
          ))}
          {feedbacks?.length === 0 && (
            <form onSubmit={enviar} className="flex flex-col gap-3">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink-2">¿Fue una emergencia real?</legend>
                <div className="flex flex-wrap gap-2">
                  <Btn type="button" size="sm" variant={real === true ? "primary" : "secondary"} aria-pressed={real === true} onClick={() => setReal(true)}>
                    Sí
                  </Btn>
                  <Btn type="button" size="sm" variant={real === false ? "primary" : "secondary"} aria-pressed={real === false} onClick={() => setReal(false)}>
                    No, falsa alarma
                  </Btn>
                </div>
              </fieldset>
              <Field label="Comentario">
                <Textarea required value={comentario} onChange={(e) => setComentario(e.target.value)} />
              </Field>
              <ErrorText>{error}</ErrorText>
              <Btn type="submit" size="sm" loading={enviando} className="self-start">
                Enviar comentario
              </Btn>
            </form>
          )}
        </div>
      </Disclosure>
    </Card>
  );
}
