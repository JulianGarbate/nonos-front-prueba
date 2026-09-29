"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getNotificaciones, marcarNotificacionLeida, Notificacion } from "./api";
import { useToast } from "@/components/feedback";

interface Valor {
  items: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  recargar: () => Promise<void>;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
}

const Ctx = createContext<Valor | null>(null);

/**
 * Las notificaciones se guardan en la base (GET /notificaciones) y, además, el
 * backend envía un push real. Acá se consulta cada pocos segundos, al volver a
 * la pestaña y cuando el service worker avisa que llegó un push; si aparece una
 * nueva sin leer se muestra como aviso emergente.
 */
export function NotificacionesProvider({ children, intervaloMs = 20_000 }: { children: ReactNode; intervaloMs?: number }) {
  const toast = useToast();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const vistas = useRef<Set<string> | null>(null);

  const recargar = useCallback(async () => {
    try {
      const nuevas = await getNotificaciones();
      setItems(nuevas);
      if (vistas.current) {
        for (const n of nuevas) {
          if (!vistas.current.has(n.id) && !n.leida) {
            toast.info(
              <>
                <strong className="block">{n.titulo}</strong>
                {n.mensaje}
              </>,
            );
          }
        }
      }
      vistas.current = new Set(nuevas.map((n) => n.id));
    } catch {
      /* se reintenta en el próximo ciclo */
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    recargar();
    const visible = () => document.visibilityState === "visible" && recargar();
    const id = setInterval(visible, intervaloMs);
    document.addEventListener("visibilitychange", visible);
    const onSw = (e: MessageEvent) => e.data?.type === "nonos:push" && recargar();
    navigator.serviceWorker?.addEventListener("message", onSw);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visible);
      navigator.serviceWorker?.removeEventListener("message", onSw);
    };
  }, [intervaloMs, recargar]);

  const marcarLeida = useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      try {
        await marcarNotificacionLeida(id);
      } catch {
        recargar();
      }
    },
    [recargar],
  );

  const marcarTodasLeidas = useCallback(async () => {
    const pendientes = items.filter((n) => !n.leida);
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
    await Promise.all(pendientes.map((n) => marcarNotificacionLeida(n.id).catch(() => {})));
  }, [items]);

  const noLeidas = items.filter((n) => !n.leida).length;
  const valor = useMemo(
    () => ({ items, noLeidas, cargando, recargar, marcarLeida, marcarTodasLeidas }),
    [items, noLeidas, cargando, recargar, marcarLeida, marcarTodasLeidas],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useNotificaciones() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de <NotificacionesProvider>");
  return ctx;
}
