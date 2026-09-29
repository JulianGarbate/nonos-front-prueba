"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Clock, KeyRound, PowerOff, QrCode, RefreshCw, ShieldOff } from "lucide-react";
import axios from "axios";
import { QRPropio, crearQR, getQRPropio, mensajeDeError, regenerarQR, revocarQR } from "@/lib/api";
import { useConfirm, useToast } from "@/components/feedback";
import { Btn, Card, Disclosure, ErrorText, IconBubble, Notice, ProgressBar, Skeleton, cx } from "@/components/ui";

const VIGENCIA_MS = 30 * 60 * 1000;

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
 * se invalida al usarse, y tras 5 intentos fallidos el acceso se bloquea).
 * Solo el propio adulto mayor puede verlo.
 */
export default function EmergenciaCodigo({ usuarioId, destacado = false }: { usuarioId: string; destacado?: boolean }) {
  const confirmar = useConfirm();
  const toast = useToast();
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

  async function ejecutar(fn: () => Promise<unknown>, ok?: string) {
    setAccion(true);
    setError(null);
    try {
      await fn();
      await cargar();
      if (ok) toast.ok(ok);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setAccion(false);
    }
  }

  async function desactivar() {
    const ok = await confirmar({
      title: "¿Desactivar el acceso de emergencia?",
      message: "Nadie va a poder ver tu perfil con el QR hasta que lo vuelvas a activar.",
      confirmLabel: "Desactivar",
      icon: ShieldOff,
    });
    if (ok) ejecutar(() => revocarQR(usuarioId), "Acceso de emergencia desactivado.");
  }

  if (cargando) return <Skeleton className="h-72" />;

  const url = qr && typeof window !== "undefined" ? `${window.location.origin}/emergencia/${qr.id}` : "";

  return (
    <Card className={cx("flex flex-col gap-4", destacado && "!border-2 !border-danger/50 !bg-danger-wash")}>
      <div className="flex items-center gap-3">
        <IconBubble icon={KeyRound} size={44} />
        <div>
          <h2 className={cx("font-bold tracking-tight text-ink", destacado ? "text-2xl" : "text-xl")}>Código de emergencia</h2>
          <p className="text-sm text-ink-2">Para el médico o personal que te asista.</p>
        </div>
      </div>

      <p className="leading-relaxed text-ink-2">
        <strong className="text-ink">Para acceder a tu información de emergencia:</strong> escaneá el QR ubicado en tu pulsera e ingresá el código que aparece acá.
      </p>

      {sinQr && (
        <>
          <p className="text-sm text-ink-2">Todavía no activaste tu código de emergencia.</p>
          <Btn size="lg" loading={accion} onClick={() => ejecutar(() => crearQR(usuarioId), "Código de emergencia activado.")}>
            <QrCode size={20} aria-hidden /> Activar código de emergencia
          </Btn>
        </>
      )}

      {qr && qr.isActivo && (
        <>
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-2 p-5">
            <p aria-label={`Código ${qr.codigo.split("").join(" ")}`} className="flex w-full justify-center gap-1 font-mono font-extrabold text-ink sm:gap-1.5">
              {qr.codigo.split("").map((d, i) => (
                <span
                  key={`${qr.codigo}-${i}`}
                  aria-hidden
                  style={{ animationDelay: `${i * 45}ms` }}
                  className={cx(
                    "flex min-w-0 flex-1 animate-pop items-center justify-center rounded-xl border border-line bg-surface shadow-card",
                    destacado ? "h-16 max-w-12 text-4xl sm:h-20 sm:max-w-14 sm:text-5xl" : "h-14 max-w-11 text-3xl sm:h-16 sm:max-w-12 sm:text-4xl",
                    i === 2 && "mr-2",
                  )}
                >
                  {d}
                </span>
              ))}
            </p>
            <div className="w-full max-w-xs">
              <ProgressBar value={restante / VIGENCIA_MS} label="Tiempo de vigencia del código" tone={restante < 5 * 60 * 1000 ? "accent" : "brand"} />
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium text-ink-2">
                <Clock size={16} aria-hidden /> Cambia en <span className="font-bold tabular-nums text-ink">{mmss(restante)}</span>
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink-2">
            El código cambia cada 30 minutos y, una vez utilizado correctamente, deja de ser válido. Si alguien lo ingresa mal 5 veces, el acceso se bloquea por seguridad.
          </p>
          {url && (
            <Disclosure label={["Ver el QR de la pulsera", "Ocultar el QR"]} icon={QrCode}>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-line p-4">
                <div className="rounded-2xl bg-white p-3 shadow-card">
                  <QRCodeSVG value={url} size={176} />
                </div>
                <p className="break-all text-center text-xs text-ink-3">{url}</p>
                <p className="text-center text-xs text-ink-3">Este QR no muestra datos por sí solo: siempre pide el código.</p>
              </div>
            </Disclosure>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" size="sm" loading={accion} onClick={() => ejecutar(() => regenerarQR(usuarioId), "Generamos un código nuevo.")}>
              <RefreshCw size={16} aria-hidden /> Generar código nuevo
            </Btn>
            <Btn variant="danger" size="sm" loading={accion} onClick={desactivar}>
              <PowerOff size={16} aria-hidden /> Desactivar
            </Btn>
          </div>
        </>
      )}

      {qr && !qr.isActivo && (
        <>
          <Notice tone="warn" icon={ShieldOff} title="El acceso de emergencia está desactivado">
            Nadie puede ver tu perfil con el QR. Se desactiva si lo apagás vos o si alguien ingresa un código incorrecto 5 veces.
          </Notice>
          <Btn size="lg" loading={accion} onClick={() => ejecutar(() => regenerarQR(usuarioId), "Acceso de emergencia activado con un código nuevo.")}>
            Volver a activar
          </Btn>
        </>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
