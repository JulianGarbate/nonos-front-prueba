"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { AlertOctagon, Phone, Pill, ShieldAlert, HeartPulse, ScrollText } from "lucide-react";
import { PerfilEmergencia } from "@/lib/api";
import { Btn, Card, ErrorText, formatFecha } from "@/components/ui";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const ERRORES: Record<number, string> = {
  401: "El código es incorrecto. Revisalo en la app de NONOS de la persona o de su familiar.",
  404: "Este acceso no existe o fue desactivado.",
  410: "El código venció. Pedí uno nuevo en la app de NONOS.",
};

/**
 * Acceso de emergencia: página pública (sin cuenta). El QR de la pulsera
 * apunta acá y solo muestra datos si se ingresa el código temporal vigente.
 */
export default function EmergenciaPublica() {
  const { qrId } = useParams<{ qrId: string }>();
  const [codigo, setCodigo] = useState("");
  const [perfil, setPerfil] = useState<PerfilEmergencia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await fetch(`/api/emergencia/${encodeURIComponent(qrId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      if (!r.ok) {
        setError(ERRORES[r.status] ?? "No pudimos validar el código. Probá de nuevo.");
        return;
      }
      setPerfil(await r.json());
      setCodigo("");
    } catch {
      setError("No hay conexión con NONOS. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 bg-[#F7FAF8] px-4 py-6">
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#BA1A1A] text-white"><AlertOctagon size={26} aria-hidden /></span>
        <div>
          <p className="text-sm font-bold tracking-wide text-[#25665F]">NONOS · ACCESO DE EMERGENCIA</p>
          <h1 className="text-2xl font-bold text-[#181C1B]">Perfil de emergencia</h1>
        </div>
      </header>

      {!perfil ? (
        <Card className="flex flex-col gap-4">
          <p className="text-lg text-[#181C1B]">Ingresá el código de 6 dígitos que muestra la app de NONOS de la persona o de su familiar.</p>
          <form onSubmit={ingresar} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#3F4947]">Código de emergencia</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="min-h-16 rounded-lg border-2 border-[#BFC9C6] bg-white px-4 text-center font-mono text-3xl tracking-[0.4em] outline-none focus:border-[#25665F]"
              />
            </label>
            <ErrorText>{error}</ErrorText>
            <Btn type="submit" size="lg" loading={cargando} disabled={codigo.length < 6}>Ver información</Btn>
          </form>
          <p className="text-xs text-[#6F7977]">Este acceso es temporal: el código se usa una sola vez y muestra únicamente la información necesaria para asistir a la persona.</p>
        </Card>
      ) : (
        <>
          <Card className="!bg-[#181C1B] !text-white">
            <p className="text-sm opacity-80">Persona asistida</p>
            <p className="text-3xl font-bold">{perfil.nombreCompleto}</p>
            {perfil.edad != null && <p className="text-lg">{perfil.edad} años</p>}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert size={22} className="text-[#BA1A1A]" aria-hidden /> Condiciones y alergias</h2>
            {perfil.condiciones.length === 0 ? <p className="text-[#3F4947]">No hay condiciones registradas.</p> : (
              <ul className="flex flex-col gap-2">
                {perfil.condiciones.map((c) => (
                  <li key={c.id}><p className="text-lg font-semibold">{c.nombre}</p>{c.descripcion && <p className="text-[#3F4947]">{c.descripcion}</p>}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Pill size={22} className="text-[#98462E]" aria-hidden /> Medicación actual</h2>
            {perfil.medicacionActual.length === 0 ? <p className="text-[#3F4947]">No hay medicación registrada.</p> : (
              <ul className="flex flex-col gap-2">
                {perfil.medicacionActual.map((m) => (
                  <li key={m.id}>
                    <p className="text-lg font-semibold">{m.nombre} — {m.dosis}</p>
                    <p className="text-sm text-[#3F4947]">{m.horariosDelDia.join(", ")} · {m.diasSemana.length ? m.diasSemana.map((d) => DIAS[d]).join(", ") : "todos los días"}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xl font-bold"><ScrollText size={22} className="text-[#25665F]" aria-hidden /> Medidas anticipadas</h2>
            {perfil.medidasAnticipadas ? <p className="whitespace-pre-wrap text-lg">{perfil.medidasAnticipadas}</p> : <p className="text-[#3F4947]">La persona no dejó medidas anticipadas.</p>}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Phone size={22} className="text-[#25665F]" aria-hidden /> Contactos de emergencia</h2>
            {perfil.contactosDeEmergencia.length === 0 ? <p className="text-[#3F4947]">No hay contactos cargados.</p> : (
              <ul className="flex flex-col gap-2">
                {perfil.contactosDeEmergencia.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{c.nombreCompleto ?? "Contacto"}</span>
                    {c.telefono ? (
                      <a href={`tel:${c.telefono}`} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#25665F] px-4 font-semibold text-white"><Phone size={18} aria-hidden /> {c.telefono}</a>
                    ) : <span className="text-sm text-[#6F7977]">Sin teléfono</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="flex items-center gap-2 text-xs text-[#6F7977]"><HeartPulse size={14} aria-hidden /> Información actualizada por última vez el {formatFecha(perfil.fechaUltimaActualizacion, true)}. NONOS no reemplaza el criterio médico.</p>
          <Btn variant="secondary" onClick={() => setPerfil(null)}>Cerrar y borrar de esta pantalla</Btn>
        </>
      )}
    </main>
  );
}
