"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, Send } from "lucide-react";
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
import { homeForRol, useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import CuidadorShell from "@/components/CuidadorShell";
import { Badge, Btn, Card, Empty, ErrorText, Field, formatFecha, Input, Loading, PageLoading, SectionTitle, Select } from "@/components/ui";

const rolInvitado = (i: { tipoVinculo: TipoVinculo; tipoCuidador: TipoCuidador | null }) =>
  i.tipoVinculo === "FAMILIAR" ? "familiar" : i.tipoCuidador === "FISICO" ? "cuidador/a físico" : "cuidador/a digital";

export default function InvitacionesPage() {
  const { user, ready } = useRequireAuth();
  const [recibidas, setRecibidas] = useState<(Invitacion & { emisor?: string })[]>([]);
  const [enviadas, setEnviadas] = useState<Invitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await getInvitacionesRecibidas();
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

  if (!ready || !user) return <PageLoading />;
  const esAdulto = user.rol === "ADULTO_MAYOR";

  async function responder(i: Invitacion, aceptar: boolean) {
    setError(null);
    try {
      await (aceptar ? aceptarInvitacion(i.id) : rechazarInvitacion(i.id));
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  const contenido = (
    <>
      <Link href={homeForRol(user.rol)} className="flex min-h-11 items-center gap-1 font-semibold text-[#25665F]"><ArrowLeft size={18} aria-hidden /> Volver</Link>
      <h1 className="text-3xl font-bold text-[#181C1B]">Invitaciones</h1>
      <p className="text-[#3F4947]">
        El vínculo entre un adulto mayor y su red se crea solo cuando las dos partes están de acuerdo.
      </p>
      <ErrorText>{error}</ErrorText>
      {cargando && <Loading />}

      <div className="flex flex-col gap-3">
        <SectionTitle>Recibidas</SectionTitle>
        {!cargando && recibidas.length === 0 && <Empty>No tenés invitaciones pendientes.</Empty>}
        {recibidas.map((i) => (
          <Card key={i.id} className="flex flex-col gap-3 !p-4">
            <p className="text-lg text-[#181C1B]">
              <strong>{i.emisor ?? "Alguien"}</strong>{" "}
              {i.direccion === "EMISOR_ES_ADULTO_MAYOR" ? <>quiere que seas su {rolInvitado(i)}.</> : <>quiere acompañarte como {rolInvitado(i)}.</>}
            </p>
            <p className="text-xs text-[#6F7977]">Vence el {formatFecha(i.expiraEn)}</p>
            <div className="flex gap-2">
              <Btn size={esAdulto ? "lg" : "md"} onClick={() => responder(i, true)}><Check size={18} aria-hidden /> Aceptar</Btn>
              <Btn size={esAdulto ? "lg" : "md"} variant="secondary" onClick={() => responder(i, false)}><X size={18} aria-hidden /> Rechazar</Btn>
            </div>
          </Card>
        ))}
      </div>

      {!esAdulto && <SolicitarVinculo onSent={cargar} />}

      {enviadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle>Enviadas</SectionTitle>
          <ul className="flex flex-col gap-2">
            {enviadas.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#F1F4F2] p-3 text-sm text-[#3F4947]">
                <span><strong>{i.emailDestino}</strong> · {formatFecha(i.createdAt)}</span>
                <Badge tone={i.estado === "ACEPTADA" ? "ok" : i.estado === "PENDIENTE" ? "warn" : "neutral"}>{i.estado.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return esAdulto ? <AdultoMayorShell>{contenido}</AdultoMayorShell> : <CuidadorShell>{contenido}</CuidadorShell>;
}

function SolicitarVinculo({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<"FAMILIAR" | "CUIDADOR_FISICO" | "CUIDADOR_DIGITAL">("FAMILIAR");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setEnviando(true);
    try {
      await crearInvitacion({
        emailDestino: email.trim(),
        direccion: "EMISOR_ES_FAMILIAR",
        tipoVinculo: tipo === "FAMILIAR" ? "FAMILIAR" : "CUIDADOR",
        ...(tipo !== "FAMILIAR" && { tipoCuidador: tipo === "CUIDADOR_FISICO" ? "FISICO" : "DIGITAL" }),
      });
      setEmail("");
      setOk(true);
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
        <h2 className="text-xl font-bold text-[#181C1B]">Pedir acompañar a un adulto mayor</h2>
        <p className="text-sm text-[#3F4947]">Ingresá el email con el que la persona usa NONOS. Ella decide si acepta.</p>
        <Field label="Email del adulto mayor"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="¿Cómo la vas a acompañar?">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="FAMILIAR">Como familiar</option>
            <option value="CUIDADOR_FISICO">Como cuidador/a físico (estoy cerca)</option>
            <option value="CUIDADOR_DIGITAL">Como cuidador/a digital (a distancia)</option>
          </Select>
        </Field>
        <ErrorText>{error}</ErrorText>
        {ok && <p role="status" className="text-sm font-medium text-[#25665F]">Solicitud enviada.</p>}
        <Btn type="submit" loading={enviando}><Send size={18} aria-hidden /> Enviar solicitud</Btn>
      </form>
    </Card>
  );
}
