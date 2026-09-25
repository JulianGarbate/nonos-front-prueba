"use client";

import { useState } from "react";
import { Siren, CircleCheck, HardDrive } from "lucide-react";
import { dispararSOS, mensajeDeError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import EmergenciaCodigo from "@/components/EmergenciaCodigo";
import { AlertaPendienteAdulto } from "@/components/care/AlertasPanel";
import { Btn, Card, ErrorText, PageLoading } from "@/components/ui";

export default function EmergenciaPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [enviado, setEnviado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || !user) return <PageLoading />;
  const usuarioId = user.id;

  async function pedirAyuda() {
    setEnviando(true);
    setError(null);
    try {
      await dispararSOS(usuarioId);
      setEnviado(true);
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos avisar. Llamá al 107 o a tu contacto de confianza."));
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  return (
    <AdultoMayorShell>
      <h1 className="text-3xl font-bold text-[#181C1B]">Emergencia</h1>
      <AlertaPendienteAdulto adultoMayorId={usuarioId} />

      {!enviado ? (
        <Card className="flex flex-col items-center gap-5 text-center">
          <p className="text-lg text-[#3F4947]">Al presionar este botón, avisamos de inmediato a tus contactos de emergencia.</p>
          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              className="flex h-52 w-52 flex-col items-center justify-center gap-2 rounded-full bg-[#BA1A1A] text-2xl font-extrabold text-white shadow-[0_0_0_10px_rgba(186,26,26,0.15)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#181C1B] active:scale-95"
            >
              <Siren size={48} aria-hidden />
              PEDIR AYUDA
            </button>
          ) : (
            <div className="flex w-full flex-col gap-3" role="alertdialog" aria-label="Confirmar pedido de ayuda">
              <p className="text-xl font-bold text-[#181C1B]">¿Confirmás que necesitás ayuda?</p>
              <Btn size="lg" className="!bg-[#BA1A1A] hover:!bg-[#93000A]" loading={enviando} onClick={pedirAyuda}>Sí, avisar ahora</Btn>
              <Btn size="lg" variant="secondary" onClick={() => setConfirmando(false)}>No, fue sin querer</Btn>
            </div>
          )}
          <ErrorText>{error}</ErrorText>
          <p className="flex items-center gap-2 text-sm text-[#6F7977]"><HardDrive size={16} aria-hidden /> También podés usar el botón físico de tu pulsera.</p>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 text-center">
          <CircleCheck size={56} className="text-[#25665F]" aria-hidden />
          <h2 className="text-2xl font-bold text-[#181C1B]">¡Avisamos a tu red!</h2>
          <p className="text-[#3F4947]">Ya notificamos a tus contactos de emergencia. Quedate tranquilo/a, van a comunicarse con vos.</p>
          <Btn variant="secondary" onClick={() => setEnviado(false)}>Volver</Btn>
        </Card>
      )}

      <EmergenciaCodigo usuarioId={usuarioId} destacado={enviado} />
    </AdultoMayorShell>
  );
}
