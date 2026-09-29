"use client";

import { CSSProperties, ReactNode } from "react";
import { HeartHandshake, HeartPulse, Pill, QrCode, Siren } from "lucide-react";
import { useServerStatus } from "@/lib/use-server-status";
import { Logo, cx } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const PUNTOS = [
  { icon: HeartPulse, titulo: "Alertas cuando algo cambia", detalle: "Pulso, oxígeno y sueño, con aviso inmediato a tu red de cuidado." },
  { icon: Pill, titulo: "Medicación siempre a mano", detalle: "Qué se toma, cuándo y qué cambió, en un solo lugar." },
  { icon: Siren, titulo: "Ayuda al instante", detalle: "Botón S.O.S en pantalla y en la pulsera." },
  { icon: QrCode, titulo: "Perfil de emergencia", detalle: "Un QR con código temporal para quien asista en una urgencia." },
];

export function Separador() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden>
      <div className="h-px flex-1 bg-line" />
      <span className="text-xs font-medium uppercase tracking-wider text-ink-3">o</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function EstadoServidor() {
  const estado = useServerStatus();
  const texto = { verificando: "Conectando con NONOS…", ok: "Servidor en línea", caido: "El servidor no responde" }[estado];
  return (
    <p role="status" className="flex items-center justify-center gap-2 text-xs font-medium text-ink-3">
      <span className="relative flex h-2.5 w-2.5">
        {estado === "ok" && <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand" aria-hidden />}
        <span className={cx("relative inline-flex h-2.5 w-2.5 rounded-full", estado === "ok" ? "bg-brand" : estado === "caido" ? "bg-danger-fill" : "bg-line-strong")} />
      </span>
      {texto}
    </p>
  );
}

export default function AuthLayout({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <main id="contenido" className="grid min-h-screen flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca (escritorio) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#2f7d74] via-[#25665f] to-[#163f3a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 animate-float rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#f28c6f]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute right-16 top-1/2 h-40 w-40 animate-float rounded-full border border-white/20 [animation-delay:1.6s]" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <HeartHandshake size={26} aria-hidden />
          </span>
          <span className="text-2xl font-extrabold tracking-[0.14em]">NONOS</span>
        </div>

        <div className="relative max-w-lg">
          <p className="animate-rise text-5xl font-extrabold leading-[1.08] tracking-tight">
            Cuidar a quienes más queremos, <span className="text-[#ffc9b8]">sin estar encima.</span>
          </p>
          <ul className="mt-10 flex flex-col gap-5">
            {PUNTOS.map((p, i) => {
              const Icon = p.icon;
              return (
                <li key={p.titulo} className="rise flex items-start gap-4" style={{ "--i": i + 2 } as CSSProperties}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <Icon size={22} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-lg font-bold">{p.titulo}</span>
                    <span className="block text-[0.95rem] leading-snug text-white/80">{p.detalle}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-sm text-white/70">Tecnología que acompaña.</p>
      </aside>

      {/* Formulario */}
      <section className="relative flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
          <Logo size="lg" />
          <p className="mt-1 text-sm text-ink-2">Tecnología que acompaña. Cuidando a quienes más queremos.</p>
        </div>

        <div className="w-full max-w-md animate-rise">
          <div className="rounded-3xl border border-line bg-surface p-7 shadow-lift sm:p-9">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{titulo}</h1>
            {subtitulo && <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-2">{subtitulo}</p>}
            <div className="mt-6">{children}</div>
          </div>
          <div className="mt-5">
            <EstadoServidor />
          </div>
        </div>
      </section>
    </main>
  );
}
