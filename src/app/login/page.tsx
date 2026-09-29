"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { LogIn } from "lucide-react";
import { homeForRol, useAuth } from "@/lib/auth-context";
import { mensajeDeError } from "@/lib/api";
import AuthLayout, { Separador } from "@/components/AuthLayout";
import GoogleButton from "@/components/GoogleButton";
import { Btn, ErrorText, Field, Input, PageLoading, PasswordInput } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(homeForRol(user.rol));
  }, [loading, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const u = await login(email.trim(), password);
      router.push(homeForRol(u.rol));
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) setError("Email o contraseña incorrectos.");
      else if (isAxiosError(err) && err.response?.status === 429) setError("Demasiados intentos de ingreso. Por seguridad, esperá unos 15 minutos y probá de nuevo.");
      else setError(mensajeDeError(err, "No pudimos iniciar sesión. Probá de nuevo."));
    } finally {
      setEnviando(false);
    }
  }

  async function google(idToken: string) {
    setError(null);
    try {
      const u = await loginWithGoogle(idToken);
      router.push(homeForRol(u.rol));
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 400
          ? "Ese Google todavía no tiene cuenta. Creá una cuenta primero."
          : mensajeDeError(err, "No se pudo iniciar sesión con Google."),
      );
    }
  }

  if (loading || user) return <PageLoading />;

  return (
    <AuthLayout titulo="Bienvenido de nuevo" subtitulo="Ingresá para ver cómo está tu familia.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Correo electrónico">
          <Input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
        </Field>
        <Field label="Contraseña">
          <PasswordInput required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" size="lg" loading={enviando}>
          <LogIn size={20} aria-hidden /> Iniciar sesión
        </Btn>
      </form>

      <Separador />
      <GoogleButton onIdToken={google} text="signin_with" />

      <p className="mt-7 text-center text-sm text-ink-2">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-bold text-brand underline-offset-4 hover:underline">
          Creá una
        </Link>
      </p>
    </AuthLayout>
  );
}
