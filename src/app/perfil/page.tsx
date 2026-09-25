"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { deleteUsuario, logoutAll, mensajeDeError, updateUsuario } from "@/lib/api";
import { homeForRol, useAuth, useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import CuidadorShell from "@/components/CuidadorShell";
import { Btn, Card, ErrorText, Field, Input, PageLoading } from "@/components/ui";

export default function PerfilPage() {
  const { user, ready } = useRequireAuth();
  const { logout, refreshUser } = useAuth();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNombre(user.nombreCompleto);
    setTelefono(user.telefono ?? "");
    setNacimiento(user.fechaNacimiento ? user.fechaNacimiento.slice(0, 10) : "");
  }, [user]);

  if (!ready || !user) return <PageLoading />;
  const usuario = user;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setGuardando(true);
    try {
      await updateUsuario(usuario.id, { nombreCompleto: nombre, telefono, fechaNacimiento: nacimiento || null });
      await refreshUser();
      setOk(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarTodas() {
    if (!confirm("Se cerrará tu sesión en todos tus dispositivos. ¿Continuar?")) return;
    await logoutAll().catch(() => {});
    logout();
  }

  async function baja() {
    if (!confirm("¿Dar de baja tu cuenta? Vas a dejar de poder ingresar a NONOS.")) return;
    try {
      await deleteUsuario(usuario.id);
      logout();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  const contenido = (
    <>
      <Link href={homeForRol(usuario.rol)} className="flex min-h-11 items-center gap-1 font-semibold text-[#25665F]"><ArrowLeft size={18} aria-hidden /> Volver</Link>
      <h1 className="text-3xl font-bold text-[#181C1B]">Mi perfil</h1>
      <Card className="flex flex-col gap-1 !bg-[#E8F0EE]">
        <p className="text-sm text-[#3F4947]">{usuario.email}</p>
        <p className="text-xs text-[#6F7977]">{usuario.rol === "ADULTO_MAYOR" ? "Adulto mayor" : "Familiar / cuidador"}</p>
      </Card>
      <Card>
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Field label="Nombre completo"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
          <Field label="Teléfono"><Input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
          <Field label="Fecha de nacimiento"><Input type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} /></Field>
          <ErrorText>{error}</ErrorText>
          {ok && <p role="status" className="text-sm font-medium text-[#25665F]">Perfil actualizado.</p>}
          <Btn type="submit" size="lg" loading={guardando}>Guardar cambios</Btn>
        </form>
      </Card>
      <div className="flex flex-col gap-2">
        <Btn variant="secondary" onClick={cerrarTodas}>Cerrar sesión en todos mis dispositivos</Btn>
        <Btn variant="danger" onClick={baja}>Dar de baja mi cuenta</Btn>
      </div>
    </>
  );

  return usuario.rol === "ADULTO_MAYOR" ? <AdultoMayorShell>{contenido}</AdultoMayorShell> : <CuidadorShell>{contenido}</CuidadorShell>;
}
