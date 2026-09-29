"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { CircleCheck, Phone, ShieldCheck, Siren, Watch } from "lucide-react";
import { dispararSOS, mensajeDeError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import EmergenciaCodigo from "@/components/EmergenciaCodigo";
import { AlertaPendienteAdulto } from "@/components/care/AlertasPanel";
import { Btn, Card, ErrorText, Notice, PageHeader } from "@/components/ui";

export default function EmergenciaPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [estado, setEstado] = useState<"reposo" | "confirmando" | "enviado" | "ya-enviado">("reposo");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || !user) return null;
  const usuarioId = user.id;

  async function pedirAyuda() {
    setEnviando(true);
    setError(null);
    try {
      await dispararSOS(usuarioId);
      setEstado("enviado");
    } catch (e) {
      // El backend rechaza un segundo SOS si ya hay uno pendiente de los últimos 10 minutos.
      if (isAxiosError(e) && e.response?.status === 400) setEstado("ya-enviado");
      else {
        setError(mensajeDeError(e, "No pudimos avisar. Llamá al 107 o a tu contacto de confianza."));
        setEstado("reposo");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader title="Emergencia" subtitle="Si necesitás ayuda, avisamos a tus contactos de emergencia al instante." />
      <AlertaPendienteAdulto adultoMayorId={usuarioId} />

      {(estado === "reposo" || estado === "confirmando") && (
        <Card className="flex flex-col items-center gap-6 py-8 text-center">
          {estado === "reposo" ? (
            <div className="flex animate-pop flex-col items-center gap-6">
              <div className="relative flex h-60 w-60 items-center justify-center">
                <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-danger-fill/35" />
                <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-danger-fill/25 [animation-delay:1.2s]" />
                <button
                  onClick={() => setEstado("confirmando")}
                  className="relative flex h-52 w-52 flex-col items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#e04545] to-[#a31414] text-2xl font-extrabold tracking-wide text-white shadow-pop ring-8 ring-danger-fill/15 transition-transform duration-200 hover:scale-105 focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-ink active:scale-95"
                >
                  <Siren size={54} aria-hidden />
                  PEDIR AYUDA
                </button>
              </div>
              <p className="max-w-sm text-lg leading-relaxed text-ink-2">Al presionar este botón, avisamos de inmediato a tus contactos de emergencia.</p>
            </div>
          ) : (
            <div role="alertdialog" aria-label="Confirmar pedido de ayuda" className="flex w-full max-w-md animate-pop flex-col gap-4">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft text-danger">
                <Siren size={40} aria-hidden />
              </span>
              <p className="text-2xl font-extrabold text-ink">¿Confirmás que necesitás ayuda?</p>
              <Btn size="lg" variant="sos" loading={enviando} onClick={pedirAyuda} className="min-h-16 text-xl">
                Sí, avisar ahora
              </Btn>
              <Btn size="lg" variant="secondary" onClick={() => setEstado("reposo")} disabled={enviando}>
                No, fue sin querer
              </Btn>
            </div>
          )}
          <ErrorText>{error}</ErrorText>
          <p className="flex items-center gap-2 text-sm text-ink-3">
            <Watch size={16} aria-hidden /> También podés usar el botón físico de tu pulsera.
          </p>
        </Card>
      )}

      {estado === "enviado" && (
        <Card className="flex animate-pop flex-col items-center gap-4 py-8 text-center">
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-ok-soft text-brand">
            <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/30" />
            <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="relative">
              <path d="M5 12.5l4.5 4.5L19 7.5" style={{ strokeDasharray: 60 }} className="animate-check" />
            </svg>
          </span>
          <h2 className="text-3xl font-extrabold text-ink">¡Avisamos a tu red!</h2>
          <p className="max-w-sm text-lg leading-relaxed text-ink-2">Ya notificamos a tus contactos de emergencia. Quedate tranquilo/a: van a comunicarse con vos.</p>
          <p className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 text-sm text-ink-2">
            <Phone size={16} className="shrink-0" aria-hidden />
            <span>
              Si es muy urgente, también podés llamar al <strong className="text-ink">107</strong>.
            </span>
          </p>
          <Btn variant="secondary" onClick={() => setEstado("reposo")}>
            Volver
          </Btn>
        </Card>
      )}

      {estado === "ya-enviado" && (
        <>
          <Notice tone="ok" icon={ShieldCheck} title="Ya avisamos hace un momento">
            Tus contactos ya recibieron tu pedido de ayuda. No hace falta que lo repitas: van a comunicarse con vos.
          </Notice>
          <Btn variant="secondary" onClick={() => setEstado("reposo")} className="self-start">
            <CircleCheck size={18} aria-hidden /> Entendido
          </Btn>
        </>
      )}

      <EmergenciaCodigo usuarioId={usuarioId} destacado={estado === "enviado"} />
    </>
  );
}
