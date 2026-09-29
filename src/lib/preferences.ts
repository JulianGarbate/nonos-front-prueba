"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferencias de accesibilidad y apariencia (NONOS DEFINIDO: "accesibilidad
 * transversal"). Se guardan en el navegador y se aplican como atributos de
 * <html>; los estilos viven en globals.css.
 */
export interface Preferencias {
  theme: "auto" | "light" | "dark";
  text: "normal" | "lg" | "xl";
  motion: "auto" | "reduce";
  contrast: "normal" | "high";
}

const POR_DEFECTO: Preferencias = { theme: "auto", text: "normal", motion: "auto", contrast: "normal" };
const KEY = "nonos_prefs";

/** Se ejecuta antes de pintar (ver layout.tsx) para evitar el parpadeo de tema. */
export const PREFS_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}');var r=document.documentElement;if(p.theme==='light'||p.theme==='dark')r.dataset.theme=p.theme;if(p.text==='lg'||p.text==='xl')r.dataset.text=p.text;if(p.motion==='reduce')r.dataset.motion='reduce';if(p.contrast==='high')r.dataset.contrast='high'}catch(e){}})()`;

let cache: Preferencias | null = null;
const listeners = new Set<() => void>();

function leer(): Preferencias {
  try {
    const raw = window.localStorage.getItem(KEY);
    return { ...POR_DEFECTO, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return POR_DEFECTO;
  }
}

function aplicar(p: Preferencias) {
  const r = document.documentElement;
  const set = (name: string, value: string | null) => (value ? (r.dataset[name] = value) : delete r.dataset[name]);
  set("theme", p.theme === "auto" ? null : p.theme);
  set("text", p.text === "normal" ? null : p.text);
  set("motion", p.motion === "reduce" ? "reduce" : null);
  set("contrast", p.contrast === "high" ? "high" : null);
}

const snapshot = () => (cache ??= leer());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function usePreferencias() {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => POR_DEFECTO);
  const cambiar = useCallback((cambio: Partial<Preferencias>) => {
    cache = { ...snapshot(), ...cambio };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* sin almacenamiento: la preferencia dura hasta recargar */
    }
    aplicar(cache);
    listeners.forEach((l) => l());
  }, []);
  return [prefs, cambiar] as const;
}
