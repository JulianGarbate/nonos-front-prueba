"use client";

import { FormEvent, useEffect, useState } from "react";
import { Accessibility, LogOut, Monitor, Moon, Save, ShieldAlert, Sun, Type, UserRound } from "lucide-react";
import { deleteUsuario, logoutAll, mensajeDeError, updateUsuario } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { usePreferencias } from "@/lib/preferences";
import { PushSettings } from "@/components/PushPrompt";
import { useConfirm, useToast } from "@/components/feedback";
import { Volver } from "@/components/Volver";
import { Avatar, Badge, Btn, Card, ErrorText, Field, Input, PageHeader, SectionTitle, Switch, Tabs } from "@/components/ui";

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
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setNombre(user.nombreCompleto);
    setTelefono(user.telefono ?? "");
    setNacimiento(user.fechaNacimiento ? user.fechaNacimiento.slice(0, 10) : "");
  }, [user]);

  if (!ready || !user) return null;
  const usuario = user;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await updateUsuario(usuario.id, { nombreCompleto: nombre, telefono, fechaNacimiento: nacimiento || null });
      await refreshUser();
      toast.ok("Perfil actualizado.");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
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
        <Avatar nombre={usuario.nombreCompleto} size={64} />
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
          </div>
          <ErrorText>{error}</ErrorText>
          <Btn type="submit" size="lg" loading={guardando} className="self-start">
            <Save size={18} aria-hidden /> Guardar cambios
          </Btn>
        </form>
      </Card>

      <PushSettings />
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
