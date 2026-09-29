"use client";

import { FormEvent, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertOctagon, Clock, HeartPulse, Phone, Pill, ScrollText, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { PerfilEmergencia } from "@/lib/api";
import { Btn, Card, ErrorText, IconBubble, Logo, Notice, cx, formatFecha, stagger } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const ERRORES: Record<number, string> = {
  401: "El código es incorrecto. Revisalo en la app de NONOS de la persona o de su familiar. Después de 5 intentos fallidos el acceso se bloquea.",
  404: "Este acceso no existe o fue desactivado.",
  410: "El código venció o el acceso se bloqueó por demasiados intentos. Pedí que generen uno nuevo en la app de NONOS.",
  429: "Hiciste demasiados intentos seguidos. Esperá un minuto y probá de nuevo.",
};

/**
 * Acceso de emergencia: página pública (sin cuenta). El QR de la pulsera
 * apunta acá y solo muestra datos si se ingresa el código temporal vigente.
 */
export default function EmergenciaPublica() {
  const { qrId } = useParams<{ qrId: string }>();
  const [digitos, setDigitos] = useState<string[]>(Array(6).fill(""));
  const [perfil, setPerfil] = useState<PerfilEmergencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const codigo = digitos.join("");

  function escribir(i: number, valor: string) {
    const solo = valor.replace(/\D/g, "");
    if (!solo) {
      setDigitos((d) => d.map((x, j) => (j === i ? "" : x)));
      return;
    }
    // Permite pegar el código completo o escribir varios dígitos de golpe.
    setDigitos((d) => {
      const n = [...d];
      solo.slice(0, 6 - i).split("").forEach((c, k) => (n[i + k] = c));
      return n;
    });
    refs.current[Math.min(5, i + solo.length)]?.focus();
  }

  function teclas(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  }

  async function ingresar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await fetch(`/api/emergencia/${encodeURIComponent(qrId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      if (!r.ok) {
        setError(ERRORES[r.status] ?? "No pudimos validar el código. Probá de nuevo.");
        setDigitos(Array(6).fill(""));
        refs.current[0]?.focus();
        return;
      }
      setPerfil(await r.json());
      setDigitos(Array(6).fill(""));
    } catch {
      setError("No hay conexión con NONOS. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main id="contenido" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-danger-fill text-white shadow-md">
            <AlertOctagon size={28} aria-hidden />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">NONOS · Acceso de emergencia</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Perfil de emergencia</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {!perfil ? (
        <Card className="flex animate-rise flex-col gap-5 !p-6 sm:!p-8">
          <div className="flex items-start gap-3.5">
            <IconBubble icon={ShieldCheck} size={48} />
            <p className="text-lg leading-relaxed text-ink">Ingresá el código de 6 dígitos que muestra la app de NONOS de la persona o de su familiar.</p>
          </div>
          <form onSubmit={ingresar} className="flex flex-col gap-5">
            <fieldset className="min-w-0">
              <legend className="mb-2.5 text-sm font-semibold text-ink-2">Código de emergencia</legend>
              <div className="flex w-full justify-center gap-1.5 sm:gap-3">
                {digitos.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    value={d}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus={i === 0}
                    aria-label={`Dígito ${i + 1} de 6`}
                    onChange={(e) => escribir(i, e.target.value)}
                    onKeyDown={(e) => teclas(i, e)}
                    onFocus={(e) => e.target.select()}
                    className={cx(
                      "h-16 min-w-0 max-w-14 flex-1 rounded-xl border-2 bg-surface text-center font-mono text-3xl font-extrabold text-ink outline-none transition-all duration-200 sm:h-20 sm:text-4xl",
                      "focus:-translate-y-0.5 focus:border-brand focus:shadow-lift",
                      d ? "border-brand bg-brand-soft" : "border-line-strong",
                      i === 2 && "mr-1.5 sm:mr-3",
                    )}
                  />
                ))}
              </div>
            </fieldset>
            <ErrorText>{error}</ErrorText>
            <Btn type="submit" size="lg" loading={cargando} disabled={codigo.length < 6}>
              Ver información
            </Btn>
          </form>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
            <Clock size={14} className="mt-0.5 shrink-0" aria-hidden /> Este acceso es temporal: el código dura 30 minutos, se usa una sola vez y muestra únicamente la información necesaria para asistir a la persona.
          </p>
        </Card>
      ) : (
        <>
          <Card className="relative animate-pop overflow-hidden !border-0 !bg-gradient-to-br !from-[#22302c] !to-[#0e1513] !text-white">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <p className="relative text-sm font-semibold uppercase tracking-wider opacity-70">Persona asistida</p>
            <p className="relative text-4xl font-extrabold tracking-tight">{perfil.nombreCompleto}</p>
            {perfil.edad != null && <p className="relative text-xl opacity-90">{perfil.edad} años</p>}
          </Card>

          <Notice tone="ok" icon={ShieldCheck} title="Acceso concedido">
            El código que usaste ya no sirve. Si necesitás volver a entrar, pedí uno nuevo.
          </Notice>

          <Card className="rise flex flex-col gap-3" style={stagger(1)}>
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-ink">
              <IconBubble icon={ShieldAlert} tone="danger" size={36} /> Condiciones y alergias
            </h2>
            {perfil.condiciones.length === 0 ? (
              <p className="text-ink-2">No hay condiciones registradas.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {perfil.condiciones.map((c) => (
                  <li key={c.id} className="rounded-xl bg-danger-wash p-3.5">
                    <p className="text-lg font-bold text-ink">{c.nombre}</p>
                    {c.descripcion && <p className="text-ink-2">{c.descripcion}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rise flex flex-col gap-3" style={stagger(2)}>
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-ink">
              <IconBubble icon={Pill} tone="accent" size={36} /> Medicación actual
            </h2>
            {perfil.medicacionActual.length === 0 ? (
              <p className="text-ink-2">No hay medicación registrada.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {perfil.medicacionActual.map((m) => (
                  <li key={m.id} className="rounded-xl bg-surface-2 p-3.5">
                    <p className="text-lg font-bold text-ink">
                      {m.nombre} <span className="font-medium text-ink-2">— {m.dosis}</span>
                    </p>
                    <p className="text-sm text-ink-2">
                      {m.horariosDelDia.join(", ")} · {m.diasSemana.length ? m.diasSemana.map((d) => DIAS[d]).join(", ") : "todos los días"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rise flex flex-col gap-3" style={stagger(3)}>
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-ink">
              <IconBubble icon={ScrollText} size={36} /> Medidas anticipadas
            </h2>
            {perfil.medidasAnticipadas ? <p className="whitespace-pre-wrap text-lg leading-relaxed text-ink">{perfil.medidasAnticipadas}</p> : <p className="text-ink-2">La persona no dejó medidas anticipadas.</p>}
          </Card>

          <Card className="rise flex flex-col gap-3" style={stagger(4)}>
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-ink">
              <IconBubble icon={Phone} size={36} /> Contactos de emergencia
            </h2>
            {perfil.contactosDeEmergencia.length === 0 ? (
              <p className="text-ink-2">No hay contactos cargados.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {perfil.contactosDeEmergencia.map((c, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3.5">
                    <span className="text-lg font-bold text-ink">{c.nombreCompleto ?? "Contacto"}</span>
                    {c.telefono ? (
                      <a href={`tel:${c.telefono}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-5 font-bold text-on-brand shadow-md transition hover:-translate-y-0.5 hover:bg-brand-hover active:scale-95">
                        <Phone size={18} aria-hidden /> {c.telefono}
                      </a>
                    ) : (
                      <span className="text-sm text-ink-3">Sin teléfono</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
            <HeartPulse size={14} className="mt-0.5 shrink-0" aria-hidden /> Información actualizada por última vez el {formatFecha(perfil.fechaUltimaActualizacion, true)}. NONOS no reemplaza el criterio médico.
          </p>
          <Btn variant="secondary" onClick={() => setPerfil(null)}>
            <X size={18} aria-hidden /> Cerrar y borrar de esta pantalla
          </Btn>
          <Logo size="sm" />
        </>
      )}
    </main>
  );
}
