"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KeyRound, RefreshCw, PowerOff, Clock } from "lucide-react";
import axios from "axios";
import { QRPropio, crearQR, getQRPropio, mensajeDeError, regenerarQR, revocarQR } from "@/lib/api";
import { Btn, Card, ErrorText, Loading } from "@/components/ui";

function useCuentaRegresiva(expiraEn?: string) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!expiraEn) return;
    const tick = () => setMs(new Date(expiraEn).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiraEn]);
  return ms;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Código de acceso al perfil de emergencia. El QR de la pulsera apunta a
 * /emergencia/<id>; quien lo escanea necesita este código temporal (30 min,
 * se invalida al usarse). Solo el propio adulto mayor puede verlo.
 */
export default function EmergenciaCodigo({ usuarioId, destacado = false }: { usuarioId: string; destacado?: boolean }) {
  const [qr, setQr] = useState<QRPropio | null>(null);
  const [sinQr, setSinQr] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restante = useCuentaRegresiva(qr?.expiraEn);

  const cargar = useCallback(async () => {
    try {
      setQr(await getQRPropio(usuarioId));
      setSinQr(false);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setSinQr(true);
      else setError(mensajeDeError(e, "No se pudo cargar el código de emergencia."));
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  // El código rota solo tras cada uso: se relee cada 20 s.
  useEffect(() => {
    cargar();
    const id = setInterval(() => document.visibilityState === "visible" && cargar(), 20_000);
    return () => clearInterval(id);
  }, [cargar]);

  const vencido = !!qr && restante <= 0;

  // Si venció, el backend lo renueva con su job; mientras tanto se renueva acá.
  useEffect(() => {
    if (qr?.isActivo && vencido) regenerarQR(usuarioId).then(setQr).catch(() => {});
  }, [qr?.isActivo, vencido, usuarioId]);

  async function ejecutar(fn: () => Promise<unknown>) {
    setAccion(true);
    setError(null);
    try {
      await fn();
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setAccion(false);
    }
  }

  if (cargando) return <Loading />;

  const url = qr && typeof window !== "undefined" ? `${window.location.origin}/emergencia/${qr.id}` : "";

  return (
    <Card className={`flex flex-col gap-4 ${destacado ? "!border-2 !border-[#BA1A1A] !bg-[#FFF8F7]" : ""}`}>
      <div className="flex items-center gap-2">
        <KeyRound size={22} className="text-[#25665F]" aria-hidden />
        <h2 className={`font-bold text-[#181C1B] ${destacado ? "text-2xl" : "text-xl"}`}>Código de emergencia</h2>
      </div>

      <p className="text-[#3F4947]">
        <strong>Para acceder a tu información de emergencia:</strong> escaneá el QR ubicado en tu pulsera e ingresá el código que aparece acá.
      </p>

      {sinQr && (
        <>
          <p className="text-sm text-[#3F4947]">Todavía no activaste tu código de emergencia.</p>
          <Btn size="lg" loading={accion} onClick={() => ejecutar(() => crearQR(usuarioId))}>Activar código de emergencia</Btn>
        </>
      )}

      {qr && qr.isActivo && (
        <>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-[#F1F4F2] p-4">
            <p aria-label={`Código ${qr.codigo.split("").join(" ")}`} className={`font-mono font-extrabold tracking-[0.3em] text-[#181C1B] ${destacado ? "text-5xl" : "text-4xl"}`}>
              {qr.codigo}
            </p>
            <p className="flex items-center gap-1 text-sm text-[#3F4947]">
              <Clock size={16} aria-hidden /> Cambia en {mmss(restante)}
            </p>
          </div>
          <p className="text-sm text-[#3F4947]">
            El código cambia cada 30 minutos y, una vez utilizado correctamente, deja de ser válido.
          </p>
          {url && (
            <details className="rounded-xl border border-[#E0E4E3] p-3">
              <summary className="min-h-9 cursor-pointer text-sm font-semibold text-[#25665F]">Ver el QR de la pulsera</summary>
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="rounded-lg bg-white p-3"><QRCodeSVG value={url} size={176} /></div>
                <p className="break-all text-center text-xs text-[#6F7977]">{url}</p>
                <p className="text-center text-xs text-[#6F7977]">Este QR no muestra datos por sí solo: siempre pide el código.</p>
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" loading={accion} onClick={() => ejecutar(() => regenerarQR(usuarioId))}>
              <RefreshCw size={16} aria-hidden /> Generar código nuevo
            </Btn>
            <Btn variant="danger" loading={accion} onClick={() => confirm("¿Desactivar el acceso de emergencia?") && ejecutar(() => revocarQR(usuarioId))}>
              <PowerOff size={16} aria-hidden /> Desactivar
            </Btn>
          </div>
        </>
      )}

      {qr && !qr.isActivo && (
        <>
          <p className="text-sm font-semibold text-[#98462E]">El acceso de emergencia está desactivado: nadie puede ver tu perfil con el QR.</p>
          <Btn size="lg" loading={accion} onClick={() => ejecutar(() => regenerarQR(usuarioId))}>Volver a activar</Btn>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
