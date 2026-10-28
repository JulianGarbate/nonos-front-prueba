"use client";

import {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  HeartHandshake,
  Info,
  Loader2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Entrada escalonada: `<li className="rise" style={stagger(i)}>`. */
export const stagger = (i: number) => ({ "--i": Math.min(i, 12) }) as CSSProperties;

/* ───────────────────────── Botones ───────────────────────── */

type Variant = "primary" | "secondary" | "danger" | "ghost" | "sos";
type Size = "sm" | "md" | "lg";

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
    "relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";
  const sizes: Record<Size, string> = {
    sm: "min-h-10 px-3.5 text-sm",
    md: "min-h-12 px-5 text-base",
    lg: "min-h-14 px-6 text-lg",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-on-brand shadow-sm hover:-translate-y-px hover:bg-brand-hover hover:shadow-md",
    secondary: "border-2 border-line-strong bg-surface text-ink hover:border-brand hover:bg-brand-soft",
    danger: "border-2 border-danger/40 bg-surface text-danger hover:border-danger hover:bg-danger-soft",
    ghost: "text-brand hover:bg-brand-soft",
    sos: "bg-danger-fill text-white shadow-sm hover:-translate-y-px hover:bg-danger-fill-hover hover:shadow-md",
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(base, sizes[size], variants[variant], className)}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ───────────────────────── Formularios ───────────────────────── */

const inputCls =
  "min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-base text-ink outline-none transition placeholder:text-ink-3/70 hover:border-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-danger disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-xs leading-relaxed text-ink-3">{hint}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;

export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputCls, "cursor-pointer", p.className)} />
);

export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(inputCls, "min-h-28 resize-y py-3 leading-relaxed", p.className)} />
);

export function PasswordInput(p: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...p} type={visible ? "text" : "password"} className={cx(inputCls, "pr-14", p.className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
      >
        {visible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
      </button>
    </div>
  );
}

/** Interruptor accesible: es un checkbox nativo (role="switch") con estilo propio. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span className="h-8 w-14 rounded-full bg-line-strong transition-colors duration-300 peer-checked:bg-brand peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand peer-disabled:opacity-50" />
      <span className="pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] peer-checked:translate-x-6" />
    </span>
  );
}

/* ───────────────────────── Superficies ───────────────────────── */

export function Card({
  children,
  className,
  interactive,
  style,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      style={style}
      className={cx(
        "rounded-2xl border border-line bg-surface p-5 shadow-card",
        interactive && "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  action,
  icon: Icon,
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-ink">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon size={18} aria-hidden />
          </span>
        )}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-base leading-relaxed text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/* ───────────────────────── Estados ───────────────────────── */

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex animate-pop items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger-ink">
      <CircleAlert size={18} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

type NoticeTone = "info" | "ok" | "warn" | "danger";
export function Notice({
  tone = "info",
  title,
  children,
  action,
  onClose,
  icon,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  icon?: LucideIcon;
}) {
  const tones: Record<NoticeTone, { box: string; icon: LucideIcon }> = {
    info: { box: "bg-brand-soft text-brand-ink", icon: Info },
    ok: { box: "bg-ok-soft text-ok-ink", icon: CheckCircle2 },
    warn: { box: "bg-accent-soft text-accent-ink", icon: TriangleAlert },
    danger: { box: "bg-danger-soft text-danger-ink", icon: CircleAlert },
  };
  const Icon = icon ?? tones[tone].icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex animate-pop items-start gap-3 rounded-2xl p-4", tones[tone].box)}>
      <Icon size={22} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && <p className="text-base font-bold">{title}</p>}
        {children}
        {action && <div className="mt-2.5 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Cerrar aviso" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg opacity-70 transition hover:bg-black/5 hover:opacity-100">
          <span aria-hidden>×</span>
        </button>
      )}
    </div>
  );
}

export function Empty({ children, icon: Icon, title }: { children?: ReactNode; icon?: LucideIcon; title?: string }) {
  return (
    <div className="flex animate-fade flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface-2/60 px-5 py-8 text-center">
      {Icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-3 shadow-card">
          <Icon size={22} aria-hidden />
        </span>
      )}
      {title && <p className="text-base font-bold text-ink">{title}</p>}
      {children && <p className="max-w-sm text-sm leading-relaxed text-ink-2">{children}</p>}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" aria-hidden />;
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-2" role="status">
      <Spinner /> {label}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton rounded-xl", className)} />;
}

/** Placeholder de una lista de tarjetas mientras llegan los datos. */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Cargando" className={cx("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-12 w-12 shrink-0 !rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div role="status" aria-label="Cargando" className="flex flex-col items-center gap-4">
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-lift">
          <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-brand" aria-hidden />
          <HeartHandshake size={32} className="relative animate-beat" aria-hidden />
        </span>
        <span className="text-sm font-semibold tracking-wide text-ink-2">Cargando…</span>
      </div>
    </main>
  );
}

/* ───────────────────────── Identidad ───────────────────────── */

export function Logo({ size = "md", tagline }: { size?: "sm" | "md" | "lg"; tagline?: boolean }) {
  const box = { sm: "h-9 w-9 rounded-xl", md: "h-11 w-11 rounded-xl", lg: "h-16 w-16 rounded-2xl" }[size];
  const icon = { sm: 18, md: 22, lg: 32 }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <span className="inline-flex items-center gap-3">
      <span className={cx("flex shrink-0 items-center justify-center bg-gradient-to-br from-brand to-brand-hover text-on-brand shadow-md", box)}>
        <HeartHandshake size={icon} aria-hidden />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cx("font-extrabold tracking-[0.12em] text-brand", text)}>NONOS</span>
        {tagline && <span className="mt-1.5 text-xs font-medium tracking-wide text-ink-3">Tecnología que acompaña</span>}
      </span>
    </span>
  );
}

const AVATAR_TONES = ["bg-brand-soft text-brand-ink", "bg-accent-soft text-accent-ink", "bg-ok-soft text-ok-ink", "bg-surface-3 text-ink-2"];

export function iniciales(nombre?: string | null) {
  if (!nombre) return "?";
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function Avatar({
  nombre,
  fotoUrl,
  size = 40,
  className,
}: {
  nombre?: string | null;
  fotoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const hash = [...(nombre ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0);
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        aria-hidden
        style={{ width: size, height: size }}
        className={cx("inline-block shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-bold", AVATAR_TONES[hash % AVATAR_TONES.length], className)}
    >
      {iniciales(nombre)}
    </span>
  );
}

type Tone = "brand" | "accent" | "danger" | "ok" | "neutral";
const TONE_SOFT: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-accent-ink",
  danger: "bg-danger-soft text-danger",
  ok: "bg-ok-soft text-ok-ink",
  neutral: "bg-surface-3 text-ink-2",
};

export function IconBubble({ icon: Icon, tone = "brand", size = 48, className }: { icon: LucideIcon; tone?: Tone; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full", TONE_SOFT[tone], className)}
    >
      <Icon size={Math.round(size * 0.48)} />
    </span>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "crit"; children: ReactNode }) {
  const tones = {
    neutral: "bg-surface-3 text-ink-2",
    ok: "bg-ok-soft text-ok-ink",
    warn: "bg-accent-soft text-accent-ink",
    crit: "bg-danger-soft text-danger-ink",
  };
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function ProgressBar({ value, label, tone = "brand" }: { value: number; label?: string; tone?: "brand" | "accent" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        style={{ width: `${pct}%` }}
        className={cx("h-full rounded-full transition-[width] duration-700 ease-out", tone === "brand" ? "bg-brand" : "bg-accent")}
      />
    </div>
  );
}

/* ───────────────────────── Navegación interna ───────────────────────── */

/**
 * Pestañas con un indicador que se desliza hacia la opción activa.
 * `pills`: fila desplazable con fondo lleno; `segmented`: control compacto.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  variant = "pills",
  className,
}: {
  tabs: readonly { key: T; label: string; icon?: LucideIcon; badge?: number }[];
  value: T;
  onChange: (k: T) => void;
  label: string;
  variant?: "pills" | "segmented";
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lista = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = refs.current[value];
    if (!el) return;
    setInd({ left: el.offsetLeft, width: el.offsetWidth });
    // Centra la pestaña activa solo dentro de la propia fila (nunca mueve la página).
    const c = lista.current;
    if (c && c.scrollWidth > c.clientWidth) c.scrollTo({ left: el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [value, tabs.length]);

  const seg = variant === "segmented";
  return (
    <div
      ref={lista}
      role="tablist"
      aria-label={label}
      className={cx(
        "no-scrollbar relative flex overflow-x-auto",
        seg ? "w-fit max-w-full gap-0.5 rounded-xl bg-surface-3 p-1" : "gap-2 pb-1",
        className,
      )}
    >
      {ind && (
        <span
          aria-hidden
          style={{ transform: `translateX(${ind.left}px)`, width: ind.width }}
          className={cx(
            "absolute transition-[transform,width] duration-400 ease-[cubic-bezier(0.34,1.2,0.64,1)]",
            seg ? "bottom-1 top-1 rounded-lg bg-surface shadow-card" : "bottom-1 top-0 rounded-full bg-brand shadow-md",
          )}
        />
      )}
      {tabs.map((t) => {
        const on = t.key === value;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[t.key] = el;
            }}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cx(
              "relative z-10 flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold transition-colors duration-300",
              seg ? "min-h-9 rounded-lg px-3.5 text-sm" : "min-h-11 rounded-full px-4 text-sm",
              on ? (seg ? "text-ink" : "text-on-brand") : "text-ink-2 hover:text-ink",
              !seg && !on && "border border-line bg-surface",
            )}
          >
            {Icon && <Icon size={16} aria-hidden />}
            {t.label}
            {!!t.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-fill px-1 text-xs font-bold text-white">{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Contenido plegable con altura animada. */
export function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="collapsible" data-open={open} aria-hidden={!open} inert={!open}>
      <div>{children}</div>
    </div>
  );
}

export function Disclosure({
  label,
  children,
  icon: Icon,
  onOpen,
}: {
  label: [string, string] | string;
  children: ReactNode;
  icon?: LucideIcon;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const [cerrado, abierto] = Array.isArray(label) ? label : [label, label];
  return (
    <div>
      <button
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-10 items-center gap-1.5 rounded-lg text-sm font-semibold text-brand transition hover:text-brand-hover"
      >
        {Icon && <Icon size={16} aria-hidden />}
        {open ? abierto : cerrado}
        <ChevronDown size={16} aria-hidden className={cx("transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div id={id}>
        <Collapsible open={open}>
          <div className="pt-2">{children}</div>
        </Collapsible>
      </div>
    </div>
  );
}

/* ───────────────────────── Fechas ───────────────────────── */

export function formatFecha(iso?: string | null, conHora = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", conHora ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

/** Para fechas de calendario (sin hora) guardadas como medianoche UTC: evita que se corran un día por la zona horaria. */
export function formatDia(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "medium", timeZone: "UTC" });
}

/** "hace 5 min", "hace 3 h", "hace 2 días". */
export function tiempoRelativo(iso?: string | null, ahora = Date.now()) {
  if (!iso) return "—";
  const s = Math.round((ahora - new Date(iso).getTime()) / 1000);
  if (s < 45) return "hace instantes";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? "día" : "días"}`;
  return formatFecha(iso);
}
