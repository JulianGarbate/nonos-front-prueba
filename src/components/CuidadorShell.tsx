"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Bell, LayoutDashboard, MailPlus, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNotificaciones } from "@/lib/use-notificaciones";

const LINKS = [
  { href: "/familiar", label: "Panel", icon: LayoutDashboard },
  { href: "/familiar/notificaciones", label: "Avisos", icon: Bell, badge: true },
  { href: "/invitaciones", label: "Invitaciones", icon: MailPlus },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export default function CuidadorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { noLeidas } = useNotificaciones(true);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#F7FAF8]">
      <header className="sticky top-0 z-20 border-b border-[#E0E4E3] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/familiar" className="text-lg font-extrabold tracking-wide text-[#25665F]">
            NONOS
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1">
            {LINKS.map((l) => {
              const active = l.href === "/familiar" ? pathname === "/familiar" : pathname.startsWith(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${
                    active ? "bg-[#E8F0EE] text-[#25665F]" : "text-[#3F4947] hover:bg-[#F1F4F2]"
                  }`}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden />
                  <span className="hidden sm:inline">{l.label}</span>
                  {l.badge && noLeidas > 0 && (
                    <span
                      aria-label={`${noLeidas} sin leer`}
                      className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#BA1A1A] px-1 text-xs font-bold text-white"
                    >
                      {noLeidas > 9 ? "9+" : noLeidas}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={logout}
              aria-label="Salir"
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#3F4947] hover:bg-[#F1F4F2]"
            >
              <LogOut size={20} strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </nav>
        </div>
        {user && (
          <p className="mx-auto max-w-5xl px-4 pb-2 text-xs text-[#6F7977]">
            Sesión de <span className="font-semibold text-[#3F4947]">{user.nombreCompleto}</span>
          </p>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
