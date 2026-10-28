"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Accessibility, Camera, HeartHandshake, LogOut, Monitor, Moon, Save, ShieldAlert, Sun, Type, UserRound } from "lucide-react";
import {
  deleteUsuario,
  editarIndicacionesCuidado,
  editarPreferenciasNotificacion,
  getFotoPerfilUrl,
  getPreferenciasNotificacion,
  getUsuarioById,
  logoutAll,
  mensajeDeError,
  PreferenciasNotificacion,
  subirFotoPerfil,
  TipoGrupoSanguineo,
  updateUsuario,
} from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { usePreferencias } from "@/lib/preferences";
import { PushSettings } from "@/components/PushPrompt";
import { useConfirm, useToast } from "@/components/feedback";
import { Volver } from "@/components/Volver";
import { Avatar, Badge, Btn, Card, ErrorText, Field, Input, PageHeader, SectionTitle, Select, Switch, Tabs, Textarea } from "@/components/ui";

const GRUPOS_SANGUINEOS: { value: TipoGrupoSanguineo; label: string }[] = [
  { value: "A_POSITIVO", label: "A+" },
  { value: "A_NEGATIVO", label: "A-" },
  { value: "B_POSITIVO", label: "B+" },
  { value: "B_NEGATIVO", label: "B-" },
  { value: "AB_POSITIVO", label: "AB+" },
  { value: "AB_NEGATIVO", label: "AB-" },
  { value: "O_POSITIVO", label: "O+" },
  { value: "O_NEGATIVO", label: "O-" },
];

function PreferenciasNotificacionesPush({ usuarioId }: { usuarioId: string }) {
  const [prefs, setPrefs] = useState<PreferenciasNotificacion | null>(null);
  const toast = useToast();

  useEffect(() => {
    getPreferenciasNotificacion(usuarioId).then(setPrefs).catch(() => {});
  }, [usuarioId]);

  async function cambiar(campo: keyof PreferenciasNotificacion, valor: boolean) {
    if (!prefs) return;
    const previo = prefs;
    setPrefs({ ...prefs, [campo]: valor });
    try {
      const actualizado = await editarPreferenciasNotificacion(usuarioId, { [campo]: valor });
      setPrefs(actualizado);
    } catch (e) {
      setPrefs(previo);
      toast.error(mensajeDeError(e));
    }
  }

  if (!prefs) return null;

  return (
    <Card className="flex flex-col gap-1">
      <SectionTitle icon={HeartHandshake}>Qué notificaciones quiero recibir</SectionTitle>
      <ul className="divide-y divide-line">
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-semibold text-ink">Actividad</p>
            <p className="text-sm text-ink-2">Cambios de rutina y logros.</p>
          </div>
          <Switch checked={prefs.notifActividad} onChange={(v) => cambiar("notifActividad", v)} label="Actividad" />
        </li>
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-semibold text-ink">Bienestar</p>
            <p className="text-sm text-ink-2">Frecuencia cardíaca y oxígeno fuera de lo habitual.</p>
          </div>
          <Switch checked={prefs.notifBienestar} onChange={(v) => cambiar("notifBienestar", v)} label="Bienestar" />
        </li>
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-semibold text-ink">Recordatorios</p>
            <p className="text-sm text-ink-2">Avisos de medicación (próximamente).</p>
          </div>
          <Switch checked={prefs.notifRecordatorios} onChange={(v) => cambiar("notifRecordatorios", v)} label="Recordatorios" />
        </li>
      </ul>
    </Card>
  );
}

function Accesibilidad() {
  const [prefs, cambiar] = usePreferencias();
  return (
    <Card className="flex flex-col gap-5">
      <SectionTitle icon={Accessibility}>Accesibilidad y apariencia</SectionTitle>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink-2">Tema</p>
        <Tabs
          variant="segmented"
          label="Tema de color"
          value={prefs.theme}
          onChange={(theme) => cambiar({ theme })}
          tabs={[
            { key: "auto", label: "Automático", icon: Monitor },
            { key: "light", label: "Claro", icon: Sun },
            { key: "dark", label: "Oscuro", icon: Moon },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-2">
          <Type size={16} aria-hidden /> Tamaño del texto
        </p>
        <Tabs
          variant="segmented"
          label="Tamaño del texto"
          value={prefs.text}
          onChange={(text) => cambiar({ text })}
          tabs={[
            { key: "normal", label: "Normal" },
            { key: "lg", label: "Grande" },
            { key: "xl", label: "Muy grande" },
          ]}
        />
        <p className="rounded-xl bg-surface-2 px-4 py-3 leading-relaxed text-ink">Así se ve el texto en toda la aplicación.</p>
      </div>
      <ul className="divide-y divide-line">
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-semibold text-ink">Alto contraste</p>
            <p className="text-sm text-ink-2">Bordes y textos secundarios más marcados.</p>
          </div>
          <Switch checked={prefs.contrast === "high"} onChange={(v) => cambiar({ contrast: v ? "high" : "normal" })} label="Alto contraste" />
        </li>
        <li className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-semibold text-ink">Reducir animaciones</p>
            <p className="text-sm text-ink-2">Menos movimiento en transiciones y gráficos.</p>
          </div>
          <Switch checked={prefs.motion === "reduce"} onChange={(v) => cambiar({ motion: v ? "reduce" : "auto" })} label="Reducir animaciones" />
        </li>
      </ul>
    </Card>
  );
}

export default function PerfilPage() {
  const { user, ready } = useRequireAuth();
  const { logout, refreshUser } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [dni, setDni] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [grupoSanguineo, setGrupoSanguineo] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [carnetObraSocial, setCarnetObraSocial] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [indicaciones, setIndicaciones] = useState("");
  const [guardandoIndicaciones, setGuardandoIndicaciones] = useState(false);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setNombre(user.nombreCompleto);
    setTelefono(user.telefono ?? "");
    setNacimiento(user.fechaNacimiento ? user.fechaNacimiento.slice(0, 10) : "");
    setDni(user.dni != null ? String(user.dni) : "");
    setDomicilio(user.domicilio ?? "");
    setGrupoSanguineo(user.grupoSanguineo ?? "");
    setObraSocial(user.obraSocial ?? "");
    setCarnetObraSocial(user.carnetObraSocial ?? "");
    getUsuarioById(user.id).then((u) => setIndicaciones(u.indicacionesCuidado ?? "")).catch(() => {});
  }, [user]);

  if (!ready || !user) return null;
  const usuario = user;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await updateUsuario(usuario.id, {
        nombreCompleto: nombre,
        telefono,
        fechaNacimiento: nacimiento || null,
        dni: dni ? Number(dni) : null,
        domicilio: domicilio || null,
        grupoSanguineo: (grupoSanguineo || null) as TipoGrupoSanguineo | null,
        obraSocial: obraSocial || null,
        carnetObraSocial: carnetObraSocial || null,
      });
      await refreshUser();
      toast.ok("Perfil actualizado.");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function guardarIndicaciones(e: FormEvent) {
    e.preventDefault();
    setGuardandoIndicaciones(true);
    try {
      await editarIndicacionesCuidado(usuario.id, indicaciones);
      await refreshUser();
      toast.ok("Indicaciones de cuidado actualizadas.");
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setGuardandoIndicaciones(false);
    }
  }

  async function subirFoto(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      await subirFotoPerfil(usuario.id, archivo);
      await refreshUser();
      toast.ok("Foto de perfil actualizada.");
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setSubiendoFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = "";
    }
  }

  async function cerrarTodas() {
    const ok = await confirmar({
      title: "¿Cerrar sesión en todos tus dispositivos?",
      message: "Vas a tener que volver a iniciar sesión en cada uno, incluido este.",
      confirmLabel: "Cerrar todas las sesiones",
      tone: "brand",
      icon: LogOut,
    });
    if (!ok) return;
    await logoutAll().catch(() => {});
    logout();
  }

  async function baja() {
    const ok = await confirmar({
      title: "¿Dar de baja tu cuenta?",
      message: "Vas a dejar de poder ingresar a NONOS y tu red de cuidado deja de recibir tus avisos.",
      confirmLabel: "Dar de baja mi cuenta",
      icon: ShieldAlert,
    });
    if (!ok) return;
    try {
      await deleteUsuario(usuario.id);
      logout();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <>
      <Volver />
      <PageHeader title="Mi perfil" />

      <Card className="flex items-center gap-4 !bg-brand-soft/70">
        <div className="relative shrink-0">
          <Avatar nombre={usuario.nombreCompleto} fotoUrl={usuario.fotoUrl ? getFotoPerfilUrl(usuario.id) : null} size={64} />
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            disabled={subiendoFoto}
            aria-label="Cambiar foto de perfil"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-sm"
          >
            {subiendoFoto ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" /> : <Camera size={14} aria-hidden />}
          </button>
          <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subirFoto} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-ink">{usuario.nombreCompleto}</p>
          <p className="truncate text-sm text-ink-2">{usuario.email}</p>
          <div className="mt-1.5">
            <Badge tone="ok">{usuario.rol === "ADULTO_MAYOR" ? "Adulto mayor" : "Familiar / cuidador"}</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <SectionTitle icon={UserRound}>Mis datos</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo">
              <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <Input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </Field>
            <Field label="Fecha de nacimiento">
              <Input type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} />
            </Field>
            <Field label="DNI">
              <Input type="number" value={dni} onChange={(e) => setDni(e.target.value)} />
            </Field>
            <Field label="Domicilio">
              <Input value={domicilio} onChange={(e) => setDomicilio(e.target.value)} />
            </Field>
            <Field label="Grupo sanguíneo">
              <Select value={grupoSanguineo} onChange={(e) => setGrupoSanguineo(e.target.value)}>
                <option value="">Sin especificar</option>
                {GRUPOS_SANGUINEOS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Obra social">
              <Input value={obraSocial} onChange={(e) => setObraSocial(e.target.value)} />
            </Field>
            <Field label="N° de carnet de obra social">
              <Input value={carnetObraSocial} onChange={(e) => setCarnetObraSocial(e.target.value)} />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <Btn type="submit" size="lg" loading={guardando} className="self-start">
            <Save size={18} aria-hidden /> Guardar cambios
          </Btn>
        </form>
      </Card>

      {usuario.rol === "ADULTO_MAYOR" && (
        <Card>
          <form onSubmit={guardarIndicaciones} className="flex flex-col gap-4">
            <SectionTitle icon={HeartHandshake}>Indicaciones de cuidado</SectionTitle>
            <p className="text-sm text-ink-2">
              Preferencias del día a día para quien te cuida (ej. &quot;prefiero que me hablen fuerte&quot;). No es información médica
              de emergencia: para eso están las medidas anticipadas en tu ficha.
            </p>
            <Textarea value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} maxLength={5000} />
            <Btn type="submit" loading={guardandoIndicaciones} className="self-start">
              <Save size={18} aria-hidden /> Guardar indicaciones
            </Btn>
          </form>
        </Card>
      )}

      <PushSettings />
      <PreferenciasNotificacionesPush usuarioId={usuario.id} />
      <Accesibilidad />

      <Card className="flex flex-col gap-3">
        <SectionTitle icon={ShieldAlert}>Sesión y cuenta</SectionTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Btn variant="secondary" onClick={cerrarTodas}>
            <LogOut size={18} aria-hidden /> Cerrar sesión en todos mis dispositivos
          </Btn>
          <Btn variant="danger" onClick={baja}>
            Dar de baja mi cuenta
          </Btn>
        </div>
      </Card>
    </>
  );
}
