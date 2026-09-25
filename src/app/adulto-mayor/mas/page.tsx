"use client";

import Link from "next/link";
import { Users, FileHeart, ScrollText, Watch, MailPlus, UserRound, LogOut, ChevronRight, type LucideIcon } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import { PageLoading } from "@/components/ui";

const ITEMS: { href: string; label: string; detalle: string; icon: LucideIcon }[] = [
  { href: "/adulto-mayor/red", label: "Mi red de cuidado", detalle: "Quién me acompaña y a quién avisar primero", icon: Users },
  { href: "/adulto-mayor/ficha", label: "Mi ficha de salud", detalle: "Condiciones, alergias, contactos y medidas anticipadas", icon: FileHeart },
  { href: "/adulto-mayor/historial", label: "Historial", detalle: "Acontecimientos importantes", icon: ScrollText },
  { href: "/adulto-mayor/dispositivos", label: "Pulsera y botón", detalle: "Mis dispositivos", icon: Watch },
  { href: "/invitaciones", label: "Invitaciones", detalle: "Sumar o aceptar personas de confianza", icon: MailPlus },
  { href: "/perfil", label: "Mi perfil", detalle: "Mis datos", icon: UserRound },
];

export default function MasPage() {
  const { ready } = useRequireAuth("ADULTO_MAYOR");
  const { logout } = useAuth();
  if (!ready) return <PageLoading />;

  return (
    <AdultoMayorShell>
      <h1 className="text-3xl font-bold text-[#181C1B]">Más opciones</h1>
      <ul className="flex flex-col gap-3">
        {ITEMS.map((i) => {
          const Icon = i.icon;
          return (
            <li key={i.href}>
              <Link href={i.href} className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#E0E4E3] bg-white p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F0EE] text-[#25665F]"><Icon size={24} aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-lg font-bold text-[#181C1B]">{i.label}</span>
                  <span className="block text-sm text-[#3F4947]">{i.detalle}</span>
                </span>
                <ChevronRight aria-hidden className="text-[#6F7977]" />
              </Link>
            </li>
          );
        })}
      </ul>
      <button onClick={logout} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#BFC9C6] text-lg font-semibold text-[#3F4947]">
        <LogOut size={22} aria-hidden /> Salir
      </button>
    </AdultoMayorShell>
  );
}
