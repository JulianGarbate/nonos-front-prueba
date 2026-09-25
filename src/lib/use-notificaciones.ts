"use client";

import { useCallback, useEffect, useState } from "react";
import { getNotificaciones, marcarNotificacionLeida, Notificacion } from "./api";

/**
 * El backend todavía no hace push real: las notificaciones quedan guardadas y
 * el frontend las consulta por polling (README, "Limitaciones conocidas").
 */
export function useNotificaciones(activo = true, intervaloMs = 30_000) {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      setItems(await getNotificaciones());
    } catch {
      /* se reintenta en el próximo ciclo */
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    recargar();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") recargar();
    }, intervaloMs);
    return () => clearInterval(id);
  }, [activo, intervaloMs, recargar]);

  const marcarLeida = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try {
      await marcarNotificacionLeida(id);
    } catch {
      recargar();
    }
  }, [recargar]);

  const noLeidas = items.filter((n) => !n.leida).length;
  return { items, noLeidas, cargando, recargar, marcarLeida };
}
