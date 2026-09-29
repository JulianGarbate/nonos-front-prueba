"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/** Aviso global cuando el dispositivo pierde internet (y cuando vuelve). */
export default function ConexionBanner() {
  const [estado, setEstado] = useState<"ok" | "offline" | "vuelta">("ok");

  useEffect(() => {
    if (!navigator.onLine) setEstado("offline");
    let t: number | undefined;
    const off = () => setEstado("offline");
    const on = () => {
      setEstado("vuelta");
      t = window.setTimeout(() => setEstado("ok"), 3000);
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
      window.clearTimeout(t);
    };
  }, []);

  if (estado === "ok") return null;
  const offline = estado === "offline";
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[80] flex animate-rise items-center justify-center gap-2 px-4 py-2 text-sm font-semibold ${
        offline ? "bg-ink text-canvas" : "bg-brand text-on-brand"
      }`}
    >
      {offline ? <WifiOff size={16} aria-hidden /> : <Wifi size={16} aria-hidden />}
      {offline ? "Sin conexión a internet. Lo que ves puede estar desactualizado." : "Conexión recuperada."}
    </div>
  );
}
