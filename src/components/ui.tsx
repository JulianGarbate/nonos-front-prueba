"use client";

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "lg";

export function Btn({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25665F] disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = { md: "min-h-12 px-5 text-base", lg: "min-h-14 px-6 text-lg" };
  const variants = {
    primary: "bg-[#25665F] text-white hover:bg-[#1D544E]",
    secondary: "border-2 border-[#BFC9C6] bg-white text-[#181C1B] hover:border-[#25665F]",
    danger: "border-2 border-[#BA1A1A]/40 bg-white text-[#BA1A1A] hover:bg-[#FFDAD6]",
    ghost: "text-[#25665F] hover:bg-[#E8F0EE]",
  };
  return (
    <button {...props} disabled={disabled || loading} className={cx(base, sizes[size], variants[variant], className)}>
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const inputCls =
  "min-h-12 w-full rounded-lg border border-[#BFC9C6] bg-white px-4 text-base text-[#181C1B] outline-none focus:border-[#25665F] focus:ring-2 focus:ring-[#25665F]/25";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-[#3F4947]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[#6F7977]">{hint}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx(inputCls, p.className)} />
);
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputCls, "bg-white", p.className)} />
);
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(inputCls, "min-h-24 py-3", p.className)} />
);

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-[#E0E4E3] bg-white p-5 shadow-[0_2px_12px_rgba(0,40,35,0.05)]", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-bold text-[#181C1B]">{children}</h2>
      {action}
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm font-medium text-[#BA1A1A]">
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-[#F1F4F2] px-4 py-3 text-sm text-[#3F4947]">{children}</p>;
}

export function Loading({ label = "Cargando..." }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-[#3F4947]" role="status">
      <Loader2 size={16} className="animate-spin" aria-hidden /> {label}
    </p>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "crit"; children: ReactNode }) {
  const tones = {
    neutral: "bg-[#ECEEED] text-[#3F4947]",
    ok: "bg-[#DCF4EF] text-[#1D544E]",
    warn: "bg-[#FFDBD1] text-[#98462E]",
    crit: "bg-[#FFDAD6] text-[#93000A]",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function PageLoading() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#F7FAF8] p-8">
      <Loading />
    </main>
  );
}

export function formatFecha(iso?: string | null, conHora = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", conHora ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

/** Para fechas de calendario (sin hora) guardadas como medianoche UTC: evita que se corran un día por la zona horaria. */
export function formatDia(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "medium", timeZone: "UTC" });
}
