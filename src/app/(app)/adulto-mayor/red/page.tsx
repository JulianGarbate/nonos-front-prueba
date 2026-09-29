"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, BellRing, Clock, PhoneCall, Send, Trash2, UserPlus, Users } from "lucide-react";
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
  updateVinculo,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import { useConfirm, useToast } from "@/components/feedback";
import { Volver } from "@/components/Volver";
import { Avatar, Badge, Btn, Card, Empty, ErrorText, Field, Input, PageHeader, SectionTitle, Select, SkeletonList, cx, formatFecha, stagger } from "@/components/ui";

type Rol = "FAMILIAR" | "CUIDADOR_FISICO" | "CUIDADOR_DIGITAL";
type VinculoConNombre = Vinculo & { nombre?: string; email?: string };

const rolDe = (v: { tipoVinculo: TipoVinculo; tipoCuidador: TipoCuidador | null }): Rol =>
  v.tipoVinculo === "FAMILIAR" ? "FAMILIAR" : v.tipoCuidador === "FISICO" ? "CUIDADOR_FISICO" : "CUIDADOR_DIGITAL";
const ETIQUETA: Record<Rol, string> = { FAMILIAR: "Familiar", CUIDADOR_FISICO: "Cuidador/a físico", CUIDADOR_DIGITAL: "Cuidador/a digital" };

export default function RedPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const confirmar = useConfirm();
  const toast = useToast();
  const [vinculos, setVinculos] = useState<VinculoConNombre[]>([]);
  const [enviadas, setEnviadas] = useState<Invitacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const vs = await getVinculos(user.id);
      // GET /usuarios/:id solo autoriza a quien tiene vínculo "hacia" ese id: para el adulto mayor da 403.
      // Fallback: si no se puede leer el nombre, se usa el email de la invitación aceptada del mismo tipo
      // cuando hay una sola posible (evita adivinar si hay ambigüedad).
      const todas = await getInvitacionesEnviadas();
      const emailPara = (v: Vinculo) => {
        const mismas = todas.filter((i) => i.estado === "ACEPTADA" && i.direccion === "EMISOR_ES_ADULTO_MAYOR" && i.tipoVinculo === v.tipoVinculo && i.tipoCuidador === v.tipoCuidador);
        const vinculosMismoTipo = vs.filter((x) => x.tipoVinculo === v.tipoVinculo && x.tipoCuidador === v.tipoCuidador);
        return mismas.length === 1 && vinculosMismoTipo.length === 1 ? mismas[0].emailDestino : undefined;
      };
      // Lo que se logró identificar se recuerda en este navegador: el tipo del vínculo puede cambiar y con él se perdería la coincidencia.
      const claveCache = `nonos_red_nombres_${user.id}`;
      let cache: Record<string, string> = {};
      try {
        cache = JSON.parse(window.localStorage.getItem(claveCache) ?? "{}");
      } catch {}
      const conNombre = await Promise.all(
        vs.map(async (v) => {
          const nombre = (await getUsuarioById(v.familiarId).catch(() => null))?.nombreCompleto;
          const email = emailPara(v);
          const identificado = nombre ?? email;
          if (identificado) cache[v.familiarId] = identificado;
          return { ...v, nombre, email: email ?? (nombre ? undefined : cache[v.familiarId]) };
        }),
      );
      try {
        window.localStorage.setItem(claveCache, JSON.stringify(cache));
      } catch {}
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

  if (!ready || !user) return null;
  const usuarioId = user.id;

  const contactos = vinculos.filter((v) => v.esContactoEmergencia).sort((a, b) => (a.prioridadContacto ?? 99) - (b.prioridadContacto ?? 99));
  const resto = vinculos.filter((v) => !v.esContactoEmergencia);
  const nombreDe = (v: VinculoConNombre) => v.nombre ?? v.email ?? "Persona de tu red";

  async function toggleEmergencia(v: VinculoConNombre, valor: boolean) {
    setError(null);
    setOcupado(v.id);
    try {
      await setContactoEmergencia(usuarioId, {
        familiarId: v.familiarId,
        esContactoEmergencia: valor,
        ...(valor && { prioridadContacto: contactos.length + 1 }),
      });
      toast.ok(valor ? `${nombreDe(v)} recibirá los avisos de emergencia.` : `${nombreDe(v)} ya no recibirá avisos de emergencia.`);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function mover(v: VinculoConNombre, dir: -1 | 1) {
    const idx = contactos.findIndex((c) => c.id === v.id);
    const otro = contactos[idx + dir];
    if (!otro) return;
    setError(null);
    setOcupado(v.id);
    try {
      // Las prioridades son únicas: se usa un valor temporal para intercambiar sin chocar.
      const pv = v.prioridadContacto ?? idx + 1;
      const po = otro.prioridadContacto ?? idx + dir + 1;
      await setContactoEmergencia(usuarioId, { familiarId: v.familiarId, esContactoEmergencia: true, prioridadContacto: 900 });
      await setContactoEmergencia(usuarioId, { familiarId: otro.familiarId, esContactoEmergencia: true, prioridadContacto: pv });
      await setContactoEmergencia(usuarioId, { familiarId: v.familiarId, esContactoEmergencia: true, prioridadContacto: po });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
      cargar();
    }
  }

  async function cambiarRol(v: VinculoConNombre, nuevo: Rol) {
    if (nuevo === rolDe(v)) return;
    const ok = await confirmar({
      title: `¿Cambiar a ${ETIQUETA[nuevo].toLowerCase()}?`,
      message: `${nombreDe(v)} pasa a ser ${ETIQUETA[nuevo].toLowerCase()}. Sus avisos vuelven a la configuración por defecto de ese rol (se pisan las preferencias que haya elegido).`,
      confirmLabel: "Cambiar rol",
      tone: "brand",
      icon: BellRing,
    });
    if (!ok) return;
    setOcupado(v.id);
    try {
      await updateVinculo(usuarioId, v.familiarId, {
        tipoVinculo: nuevo === "FAMILIAR" ? "FAMILIAR" : "CUIDADOR",
        ...(nuevo !== "FAMILIAR" && { tipoCuidador: nuevo === "CUIDADOR_FISICO" ? "FISICO" : "DIGITAL" }),
      });
      toast.ok(`Ahora ${nombreDe(v)} figura como ${ETIQUETA[nuevo].toLowerCase()}.`);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function quitar(v: VinculoConNombre) {
    const ok = await confirmar({
      title: `¿Quitar a ${nombreDe(v)} de tu red?`,
      message: "Deja de ver tus datos y de recibir tus avisos. Para volver a sumarla hace falta una invitación nueva.",
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    try {
      await deleteVinculo(usuarioId, v.familiarId);
      toast.ok("Se quitó de tu red.");
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  const fila = (v: VinculoConNombre, idx?: number) => (
    <li key={v.id} className="rise" style={stagger(idx ?? 0)}>
      <Card className={cx("flex flex-col gap-4 !p-4 sm:!p-5", ocupado === v.id && "opacity-70")}>
        <div className="flex items-start gap-3.5">
          {idx !== undefined ? (
            <span className="relative">
              <Avatar nombre={nombreDe(v)} size={52} />
              <span
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger-fill text-xs font-extrabold text-white ring-2 ring-surface"
                aria-label={`Prioridad ${idx + 1}`}
              >
                {idx + 1}
              </span>
            </span>
          ) : (
            <Avatar nombre={nombreDe(v)} size={52} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-ink">{nombreDe(v)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="ok">{ETIQUETA[rolDe(v)]}</Badge>
              <Badge>
                <BellRing size={12} aria-hidden /> {v.tipoNotificaciones.length} tipo{v.tipoNotificaciones.length === 1 ? "" : "s"} de aviso
              </Badge>
            </div>
          </div>
          {idx !== undefined && (
            <div className="flex shrink-0 flex-col gap-1">
              <Btn variant="secondary" size="sm" aria-label="Subir prioridad" disabled={idx === 0 || !!ocupado} onClick={() => mover(v, -1)}>
                <ArrowUp size={16} aria-hidden />
              </Btn>
              <Btn variant="secondary" size="sm" aria-label="Bajar prioridad" disabled={idx === contactos.length - 1 || !!ocupado} onClick={() => mover(v, 1)}>
                <ArrowDown size={16} aria-hidden />
              </Btn>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <label className="flex min-w-44 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-3">Rol</span>
            <Select value={rolDe(v)} disabled={!!ocupado} onChange={(e) => cambiarRol(v, e.target.value as Rol)} className="!min-h-10 text-sm">
              {(Object.keys(ETIQUETA) as Rol[]).map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA[r]}
                </option>
              ))}
            </Select>
          </label>
          {idx !== undefined ? (
            <Btn variant="secondary" size="sm" disabled={!!ocupado} onClick={() => toggleEmergencia(v, false)}>
              Dejar de avisar en emergencias
            </Btn>
          ) : (
            <Btn variant="secondary" size="sm" disabled={!!ocupado} onClick={() => toggleEmergencia(v, true)}>
              <PhoneCall size={16} aria-hidden /> Avisar en emergencias
            </Btn>
          )}
          <Btn variant="danger" size="sm" aria-label={`Quitar a ${nombreDe(v)} de mi red`} disabled={!!ocupado} onClick={() => quitar(v)}>
            <Trash2 size={16} aria-hidden />
          </Btn>
        </div>
      </Card>
    </li>
  );

  return (
    <>
      <Volver />
      <PageHeader title="Mi red de cuidado" subtitle="Las personas que te acompañan y a quién avisar primero si pedís ayuda." />
      <ErrorText>{error}</ErrorText>
      {cargando && <SkeletonList rows={3} />}

      <section className="flex flex-col gap-3">
        <SectionTitle icon={PhoneCall}>A quién avisar en una emergencia</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-2">Se les avisa cuando pedís ayuda. El número indica a quién contactar primero.</p>
        {!cargando && contactos.length === 0 && (
          <Empty icon={PhoneCall} title="Todavía no elegiste contactos de emergencia">
            Elegí entre las personas de tu red a quiénes avisar primero.
          </Empty>
        )}
        <ul className="grid gap-3">{contactos.map((v, i) => fila(v, i))}</ul>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle icon={Users}>Personas que me acompañan</SectionTitle>
        {!cargando && resto.length === 0 && (
          <Empty icon={Users} title={vinculos.length ? "Todas son contactos de emergencia" : "Todavía no sumaste a nadie"}>
            {vinculos.length ? "Todas las personas de tu red reciben tus avisos de emergencia." : "Invitá a un familiar o cuidador con el formulario de abajo."}
          </Empty>
        )}
        <ul className="grid gap-3">{resto.map((v) => fila(v))}</ul>
      </section>

      <InvitarForm onSent={cargar} />

      {enviadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle icon={Clock}>Invitaciones pendientes</SectionTitle>
          <ul className="flex flex-col gap-2">
            {enviadas.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
                <strong className="text-ink">{i.emailDestino}</strong>
                <span>vence el {formatFecha(i.expiraEn)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function InvitarForm({ onSent }: { onSent: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<Rol>("FAMILIAR");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearInvitacion({
        emailDestino: email.trim(),
        direccion: "EMISOR_ES_ADULTO_MAYOR",
        tipoVinculo: tipo === "FAMILIAR" ? "FAMILIAR" : "CUIDADOR",
        ...(tipo !== "FAMILIAR" && { tipoCuidador: tipo === "CUIDADOR_FISICO" ? "FISICO" : "DIGITAL" }),
      });
      setEmail("");
      toast.ok("Invitación enviada. La persona la verá al iniciar sesión.");
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
        <SectionTitle icon={UserPlus}>Invitar a alguien</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-2">
          La persona recibe la invitación al iniciar sesión con este email y decide si acepta. Nadie se suma a tu red sin su consentimiento y el tuyo.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email de la persona">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="¿Qué rol tiene?" hint="El cuidador físico está cerca y recibe las alertas importantes; el digital acompaña a distancia y recibe todo. Se puede cambiar después.">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as Rol)}>
              <option value="FAMILIAR">Familiar</option>
              <option value="CUIDADOR_FISICO">Cuidador/a físico (cerca mío)</option>
              <option value="CUIDADOR_DIGITAL">Cuidador/a digital (a distancia)</option>
            </Select>
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" size="lg" loading={enviando}>
          <Send size={18} aria-hidden /> Enviar invitación
        </Btn>
      </form>
    </Card>
  );
}
