"use client";

import Link from "next/link";
import { Bell, FileHeart, LogOut, MailPlus, ScrollText, UserRound, Users, Watch, type LucideIcon } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { useNotificaciones } from "@/lib/use-notificaciones";
import { Btn, IconBubble, PageHeader, cx, stagger } from "@/components/ui";

const ITEMS: { href: string; label: string; detalle: string; icon: LucideIcon; badge?: "notif" }[] = [
  { href: "/adulto-mayor/red", label: "Mi red de cuidado", detalle: "Quién me acompaña y a quién avisar primero", icon: Users },
  { href: "/adulto-mayor/ficha", label: "Mi ficha de salud", detalle: "Condiciones, alergias, contactos y medidas anticipadas", icon: FileHeart },
  { href: "/adulto-mayor/historial", label: "Historial", detalle: "Acontecimientos importantes", icon: ScrollText },
  { href: "/adulto-mayor/dispositivos", label: "Pulsera y botón", detalle: "Mis dispositivos y sus datos", icon: Watch },
  { href: "/adulto-mayor/avisos", label: "Avisos", detalle: "Lo que NONOS me fue notificando", icon: Bell, badge: "notif" },
  { href: "/invitaciones", label: "Invitaciones", detalle: "Sumar o aceptar personas de confianza", icon: MailPlus },
  { href: "/perfil", label: "Mi perfil", detalle: "Mis datos, avisos y accesibilidad", icon: UserRound },
];

export default function MasPage() {
  const { ready } = useRequireAuth("ADULTO_MAYOR");
  const { logout } = useAuth();
  const { noLeidas } = useNotificaciones();
  if (!ready) return null;

  return (
    <>
      <PageHeader title="Más opciones" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((i, n) => (
          <li key={i.href} className="rise" style={stagger(n)}>
            <Link
              href={i.href}
              className="group flex min-h-24 items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift active:scale-[0.98]"
            >
              <span className="relative">
                <IconBubble icon={i.icon} size={52} className="transition-transform duration-300 group-hover:scale-110" />
                {i.badge === "notif" && noLeidas > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-danger-fill px-1 text-[0.7rem] font-bold text-white">{noLeidas}</span>
                )}
              </span>
              <span className="flex-1">
                <span className="block text-lg font-bold leading-tight text-ink">{i.label}</span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-2">{i.detalle}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Btn variant="secondary" size="lg" onClick={logout} className={cx("w-full")}>
        <LogOut size={22} aria-hidden /> Salir
      </Btn>
    </>
  );
}
