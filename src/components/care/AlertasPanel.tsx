"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, PartyPopper, Info, MessageSquare } from "lucide-react";
import {
  Alerta,
  Feedback,
  confirmarAlerta,
  crearFeedback,
  getAlertas,
  getFeedback,
  mensajeDeError,
} from "@/lib/api";
import { ALERTA_ESTADO_LABEL, ALERTA_INFO, mensajeParaAdulto, mensajeParaCuidador } from "@/lib/alertas-format";
import { Badge, Btn, Card, Empty, ErrorText, Field, formatFecha, Loading, SectionTitle, Textarea } from "@/components/ui";

function IconoAlerta({ a }: { a: Alerta }) {
  if (a.tipo === "LOGRO_POSITIVO") return <PartyPopper size={22} className="text-[#25665F]" aria-hidden />;
  if (ALERTA_INFO[a.tipo].critica) return <AlertTriangle size={22} className="text-[#BA1A1A]" aria-hidden />;
  return <Info size={22} className="text-[#98462E]" aria-hidden />;
}

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
    recargar();
    const id = setInterval(() => document.visibilityState === "visible" && recargar(), intervaloMs);
    return () => clearInterval(id);
  }, [recargar, intervaloMs]);

  return { items, cargando, error, recargar };
}

/* ───── Vista del adulto mayor: solo lo que requiere su respuesta ───── */

export function AlertaPendienteAdulto({ adultoMayorId }: { adultoMayorId: string }) {
  const { items, recargar } = useAlertas(adultoMayorId, 15_000);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendiente = items.find(
    (a) => a.estado === "PENDIENTE" && !a.confirmadaEn && a.tipo !== "LOGRO_POSITIVO" && a.tipo !== "MEDICACION_STOCK_BAJO",
  );
  const logro = items.find((a) => a.tipo === "LOGRO_POSITIVO" && Date.now() - new Date(a.createdAt).getTime() < 24 * 3600 * 1000);

  async function responder(isOk: boolean) {
    if (!pendiente) return;
    setEnviando(true);
    setError(null);
    try {
      await confirmarAlerta(pendiente.id, isOk);
      await recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {pendiente && (
        <Card className="flex flex-col gap-4 !border-2 !border-[#BA1A1A]/40 !bg-[#FFF8F7]">
          <p className="text-xl font-bold text-[#181C1B]">{mensajeParaAdulto(pendiente)}</p>
          {pendiente.tipo !== "SOS_DIRECTO" && (
            <div className="grid grid-cols-2 gap-3">
              <Btn size="lg" loading={enviando} onClick={() => responder(true)}>Estoy bien</Btn>
              <Btn size="lg" variant="danger" loading={enviando} onClick={() => responder(false)}>Necesito ayuda</Btn>
            </div>
          )}
          <ErrorText>{error}</ErrorText>
        </Card>
      )}
      {logro && (
        <Card className="flex items-center gap-3 !bg-[#DCF4EF]">
          <PartyPopper size={28} className="text-[#25665F]" aria-hidden />
          <p className="font-semibold text-[#181C1B]">{mensajeParaAdulto(logro)}</p>
        </Card>
      )}
    </>
  );
}

/* ───── Vista del cuidador/familiar: listado con feedback ───── */

export function AlertasCuidador({ adultoMayorId, nombre }: { adultoMayorId: string; nombre: string }) {
  const { items, cargando, error } = useAlertas(adultoMayorId);

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Alertas</SectionTitle>
      <ErrorText>{error}</ErrorText>
      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>Sin alertas. Cuando haya algo relevante, aparece acá.</Empty>}
      <ul className="flex flex-col gap-3">
        {items.map((a) => (
          <li key={a.id}>
            <AlertaItem alerta={a} nombre={nombre} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertaItem({ alerta: a, nombre }: { alerta: Alerta; nombre: string }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [real, setReal] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarFeedback = useCallback(() => getFeedback(a.id).then(setFeedbacks).catch(() => setFeedbacks([])), [a.id]);

  async function toggle() {
    if (!abierto && feedbacks === null) await cargarFeedback();
    setAbierto((v) => !v);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (real === null) return setError("Indicá si fue una emergencia real.");
    setEnviando(true);
    setError(null);
    try {
      await crearFeedback({ alertaId: a.id, comentario, fueEmergenciaReal: real });
      setComentario("");
      setReal(null);
      await cargarFeedback();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo enviar. Puede que esta alerta ya tenga un comentario."));
    } finally {
      setEnviando(false);
    }
  }

  const info = ALERTA_INFO[a.tipo];
  return (
    <Card className={`flex flex-col gap-2 !p-4 ${info.critica && a.estado === "PENDIENTE" ? "!border-[#BA1A1A]/50" : ""}`}>
      <div className="flex items-start gap-3">
        <IconoAlerta a={a} />
        <div className="flex-1">
          <p className="font-semibold text-[#181C1B]">{info.titulo}</p>
          <p className="text-sm text-[#3F4947]">{mensajeParaCuidador(a, nombre)}</p>
          <p className="mt-1 text-xs text-[#6F7977]">{formatFecha(a.createdAt, true)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={a.estado === "RESUELTA" ? "ok" : a.estado === "PENDIENTE" ? (info.critica ? "crit" : "warn") : "neutral"}>
            {ALERTA_ESTADO_LABEL[a.estado]}
          </Badge>
          {a.confirmadaEn && a.estado === "PENDIENTE" && <Badge tone="warn">Respondió: necesita ayuda</Badge>}
        </div>
      </div>
      <button onClick={toggle} className="flex min-h-9 items-center gap-1 self-start text-sm font-semibold text-[#25665F] underline">
        <MessageSquare size={16} aria-hidden /> {abierto ? "Ocultar comentarios" : "Comentarios"}
      </button>
      {abierto && (
        <div className="flex flex-col gap-3 rounded-lg bg-[#F1F4F2] p-3">
          {feedbacks === null && <Loading />}
          {feedbacks?.map((f) => (
            <div key={f.id} className="text-sm">
              <p className="font-semibold text-[#181C1B]">
                {f.autor?.nombreCompleto ?? "Alguien de la red"} · {f.fueEmergenciaReal ? "Fue una emergencia real" : "Falsa alarma"}
              </p>
              {f.comentario && <p className="text-[#3F4947]">{f.comentario}</p>}
            </div>
          ))}
          {feedbacks?.length === 0 && (
            <form onSubmit={enviar} className="flex flex-col gap-3">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-[#3F4947]">¿Fue una emergencia real?</legend>
                <div className="flex gap-2">
                  <Btn type="button" variant={real === true ? "primary" : "secondary"} aria-pressed={real === true} onClick={() => setReal(true)}>Sí</Btn>
                  <Btn type="button" variant={real === false ? "primary" : "secondary"} aria-pressed={real === false} onClick={() => setReal(false)}>No, falsa alarma</Btn>
                </div>
              </fieldset>
              <Field label="Comentario"><Textarea required value={comentario} onChange={(e) => setComentario(e.target.value)} /></Field>
              <ErrorText>{error}</ErrorText>
              <Btn type="submit" loading={enviando} className="self-start">Enviar comentario</Btn>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
