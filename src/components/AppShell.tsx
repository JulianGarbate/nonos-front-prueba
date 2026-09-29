"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bell,
  FileHeart,
  Home,
  LayoutDashboard,
  LogOut,
  MailPlus,
  Menu,
  Pill,
  ScrollText,
  Siren,
  UserRound,
  Users,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { getInvitacionesRecibidas, type Usuario } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { NotificacionesProvider, useNotificaciones } from "@/lib/use-notificaciones";
import { sincronizarPush } from "@/lib/push";
import { Avatar, Logo, PageLoading, cx } from "@/components/ui";
import PushPrompt from "@/components/PushPrompt";
import ThemeToggle from "@/components/ThemeToggle";

/* ───────────────────────── Definición de la navegación ───────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  danger?: boolean;
  badge?: "notif" | "inv";
}
type NavEntry = NavItem | { section: string };

const ADULTO_SIDEBAR: NavEntry[] = [
  { href: "/adulto-mayor", label: "Inicio", icon: Home, exact: true },
  { href: "/adulto-mayor/medicacion", label: "Mi medicación", icon: Pill },
  { href: "/adulto-mayor/emergencia", label: "Emergencia (S.O.S)", icon: Siren, danger: true },
  { section: "Mi cuidado" },
  { href: "/adulto-mayor/red", label: "Mi red de cuidado", icon: Users },
  { href: "/adulto-mayor/ficha", label: "Ficha de salud", icon: FileHeart },
  { href: "/adulto-mayor/historial", label: "Historial", icon: ScrollText },
  { href: "/adulto-mayor/dispositivos", label: "Pulsera y botón", icon: Watch },
  { section: "Cuenta" },
  { href: "/adulto-mayor/avisos", label: "Avisos", icon: Bell, badge: "notif" },
  { href: "/invitaciones", label: "Invitaciones", icon: MailPlus, badge: "inv" },
  { href: "/perfil", label: "Mi perfil", icon: UserRound },
];

const ADULTO_TABS: NavItem[] = [
  { href: "/adulto-mayor", label: "Inicio", icon: Home, exact: true },
  { href: "/adulto-mayor/medicacion", label: "Medicación", icon: Pill },
  { href: "/adulto-mayor/emergencia", label: "S.O.S", icon: Siren, danger: true },
  { href: "/adulto-mayor/mas", label: "Más", icon: Menu, badge: "inv" },
];

const CUIDADOR_LINKS: NavItem[] = [
  { href: "/familiar", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/familiar/notificaciones", label: "Avisos", icon: Bell, badge: "notif" },
  { href: "/invitaciones", label: "Invitaciones", icon: MailPlus, badge: "inv" },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

const esActivo = (pathname: string, i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`));

/* ───────────────────────── Piezas compartidas ───────────────────────── */

function Contador({ n, tone = "danger" }: { n: number; tone?: "danger" | "dot" }) {
  if (n <= 0) return null;
  if (tone === "dot") {
    return <span key={n} aria-label={`${n} pendientes`} className="absolute right-1/4 top-2 h-3 w-3 animate-pop rounded-full bg-danger-fill ring-2 ring-surface" />;
  }
  return (
    <span
      key={n}
      aria-label={`${n} sin leer`}
      className="flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-danger-fill px-1.5 text-[0.7rem] font-bold leading-none text-white"
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

function useInvitacionesPendientes(pathname: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    getInvitacionesRecibidas()
      .then((i) => setN(i.length))
      .catch(() => {});
  }, [pathname]);
  return n;
}

/** Enlaces con un indicador que se desliza hacia el activo. */
function SlidingLinks({ items, pathname, variant, extra }: { items: NavItem[]; pathname: string; variant: "top" | "bottom"; extra?: Record<string, number> }) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const idx = items.findIndex((i) => esActivo(pathname, i));
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const medir = () => {
      const el = refs.current[idx];
      setBox(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    medir();
    window.addEventListener("resize", medir);
    document.fonts?.ready.then(medir);
    return () => window.removeEventListener("resize", medir);
  }, [idx, items.length]);

  const top = variant === "top";
  return (
    <>
      {box && (
        <span
          aria-hidden
          style={{ transform: `translateX(${box.left}px)`, width: box.width }}
          className={cx(
            "absolute transition-[transform,width] duration-500 ease-[cubic-bezier(0.34,1.25,0.64,1)]",
            top ? "inset-y-0 rounded-xl bg-brand-soft" : "inset-y-1.5 rounded-2xl",
            !top && (items[idx].danger ? "bg-danger-fill" : "bg-brand-soft"),
          )}
        />
      )}
      {items.map((i, n) => {
        const Icon = i.icon;
        const on = n === idx;
        const count = i.badge ? extra?.[i.badge] ?? 0 : 0;
        return (
          <Link
            key={i.href}
            href={i.href}
            ref={(el) => {
              refs.current[n] = el;
            }}
            aria-current={on ? "page" : undefined}
            className={cx(
              "relative z-10 flex items-center justify-center font-semibold transition-colors duration-300",
              top ? "min-h-11 gap-2 rounded-xl px-3.5 text-sm" : "min-h-16 flex-1 flex-col gap-0.5 rounded-2xl text-[0.8rem]",
              on ? (i.danger && !top ? "text-white" : "text-brand-ink") : i.danger ? "text-danger" : "text-ink-2 hover:text-ink",
            )}
          >
            <span className="relative">
              <Icon size={top ? 20 : 26} strokeWidth={2} aria-hidden className={cx(on && !top && "animate-pop")} />
              {!top && <Contador n={count} tone="dot" />}
            </span>
            <span className={cx(top && "hidden sm:inline")}>{i.label}</span>
            {top && <Contador n={count} />}
          </Link>
        );
      })}
    </>
  );
}

function BarraAvisos({ href }: { href: string }) {
  const { noLeidas } = useNotificaciones();
  return (
    <Link
      href={href}
      aria-label={noLeidas ? `Avisos, ${noLeidas} sin leer` : "Avisos"}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-3 hover:text-ink active:scale-90"
    >
      <Bell size={21} aria-hidden className={cx(noLeidas > 0 && "origin-top animate-[wiggle_1.2s_ease-in-out_2]")} />
      {noLeidas > 0 && (
        <span key={noLeidas} className="absolute right-0.5 top-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-danger-fill px-1 text-[0.7rem] font-bold text-white">
          {noLeidas > 9 ? "9+" : noLeidas}
        </span>
      )}
    </Link>
  );
}

/* ───────────────────────── Adulto mayor ───────────────────────── */

function ShellAdulto({ user, children }: { user: Usuario; children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { noLeidas } = useNotificaciones();
  const invitaciones = useInvitacionesPendientes(pathname);
  const conteos = { notif: noLeidas, inv: invitaciones };

  return (
    <div className="flex min-h-screen flex-1">
      {/* Barra lateral (escritorio): todo a un toque */}
      <aside className="glass sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-line p-5 lg:flex">
        <Link href="/adulto-mayor" className="mb-6 rounded-xl px-2 py-1">
          <Logo tagline />
        </Link>
        <nav aria-label="Principal" className="no-scrollbar -mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1">
          {ADULTO_SIDEBAR.map((e, n) => {
            if ("section" in e) {
              return (
                <p key={e.section} className="mb-1 mt-4 px-3 text-xs font-bold uppercase tracking-wider text-ink-3">
                  {e.section}
                </p>
              );
            }
            const on = esActivo(pathname, e);
            const Icon = e.icon;
            const count = e.badge ? conteos[e.badge] : 0;
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={on ? "page" : undefined}
                style={{ animationDelay: `${n * 25}ms` }}
                className={cx(
                  "group relative flex min-h-12 animate-slide-left items-center gap-3 rounded-xl px-3.5 text-[0.95rem] font-semibold transition-all duration-200",
                  on
                    ? e.danger
                      ? "bg-danger-fill text-white shadow-md"
                      : "bg-brand-soft text-brand-ink"
                    : e.danger
                      ? "text-danger hover:bg-danger-soft"
                      : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                )}
              >
                {on && !e.danger && <span aria-hidden className="absolute -left-1 h-6 w-1 animate-pop rounded-full bg-brand" />}
                <Icon size={22} strokeWidth={2} aria-hidden className="transition-transform duration-200 group-hover:scale-110" />
                <span className="flex-1">{e.label}</span>
                <Contador n={count} />
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
          <Avatar nombre={user.nombreCompleto} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{user.nombreCompleto}</p>
            <p className="truncate text-xs text-ink-3">Adulto mayor</p>
          </div>
          <ThemeToggle />
          <button onClick={logout} aria-label="Salir" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-90">
            <LogOut size={20} aria-hidden />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Encabezado (móvil) */}
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-2.5 lg:hidden">
          <Link href="/adulto-mayor" aria-label="Ir al inicio">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <BarraAvisos href="/adulto-mayor/avisos" />
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 pb-32 pt-6 outline-none lg:px-10 lg:pb-14 lg:pt-10">
          <PushPrompt />
          {children}
        </main>
      </div>

      {/* Navegación inferior (móvil) */}
      <nav
        aria-label="Principal"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      >
        <div className="relative mx-auto flex max-w-md">
          <SlidingLinks
            items={ADULTO_TABS}
            pathname={ADULTO_TABS.some((t) => t.href !== "/adulto-mayor/mas" && esActivo(pathname, t)) ? pathname : "/adulto-mayor/mas"}
            variant="bottom"
            extra={conteos}
          />
        </div>
      </nav>
    </div>
  );
}

/* ───────────────────────── Familiar / cuidador ───────────────────────── */

function ShellCuidador({ user, children }: { user: Usuario; children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { noLeidas } = useNotificaciones();
  const invitaciones = useInvitacionesPendientes(pathname);
  const conteos = { notif: noLeidas, inv: invitaciones };

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="glass sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
          <Link href="/familiar" aria-label="Ir al panel">
            <Logo size="sm" />
          </Link>

          <nav aria-label="Principal" className="relative hidden items-center gap-1 lg:flex">
            <SlidingLinks items={CUIDADOR_LINKS} pathname={pathname} variant="top" extra={conteos} />
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="lg:hidden">
              <BarraAvisos href="/familiar/notificaciones" />
            </div>
            <Link href="/perfil" className="ml-1 hidden items-center gap-2.5 rounded-xl py-1 pl-1 pr-3 transition hover:bg-surface-3 lg:flex">
              <Avatar nombre={user.nombreCompleto} size={34} />
              <span className="max-w-40 truncate text-sm font-semibold text-ink">{user.nombreCompleto.split(" ")[0]}</span>
            </Link>
            <button onClick={logout} aria-label="Salir" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-2 transition hover:bg-danger-soft hover:text-danger active:scale-90">
              <LogOut size={20} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-32 pt-6 outline-none lg:px-8 lg:pb-14 lg:pt-8">
        <PushPrompt />
        {children}
      </main>

      <nav aria-label="Principal" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        <div className="relative mx-auto flex max-w-md">
          <SlidingLinks items={CUIDADOR_LINKS} pathname={pathname} variant="bottom" extra={conteos} />
        </div>
      </nav>
    </div>
  );
}

/* ───────────────────────── Punto de entrada ───────────────────────── */

/**
 * Marco de todas las pantallas con sesión. Vive en el layout del grupo (app),
 * así que la navegación no se vuelve a montar al cambiar de pantalla.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useRequireAuth();

  useEffect(() => {
    if (user) sincronizarPush(user.id);
  }, [user]);

  if (!ready || !user) return <PageLoading />;

  return (
    <NotificacionesProvider>
      {user.rol === "ADULTO_MAYOR" ? <ShellAdulto user={user}>{children}</ShellAdulto> : <ShellCuidador user={user}>{children}</ShellCuidador>}
    </NotificacionesProvider>
  );
}
