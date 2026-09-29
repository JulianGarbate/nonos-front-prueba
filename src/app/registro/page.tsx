"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserPlus, UserRound, Users, type LucideIcon } from "lucide-react";
import { register, RolUsuario, mensajeDeError } from "@/lib/api";
import { homeForRol, useAuth } from "@/lib/auth-context";
import AuthLayout, { Separador } from "@/components/AuthLayout";
import GoogleButton from "@/components/GoogleButton";
import { Btn, ErrorText, Field, Input, PasswordInput, cx } from "@/components/ui";

const ROLES: { value: RolUsuario; label: string; detalle: string; icon: LucideIcon }[] = [
  { value: "ADULTO_MAYOR", label: "Soy adulto mayor", detalle: "Quiero que mi familia y mis cuidadores estén cerca.", icon: UserRound },
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
      await register({ email: email.trim(), password, nombreCompleto: nombre.trim(), rol });
      const u = await login(email.trim(), password);
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
    <AuthLayout titulo="Crear cuenta" subtitulo="Es gratis y lleva menos de un minuto.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1.5 text-sm font-semibold text-ink-2">¿Quién sos?</legend>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const on = rol === r.value;
            return (
              <button
                type="button"
                key={r.value}
                aria-pressed={on}
                onClick={() => setRol(r.value)}
                className={cx(
                  "group relative flex min-h-[4.5rem] items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 active:scale-[0.98]",
                  on ? "border-brand bg-brand-soft shadow-md" : "border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
                )}
              >
                <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300", on ? "bg-brand text-on-brand" : "bg-surface-3 text-ink-2")}>
                  <Icon size={24} aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-ink">{r.label}</span>
                  <span className="block text-sm leading-snug text-ink-2">{r.detalle}</span>
                </span>
                <span
                  aria-hidden
                  className={cx("flex h-6 w-6 items-center justify-center rounded-full bg-brand text-on-brand transition-all duration-300", on ? "scale-100 opacity-100" : "scale-50 opacity-0")}
                >
                  <Check size={15} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </fieldset>
        <Field label="Nombre completo">
          <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Correo electrónico">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </Field>
        <Field label="Contraseña" hint="Mínimo 6 caracteres.">
          <PasswordInput required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" size="lg" loading={enviando}>
          <UserPlus size={20} aria-hidden /> Crear cuenta
        </Btn>
      </form>

      <Separador />
      <GoogleButton onIdToken={google} text="signup_with" />

      <p className="mt-7 text-center text-sm text-ink-2">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-bold text-brand underline-offset-4 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
