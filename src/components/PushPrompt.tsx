"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Send, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PushError, activarPush, desactivarPush, estadoPush, notificacionDePrueba, type EstadoPush } from "@/lib/push";
import { Btn, Card, Notice, Switch, cx } from "@/components/ui";
import { useToast } from "@/components/feedback";

const OFF_KEY = "nonos_push_prompt_off";

function usePush() {
  const { user } = useAuth();
  const toast = useToast();
  const [estado, setEstado] = useState<EstadoPush>("verificando");
  const [trabajando, setTrabajando] = useState(false);

  const refrescar = useCallback(() => estadoPush().then(setEstado).catch(() => setEstado("no-soportado")), []);
  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const activar = useCallback(async () => {
    if (!user) return;
    setTrabajando(true);
    try {
      await activarPush(user.id);
      toast.ok("Listo: vas a recibir avisos en este dispositivo.");
    } catch (e) {
      toast.error(e instanceof PushError ? e.message : "No se pudieron activar los avisos en este dispositivo.");
    } finally {
      setTrabajando(false);
      refrescar();
    }
  }, [user, toast, refrescar]);

  const desactivar = useCallback(async () => {
    setTrabajando(true);
    await desactivarPush();
    setTrabajando(false);
    toast.info("Los avisos quedaron desactivados en este dispositivo.");
    refrescar();
  }, [toast, refrescar]);

  return { estado, trabajando, activar, desactivar };
}

/** Invitación (descartable) a activar los avisos push, arriba de cada pantalla. */
export default function PushPrompt() {
  const { estado, trabajando, activar } = usePush();
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    try {
      setOculto(window.localStorage.getItem(OFF_KEY) === "1");
    } catch {
      setOculto(false);
    }
  }, []);

  if (estado !== "inactivo" || oculto) return null;

  return (
    <Notice
      icon={BellRing}
      title="Enterate al instante"
      onClose={() => {
        setOculto(true);
        try {
          window.localStorage.setItem(OFF_KEY, "1");
        } catch {}
      }}
      action={
        <Btn size="sm" onClick={activar} loading={trabajando}>
          Activar avisos
        </Btn>
      }
    >
      Recibí las alertas importantes en este dispositivo, aunque tengas la app cerrada.
    </Notice>
  );
}

/** Configuración completa de avisos push (pantalla de perfil). */
export function PushSettings() {
  const { estado, trabajando, activar, desactivar } = usePush();
  const toast = useToast();

  const activo = estado === "activo";
  const texto: Record<EstadoPush, string> = {
    verificando: "Verificando este dispositivo…",
    "no-soportado": "Este navegador no permite avisos push. Podés instalar NONOS en la pantalla de inicio o probar con otro navegador.",
    bloqueado: "El permiso está bloqueado. Habilitá las notificaciones para este sitio desde la configuración del navegador y volvé acá.",
    inactivo: "Activalos para recibir alertas y avisos importantes aunque no tengas NONOS abierto.",
    activo: "Este dispositivo recibe avisos de NONOS, incluso con la app cerrada.",
  };
  const Icon = estado === "bloqueado" ? ShieldAlert : activo ? BellRing : BellOff;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-500", activo ? "bg-brand-soft text-brand" : "bg-surface-3 text-ink-3")}>
          <Icon size={24} aria-hidden className={cx(activo && "animate-beat")} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-ink">Avisos en este dispositivo</h2>
          <p className="text-sm leading-relaxed text-ink-2">{texto[estado]}</p>
        </div>
        {(estado === "inactivo" || estado === "activo") && (
          <Switch checked={activo} disabled={trabajando} label="Avisos en este dispositivo" onChange={(v) => (v ? activar() : desactivar())} />
        )}
      </div>
      {activo && (
        <Btn
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => notificacionDePrueba().catch(() => toast.error("No se pudo mostrar la notificación de prueba."))}
        >
          <Send size={16} aria-hidden /> Enviarme una prueba
        </Btn>
      )}
    </Card>
  );
}
