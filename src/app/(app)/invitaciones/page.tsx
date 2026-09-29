"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Inbox, MailPlus, Send, X } from "lucide-react";
import {
  Invitacion,
  TipoCuidador,
  TipoVinculo,
  aceptarInvitacion,
  crearInvitacion,
  getInvitacionesEnviadas,
  getInvitacionesRecibidas,
  getUsuarioById,
  mensajeDeError,
  rechazarInvitacion,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import { useToast } from "@/components/feedback";
import { Volver } from "@/components/Volver";
import { Avatar, Badge, Btn, Card, Empty, ErrorText, Field, Input, PageHeader, SectionTitle, Select, SkeletonList, formatFecha, stagger } from "@/components/ui";

const rolInvitado = (i: { tipoVinculo: TipoVinculo; tipoCuidador: TipoCuidador | null }) =>
  i.tipoVinculo === "FAMILIAR" ? "familiar" : i.tipoCuidador === "FISICO" ? "cuidador/a físico" : "cuidador/a digital";

const ESTADO_TONO = { ACEPTADA: "ok", PENDIENTE: "warn", RECHAZADA: "neutral", EXPIRADA: "neutral" } as const;
const ESTADO_LABEL = { ACEPTADA: "Aceptada", PENDIENTE: "Pendiente", RECHAZADA: "Rechazada", EXPIRADA: "Vencida" } as const;

export default function InvitacionesPage() {
  const { user, ready } = useRequireAuth();
  const toast = useToast();
  const [recibidas, setRecibidas] = useState<(Invitacion & { emisor?: string })[]>([]);
  const [enviadas, setEnviadas] = useState<Invitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await getInvitacionesRecibidas();
      // El backend no incluye el nombre de quien invita; solo se puede leer si ya hay un vínculo.
      setRecibidas(await Promise.all(r.map(async (i) => ({ ...i, emisor: (await getUsuarioById(i.emisorId).catch(() => null))?.nombreCompleto }))));
      setEnviadas(await getInvitacionesEnviadas());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    if (user) cargar();
  }, [user, cargar]);

  if (!ready || !user) return null;
  const esAdulto = user.rol === "ADULTO_MAYOR";

  async function responder(i: Invitacion, aceptar: boolean) {
    setError(null);
    setOcupada(i.id);
    try {
      await (aceptar ? aceptarInvitacion(i.id) : rechazarInvitacion(i.id));
      toast.ok(aceptar ? "¡Listo! Ya forman parte de la misma red de cuidado." : "Invitación rechazada.");
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupada(null);
    }
  }

  return (
    <>
      <Volver />
      <PageHeader title="Invitaciones" subtitle="El vínculo entre un adulto mayor y su red se crea solo cuando las dos partes están de acuerdo." />
      <ErrorText>{error}</ErrorText>
      {cargando && <SkeletonList rows={2} />}

      <section className="flex flex-col gap-3">
        <SectionTitle icon={Inbox}>Recibidas</SectionTitle>
        {!cargando && recibidas.length === 0 && (
          <Empty icon={Inbox} title="No tenés invitaciones pendientes">
            Cuando alguien te invite a su red de cuidado, la vas a ver acá.
          </Empty>
        )}
        <ul className="flex flex-col gap-3">
          {recibidas.map((i, n) => (
            <li key={i.id} className="rise" style={stagger(n)}>
              <Card className="flex flex-col gap-4 !border-brand/40 !p-5 sm:flex-row sm:items-center">
                <Avatar nombre={i.emisor ?? "?"} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-snug text-ink">
                    <strong>{i.emisor ?? "Alguien"}</strong>{" "}
                    {i.direccion === "EMISOR_ES_ADULTO_MAYOR" ? <>quiere que seas su {rolInvitado(i)}.</> : <>quiere acompañarte como {rolInvitado(i)}.</>}
                  </p>
                  <p className="text-sm text-ink-3">Vence el {formatFecha(i.expiraEn)}</p>
                </div>
                <div className="flex gap-2">
                  <Btn size={esAdulto ? "lg" : "md"} loading={ocupada === i.id} onClick={() => responder(i, true)}>
                    <Check size={18} aria-hidden /> Aceptar
                  </Btn>
                  <Btn size={esAdulto ? "lg" : "md"} variant="secondary" disabled={ocupada === i.id} onClick={() => responder(i, false)}>
                    <X size={18} aria-hidden /> Rechazar
                  </Btn>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {!esAdulto && <SolicitarVinculo onSent={cargar} />}

      {enviadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle icon={Send}>Enviadas</SectionTitle>
          <ul className="flex flex-col gap-2">
            {enviadas.map((i, n) => (
              <li key={i.id} className="rise flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2" style={stagger(n)}>
                <span>
                  <strong className="text-ink">{i.emailDestino}</strong> · {formatFecha(i.createdAt)}
                </span>
                <Badge tone={ESTADO_TONO[i.estado]}>{ESTADO_LABEL[i.estado]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SolicitarVinculo({ onSent }: { onSent: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<"FAMILIAR" | "CUIDADOR_FISICO" | "CUIDADOR_DIGITAL">("FAMILIAR");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearInvitacion({
        emailDestino: email.trim(),
        direccion: "EMISOR_ES_FAMILIAR",
        tipoVinculo: tipo === "FAMILIAR" ? "FAMILIAR" : "CUIDADOR",
        ...(tipo !== "FAMILIAR" && { tipoCuidador: tipo === "CUIDADOR_FISICO" ? "FISICO" : "DIGITAL" }),
      });
      setEmail("");
      toast.ok("Solicitud enviada. La persona decide si acepta.");
      onSent();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo enviar la solicitud."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <SectionTitle icon={MailPlus}>Pedir acompañar a un adulto mayor</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-2">Ingresá el email con el que la persona usa NONOS. Ella decide si acepta.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email del adulto mayor">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="¿Cómo la vas a acompañar?">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
              <option value="FAMILIAR">Como familiar</option>
              <option value="CUIDADOR_FISICO">Como cuidador/a físico (estoy cerca)</option>
              <option value="CUIDADOR_DIGITAL">Como cuidador/a digital (a distancia)</option>
            </Select>
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={enviando} className="self-start">
          <Send size={18} aria-hidden /> Enviar solicitud
        </Btn>
      </form>
    </Card>
  );
}
