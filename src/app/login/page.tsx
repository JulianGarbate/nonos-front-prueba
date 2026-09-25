"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { homeForRol, useAuth } from "@/lib/auth-context";
import AuthLayout from "@/components/AuthLayout";
import GoogleButton from "@/components/GoogleButton";
import { Btn, ErrorText, Field, Input } from "@/components/ui";

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
      const u = await login(email, password);
      router.push(homeForRol(u.rol));
    } catch (err) {
      setError(isAxiosError(err) && err.response?.status === 401 ? "Email o contraseña incorrectos." : "No pudimos iniciar sesión. Probá de nuevo.");
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
          : "No se pudo iniciar sesión con Google.",
      );
    }
  }

  return (
    <AuthLayout titulo="Bienvenido de nuevo">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Correo electrónico">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña">
          <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" size="lg" loading={enviando}>Iniciar sesión</Btn>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-[#E0E4E3]" />
        <span className="text-xs text-[#6F7977]">o</span>
        <div className="h-px flex-1 bg-[#E0E4E3]" />
      </div>
      <GoogleButton onIdToken={google} text="signin_with" />

      <p className="mt-6 text-center text-sm text-[#3F4947]">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-semibold text-[#25665F] underline">Creá una</Link>
      </p>
    </AuthLayout>
  );
}
