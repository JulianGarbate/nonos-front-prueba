"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PhoneCall, Trash2, ArrowUp, ArrowDown, Send } from "lucide-react";
import {
  Invitacion,
  Vinculo,
  crearInvitacion,
  deleteVinculo,
  getInvitacionesEnviadas,
  getUsuarioById,
  getVinculos,
  mensajeDeError,
  setContactoEmergencia,
  TipoCuidador,
  TipoVinculo,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import { Badge, Btn, Card, Empty, ErrorText, Field, formatFecha, Input, Loading, PageLoading, SectionTitle, Select } from "@/components/ui";

const etiquetaVinculo = (v: { tipoVinculo: TipoVinculo; tipoCuidador: TipoCuidador | null }) =>
  v.tipoVinculo === "FAMILIAR" ? "Familiar" : v.tipoCuidador === "FISICO" ? "Cuidador/a físico" : "Cuidador/a digital";

export default function RedPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [vinculos, setVinculos] = useState<(Vinculo & { nombre?: string; email?: string })[]>([]);
  const [enviadas, setEnviadas] = useState<Invitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const vs = await getVinculos(user.id);
      // GET /usuarios/:id solo autoriza a quien tiene vínculo "hacia" ese id: si falla, no mostramos el nombre.
      const todas = await getInvitacionesEnviadas();
      // Fallback: si no se puede leer el nombre, se usa el email de la invitación aceptada del mismo tipo
      // cuando hay una sola posible (evita adivinar si hay ambigüedad).
      const emailPara = (v: Vinculo) => {
        const mismas = todas.filter((i) => i.estado === "ACEPTADA" && i.direccion === "EMISOR_ES_ADULTO_MAYOR" && i.tipoVinculo === v.tipoVinculo && i.tipoCuidador === v.tipoCuidador);
        const vinculosMismoTipo = vs.filter((x) => x.tipoVinculo === v.tipoVinculo && x.tipoCuidador === v.tipoCuidador);
        return mismas.length === 1 && vinculosMismoTipo.length === 1 ? mismas[0].emailDestino : undefined;
      };
      const conNombre = await Promise.all(
        vs.map(async (v) => ({ ...v, nombre: (await getUsuarioById(v.familiarId).catch(() => null))?.nombreCompleto, email: emailPara(v) })),
      );
      setVinculos(conNombre);
      setEnviadas(todas.filter((i) => i.estado === "PENDIENTE"));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [user]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!ready || !user) return <PageLoading />;
  const usuarioId = user.id;

  const contactos = vinculos.filter((v) => v.esContactoEmergencia).sort((a, b) => (a.prioridadContacto ?? 99) - (b.prioridadContacto ?? 99));
  const resto = vinculos.filter((v) => !v.esContactoEmergencia);

  async function toggleEmergencia(v: Vinculo, valor: boolean) {
    setError(null);
    try {
      await setContactoEmergencia(usuarioId, {
        familiarId: v.familiarId,
        esContactoEmergencia: valor,
        ...(valor && { prioridadContacto: contactos.length + 1 }),
      });
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  async function mover(v: Vinculo, dir: -1 | 1) {
    const idx = contactos.findIndex((c) => c.id === v.id);
    const otro = contactos[idx + dir];
    if (!otro) return;
    setError(null);
    try {
      // Las prioridades son únicas: se usa un valor temporal para intercambiar sin chocar.
      const pv = v.prioridadContacto ?? idx + 1;
      const po = otro.prioridadContacto ?? idx + dir + 1;
      await setContactoEmergencia(usuarioId, { familiarId: v.familiarId, esContactoEmergencia: true, prioridadContacto: 900 });
      await setContactoEmergencia(usuarioId, { familiarId: otro.familiarId, esContactoEmergencia: true, prioridadContacto: pv });
      await setContactoEmergencia(usuarioId, { familiarId: v.familiarId, esContactoEmergencia: true, prioridadContacto: po });
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
      cargar();
    }
  }

  async function quitar(v: Vinculo & { nombre?: string; email?: string }) {
    if (!confirm(`¿Quitar a ${v.nombre ?? v.email ?? "esta persona"} de tu red?`)) return;
    try {
      await deleteVinculo(usuarioId, v.familiarId);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  const Fila = ({ v, idx }: { v: Vinculo & { nombre?: string; email?: string }; idx?: number }) => (
    <li className="flex flex-col gap-3 rounded-xl border border-[#E0E4E3] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-[#181C1B]">{v.nombre ?? v.email ?? "Persona de tu red"}</p>
          <Badge>{etiquetaVinculo(v)}</Badge>
        </div>
        {idx !== undefined && <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#BA1A1A] font-bold text-white" aria-label={`Prioridad ${idx + 1}`}>{idx + 1}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {idx !== undefined ? (
          <>
            <Btn variant="secondary" aria-label="Subir prioridad" disabled={idx === 0} onClick={() => mover(v, -1)}><ArrowUp size={18} aria-hidden /></Btn>
            <Btn variant="secondary" aria-label="Bajar prioridad" disabled={idx === contactos.length - 1} onClick={() => mover(v, 1)}><ArrowDown size={18} aria-hidden /></Btn>
            <Btn variant="secondary" onClick={() => toggleEmergencia(v, false)}>Dejar de avisar en emergencias</Btn>
          </>
        ) : (
          <Btn variant="secondary" onClick={() => toggleEmergencia(v, true)}><PhoneCall size={18} aria-hidden /> Avisar en emergencias</Btn>
        )}
        <Btn variant="danger" aria-label="Quitar de mi red" onClick={() => quitar(v)}><Trash2 size={18} aria-hidden /></Btn>
      </div>
    </li>
  );

  return (
    <AdultoMayorShell>
      <Link href="/adulto-mayor/mas" className="flex min-h-11 items-center gap-1 font-semibold text-[#25665F]"><ArrowLeft size={18} aria-hidden /> Volver</Link>
      <h1 className="text-3xl font-bold text-[#181C1B]">Mi red de cuidado</h1>
      <ErrorText>{error}</ErrorText>
      {cargando && <Loading />}

      <div className="flex flex-col gap-3">
        <SectionTitle>A quién avisar en una emergencia</SectionTitle>
        <p className="text-sm text-[#3F4947]">Se les avisa cuando pedís ayuda. El orden indica a quién contactar primero.</p>
        {!cargando && contactos.length === 0 && <Empty>Todavía no elegiste contactos de emergencia. Elegilos entre las personas de tu red.</Empty>}
        <ul className="flex flex-col gap-3">{contactos.map((v, i) => <Fila key={v.id} v={v} idx={i} />)}</ul>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Personas que me acompañan</SectionTitle>
        {!cargando && resto.length === 0 && <Empty>{vinculos.length ? "Todas las personas de tu red son contactos de emergencia." : "Todavía no sumaste a nadie. Invitá a un familiar o cuidador."}</Empty>}
        <ul className="flex flex-col gap-3">{resto.map((v) => <Fila key={v.id} v={v} />)}</ul>
      </div>

      <InvitarForm onSent={cargar} />

      {enviadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle>Invitaciones pendientes</SectionTitle>
          <ul className="flex flex-col gap-2">
            {enviadas.map((i) => (
              <li key={i.id} className="rounded-xl bg-[#F1F4F2] p-3 text-sm text-[#3F4947]">
                <strong>{i.emailDestino}</strong> · vence el {formatFecha(i.expiraEn)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdultoMayorShell>
  );
}

function InvitarForm({ onSent }: { onSent: () => void }) {
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
        direccion: "EMISOR_ES_ADULTO_MAYOR",
        tipoVinculo: tipo === "FAMILIAR" ? "FAMILIAR" : "CUIDADOR",
        ...(tipo !== "FAMILIAR" && { tipoCuidador: tipo === "CUIDADOR_FISICO" ? "FISICO" : "DIGITAL" }),
      });
      setEmail("");
      setOk(true);
      onSent();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo enviar la invitación."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[#181C1B]">Invitar a alguien</h2>
        <p className="text-sm text-[#3F4947]">La persona recibe la invitación al iniciar sesión con este email y decide si acepta. Nadie se suma a tu red sin su consentimiento y el tuyo.</p>
        <Field label="Email de la persona"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="¿Qué rol tiene?" hint="El cuidador físico está cerca y recibe las alertas importantes; el digital acompaña a distancia y recibe todo. Se puede cambiar después.">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="FAMILIAR">Familiar</option>
            <option value="CUIDADOR_FISICO">Cuidador/a físico (cerca mío)</option>
            <option value="CUIDADOR_DIGITAL">Cuidador/a digital (a distancia)</option>
          </Select>
        </Field>
        <ErrorText>{error}</ErrorText>
        {ok && <p role="status" className="text-sm font-medium text-[#25665F]">Invitación enviada.</p>}
        <Btn type="submit" size="lg" loading={enviando}><Send size={18} aria-hidden /> Enviar invitación</Btn>
      </form>
    </Card>
  );
}
