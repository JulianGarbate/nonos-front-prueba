"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound, Users, type LucideIcon } from "lucide-react";
import { register, RolUsuario, mensajeDeError } from "@/lib/api";
import { homeForRol, useAuth } from "@/lib/auth-context";
import AuthLayout from "@/components/AuthLayout";
import GoogleButton from "@/components/GoogleButton";
import { Btn, ErrorText, Field, Input } from "@/components/ui";

const ROLES: { value: RolUsuario; label: string; detalle: string; icon: LucideIcon }[] = [
  { value: "ADULTO_MAYOR", label: "Soy adulto mayor", detalle: "Quiero que mi familia y cuidadores estén cerca.", icon: UserRound },
  { value: "FAMILIAR", label: "Soy familiar o cuidador", detalle: "Quiero acompañar a una persona mayor.", icon: Users },
];

export default function RegistroPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [rol, setRol] = useState<RolUsuario>("ADULTO_MAYOR");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await register({ email, password, nombreCompleto: nombre, rol });
      const u = await login(email, password);
      router.push(homeForRol(u.rol));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la cuenta. Puede que el email ya esté en uso."));
    } finally {
      setEnviando(false);
    }
  }

  async function google(idToken: string) {
    setError(null);
    try {
      const u = await loginWithGoogle(idToken, rol);
      router.push(homeForRol(u.rol));
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo crear la cuenta con Google."));
    }
  }

  return (
    <AuthLayout titulo="Crear cuenta">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-[#3F4947]">¿Quién sos?</legend>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const on = rol === r.value;
            return (
              <button
                type="button"
                key={r.value}
                aria-pressed={on}
                onClick={() => setRol(r.value)}
                className={`flex min-h-16 items-center gap-3 rounded-lg border-2 px-4 text-left transition-colors ${on ? "border-[#25665F] bg-[#E8F0EE]" : "border-[#E0E4E3] hover:border-[#BFC9C6]"}`}
              >
                <Icon size={24} className="shrink-0 text-[#25665F]" aria-hidden />
                <span>
                  <span className="block font-semibold text-[#181C1B]">{r.label}</span>
                  <span className="block text-xs text-[#3F4947]">{r.detalle}</span>
                </span>
              </button>
            );
          })}
        </fieldset>
        <Field label="Nombre completo"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></Field>
        <Field label="Correo electrónico"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="Contraseña"><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" size="lg" loading={enviando}>Crear cuenta</Btn>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-[#E0E4E3]" />
        <span className="text-xs text-[#6F7977]">o</span>
        <div className="h-px flex-1 bg-[#E0E4E3]" />
      </div>
      <GoogleButton onIdToken={google} text="signup_with" />

      <p className="mt-6 text-center text-sm text-[#3F4947]">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-[#25665F] underline">Iniciá sesión</Link>
      </p>
    </AuthLayout>
  );
}
