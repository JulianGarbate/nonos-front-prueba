"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth, homeForRol } from "@/lib/auth-context";

/** Enlace de retroceso de las subpantallas: vuelve al menú "Más" del adulto mayor o al inicio del rol. */
export function Volver({ href, label = "Volver" }: { href?: string; label?: string }) {
  const { user } = useAuth();
  const destino = href ?? (user?.rol === "ADULTO_MAYOR" ? "/adulto-mayor/mas" : user ? homeForRol(user.rol) : "/");
  return (
    <Link
      href={destino}
      className="group -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl px-2 font-semibold text-brand transition hover:bg-brand-soft lg:hidden"
    >
      <ArrowLeft size={18} aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1" /> {label}
    </Link>
  );
}
