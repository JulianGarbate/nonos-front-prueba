"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { usePreferencias } from "@/lib/preferences";
import { cx } from "@/components/ui";

/** Alterna entre tema automático, claro y oscuro. */
export default function ThemeToggle({ className }: { className?: string }) {
  const [prefs, cambiar] = usePreferencias();
  const orden = ["auto", "light", "dark"] as const;
  const siguiente = orden[(orden.indexOf(prefs.theme) + 1) % orden.length];
  const Icon = prefs.theme === "dark" ? Moon : prefs.theme === "light" ? Sun : Monitor;
  const nombre = { auto: "automático", light: "claro", dark: "oscuro" }[prefs.theme];
  return (
    <button
      onClick={() => cambiar({ theme: siguiente })}
      aria-label={`Tema ${nombre}. Tocá para cambiar`}
      title={`Tema: ${nombre}`}
      className={cx("flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-3 hover:text-ink active:scale-90", className)}
    >
      <Icon size={20} aria-hidden />
    </button>
  );
}

