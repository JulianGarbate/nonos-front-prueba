"use client";

import { useEffect, useState } from "react";
import { getHealth } from "./api";

/** Consulta GET /health del backend (que además prueba la base de datos). */
export function useServerStatus(intervaloMs = 60_000) {
  const [estado, setEstado] = useState<"verificando" | "ok" | "caido">("verificando");

  useEffect(() => {
    let vivo = true;
    const check = () =>
      getHealth()
        .then((ok) => vivo && setEstado(ok ? "ok" : "caido"))
        .catch(() => vivo && setEstado("caido"));
    check();
    const id = setInterval(check, intervaloMs);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [intervaloMs]);

  return estado;
}
