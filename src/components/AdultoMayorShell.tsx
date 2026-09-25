"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Home, Pill, Siren, Menu } from "lucide-react";
import { getInvitacionesRecibidas } from "@/lib/api";

const TABS = [
  { href: "/adulto-mayor", label: "Inicio", icon: Home },
  { href: "/adulto-mayor/medicacion", label: "Medicación", icon: Pill },
  { href: "/adulto-mayor/emergencia", label: "S.O.S", icon: Siren, danger: true },
  { href: "/adulto-mayor/mas", label: "Más", icon: Menu },
];

export default function AdultoMayorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    getInvitacionesRecibidas()
      .then((i) => setPendientes(i.length))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#F7FAF8]">
      <header className="border-b border-[#E0E4E3] bg-white px-5 py-4 text-center">
        <span className="text-xl font-extrabold tracking-wide text-[#25665F]">NONOS</span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6 pb-28">{children}</main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[#E0E4E3] bg-white px-2 py-2"
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/adulto-mayor" && pathname.startsWith(tab.href));
          const Icon = tab.icon;
          const color = tab.danger
            ? active
              ? "bg-[#BA1A1A] text-white"
              : "text-[#BA1A1A]"
            : active
              ? "bg-[#E8F0EE] text-[#25665F]"
              : "text-[#3F4947]";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative mx-1 flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-bold ${color}`}
            >
              <Icon size={26} strokeWidth={2} aria-hidden />
              {tab.label}
              {tab.href.endsWith("/mas") && pendientes > 0 && (
                <span
                  aria-label={`${pendientes} invitaciones pendientes`}
                  className="absolute right-3 top-1.5 h-3 w-3 rounded-full bg-[#BA1A1A]"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
