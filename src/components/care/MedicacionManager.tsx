"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pill, Clock, CalendarDays, Package, Plus, X, History, TriangleAlert } from "lucide-react";
import {
  Medicamento,
  CambioMedicacion,
  getMedicamentos,
  createMedicamento,
  updateMedicamentoConHistorial,
  deleteMedicamento,
  getCambiosMedicacion,
  mensajeDeError,
} from "@/lib/api";
import { Badge, Btn, Card, Empty, ErrorText, Field, formatFecha, Input, Loading, SectionTitle } from "@/components/ui";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const diasTexto = (d: number[]) =>
  !d || d.length === 0 ? "Todos los días" : [...d].sort((a, b) => a - b).map((x) => DIAS[x]).join(", ");

function resumirCambio(json: string) {
  try {
    return Object.entries(JSON.parse(json))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join(" · ");
  } catch {
    return json;
  }
}

function Cambios({ medicamentoId }: { medicamentoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<CambioMedicacion[] | null>(null);

  async function toggle() {
    if (!abierto && items === null) {
      setItems(await getCambiosMedicacion(medicamentoId).catch(() => []));
    }
    setAbierto((v) => !v);
  }
  return (
    <div>
      <button onClick={toggle} className="flex min-h-9 items-center gap-1 text-sm font-semibold text-[#25665F] underline">
        <History size={16} aria-hidden /> {abierto ? "Ocultar cambios" : "Ver historial de cambios"}
      </button>
      {abierto && (
        <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-[#F1F4F2] p-3 text-sm text-[#3F4947]">
          {items === null && <Loading />}
          {items?.length === 0 && <li>Sin cambios registrados.</li>}
          {items?.map((c) => (
            <li key={c.id}>
              <span className="font-semibold">{formatFecha(c.fechaCambio, true)}</span> — {resumirCambio(c.cambio)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MedicacionManager({ adultoMayorId, canEdit }: { adultoMayorId: string; canEdit: boolean }) {
  const [items, setItems] = useState<Medicamento[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Medicamento | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const meds = await getMedicamentos(adultoMayorId);
      setItems(meds);
      const fechas = await Promise.all(
        meds.map(async (m) => {
          const c = await getCambiosMedicacion(m.id).catch(() => []);
          return [m.createdAt, ...c.map((x) => x.fechaCambio)];
        }),
      );
      const todas = fechas.flat().sort();
      setUltimaActualizacion(todas.length ? todas[todas.length - 1] : null);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo cargar la medicación."));
    } finally {
      setCargando(false);
    }
  }, [adultoMayorId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function baja(m: Medicamento) {
    if (!confirm(`¿Dar de baja ${m.nombre}?`)) return;
    try {
      await deleteMedicamento(m.id);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        action={
          canEdit && (
            <Btn onClick={() => setForm(form ? null : "nuevo")} variant={form ? "secondary" : "primary"}>
              {form ? "Cancelar" : (<><Plus size={18} aria-hidden /> Agregar</>)}
            </Btn>
          )
        }
      >
        Medicación actual
      </SectionTitle>

      <p className="text-sm text-[#3F4947]">
        {ultimaActualizacion ? <>Medicación actualizada el <strong>{formatFecha(ultimaActualizacion)}</strong>.</> : "Todavía no hay medicación cargada."}{" "}
        NONOS registra qué medicación corresponde tomar, no si se tomó cada dosis.
      </p>

      <ErrorText>{error}</ErrorText>

      {form && (
        <FormMedicamento
          key={form === "nuevo" ? "nuevo" : form.id}
          adultoMayorId={adultoMayorId}
          inicial={form === "nuevo" ? null : form}
          onDone={() => {
            setForm(null);
            cargar();
          }}
        />
      )}

      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>No hay medicamentos cargados.</Empty>}

      <ul className="flex flex-col gap-3">
        {items.map((m) => (
          <li key={m.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFDBD1] text-[#98462E]">
                    <Pill size={20} aria-hidden />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-[#181C1B]">{m.nombre}</p>
                    <p className="text-sm text-[#3F4947]">Dosis: {m.dosis}</p>
                  </div>
                </div>
                {m.lowStock && (
                  <Badge tone="warn">
                    <TriangleAlert size={14} aria-hidden /> Stock bajo
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {m.horariosDelDia.map((h) => (
                  <span key={h} className="flex items-center gap-1 rounded-full bg-[#E8F0EE] px-3 py-1 text-sm font-semibold text-[#25665F]">
                    <Clock size={14} aria-hidden /> {h}
                  </span>
                ))}
              </div>
              <p className="flex items-center gap-2 text-sm text-[#3F4947]">
                <CalendarDays size={16} aria-hidden /> {diasTexto(m.diasSemana)}
              </p>
              {m.stockActual != null && (
                <p className="flex items-center gap-2 text-sm text-[#3F4947]">
                  <Package size={16} aria-hidden /> Stock: {m.stockActual}
                  {m.stockMinimo != null && <span className="text-[#6F7977]"> (aviso desde {m.stockMinimo})</span>}
                </p>
              )}
              <Cambios medicamentoId={m.id} />
              {canEdit && (
                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={() => setForm(m)}>Registrar cambio</Btn>
                  <Btn variant="danger" onClick={() => baja(m)}>Dar de baja</Btn>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormMedicamento({
  adultoMayorId,
  inicial,
  onDone,
}: {
  adultoMayorId: string;
  inicial: Medicamento | null;
  onDone: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [dosis, setDosis] = useState(inicial?.dosis ?? "");
  const [horarios, setHorarios] = useState<string[]>(inicial?.horariosDelDia ?? ["08:00"]);
  const [dias, setDias] = useState<number[]>(inicial?.diasSemana ?? []);
  const [stock, setStock] = useState(inicial?.stockActual?.toString() ?? "");
  const [minimo, setMinimo] = useState(inicial?.stockMinimo?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const limpios = horarios.filter(Boolean);
    if (limpios.length === 0) return setError("Cargá al menos un horario.");
    setGuardando(true);
    const payload = {
      nombre,
      dosis,
      horariosDelDia: limpios,
      diasSemana: dias,
      ...(stock !== "" && { stockActual: Number(stock) }),
      ...(minimo !== "" && { stockMinimo: Number(minimo) }),
    };
    try {
      if (inicial) await updateMedicamentoConHistorial(inicial.id, adultoMayorId, payload);
      else await createMedicamento({ ...payload, usuarioId: adultoMayorId });
      onDone();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el medicamento."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h3 className="text-lg font-bold">{inicial ? `Registrar cambio en ${inicial.nombre}` : "Nuevo medicamento"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
          <Field label="Dosis"><Input required value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="50 mg" /></Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-[#3F4947]">Horarios</legend>
          {horarios.map((h, i) => (
            <div key={i} className="flex gap-2">
              <Input type="time" required value={h} onChange={(e) => setHorarios(horarios.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Horario ${i + 1}`} />
              {horarios.length > 1 && (
                <Btn type="button" variant="ghost" aria-label="Quitar horario" onClick={() => setHorarios(horarios.filter((_, j) => j !== i))}>
                  <X size={18} aria-hidden />
                </Btn>
              )}
            </div>
          ))}
          <Btn type="button" variant="ghost" className="self-start" onClick={() => setHorarios([...horarios, "12:00"])}>
            <Plus size={16} aria-hidden /> Agregar horario
          </Btn>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[#3F4947]">Días (vacío = todos los días)</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d, i) => {
              const on = dias.includes(i);
              return (
                <button
                  type="button"
                  key={d}
                  aria-pressed={on}
                  onClick={() => setDias(on ? dias.filter((x) => x !== i) : [...dias, i])}
                  className={`min-h-11 min-w-12 rounded-lg border-2 px-3 text-sm font-semibold ${on ? "border-[#25665F] bg-[#E8F0EE] text-[#25665F]" : "border-[#E0E4E3]"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stock actual (comprimidos)"><Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
          <Field label="Avisar cuando queden" hint="Genera una alerta de stock bajo."><Input type="number" min={0} value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>{inicial ? "Guardar cambio" : "Guardar medicamento"}</Btn>
      </form>
    </Card>
  );
}
