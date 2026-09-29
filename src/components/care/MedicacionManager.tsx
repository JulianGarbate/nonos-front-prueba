"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, History, Package, Pill, Plus, TriangleAlert, X } from "lucide-react";
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
import { useConfirm, useToast } from "@/components/feedback";
import {
  Badge,
  Btn,
  Card,
  Collapsible,
  Disclosure,
  Empty,
  ErrorText,
  Field,
  IconBubble,
  Input,
  ProgressBar,
  SectionTitle,
  SkeletonList,
  cx,
  formatFecha,
  stagger,
} from "@/components/ui";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const diasTexto = (d: number[]) => (!d || d.length === 0 ? "Todos los días" : [...d].sort((a, b) => a - b).map((x) => DIAS[x]).join(", "));

const ETIQUETAS: Record<string, string> = {
  nombre: "Nombre",
  dosis: "Dosis",
  horariosDelDia: "Horarios",
  diasSemana: "Días",
  stockActual: "Stock",
  stockMinimo: "Aviso desde",
};

function resumirCambio(json: string) {
  try {
    return Object.entries(JSON.parse(json) as Record<string, unknown>)
      .map(([k, v]) => `${ETIQUETAS[k] ?? k}: ${k === "diasSemana" && Array.isArray(v) ? diasTexto(v as number[]) : Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join(" · ");
  } catch {
    return json;
  }
}

function Cambios({ medicamentoId }: { medicamentoId: string }) {
  const [items, setItems] = useState<CambioMedicacion[] | null>(null);

  return (
    <Disclosure
      label={["Ver historial de cambios", "Ocultar cambios"]}
      icon={History}
      onOpen={() => items === null && getCambiosMedicacion(medicamentoId).then(setItems).catch(() => setItems([]))}
    >
      <ol className="flex flex-col gap-2 border-l-2 border-line-strong pl-4 text-sm text-ink-2">
        {items === null && <li>Cargando…</li>}
        {items?.length === 0 && <li>Sin cambios registrados.</li>}
        {items?.map((c) => (
          <li key={c.id} className="relative">
            <span aria-hidden className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="font-semibold text-ink">{formatFecha(c.fechaCambio, true)}</span>
            <br />
            {resumirCambio(c.cambio)}
          </li>
        ))}
      </ol>
    </Disclosure>
  );
}

export default function MedicacionManager({ adultoMayorId, canEdit }: { adultoMayorId: string; canEdit: boolean }) {
  const confirmar = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Medicamento[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Medicamento | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
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
    const ok = await confirmar({
      title: `¿Dar de baja ${m.nombre}?`,
      message: "Deja de figurar como medicación actual. El historial de cambios se conserva.",
      confirmLabel: "Dar de baja",
    });
    if (!ok) return;
    try {
      await deleteMedicamento(m.id);
      toast.ok(`${m.nombre} se dio de baja.`);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon={Pill}
        action={
          canEdit && (
            <Btn onClick={() => setForm(form ? null : "nuevo")} variant={form ? "secondary" : "primary"}>
              {form ? (
                "Cancelar"
              ) : (
                <>
                  <Plus size={18} aria-hidden /> Agregar
                </>
              )}
            </Btn>
          )
        }
      >
        Medicación actual
      </SectionTitle>

      <p className="text-sm leading-relaxed text-ink-2">
        {ultimaActualizacion ? (
          <>
            Medicación actualizada el <strong>{formatFecha(ultimaActualizacion)}</strong>.
          </>
        ) : (
          "Todavía no hay medicación cargada."
        )}{" "}
        NONOS registra qué medicación corresponde tomar, no si se tomó cada dosis.
      </p>

      <ErrorText>{error}</ErrorText>

      <Collapsible open={!!form}>
        {form && (
          <FormMedicamento
            key={form === "nuevo" ? "nuevo" : form.id}
            adultoMayorId={adultoMayorId}
            inicial={form === "nuevo" ? null : form}
            onDone={(msg) => {
              setForm(null);
              toast.ok(msg);
              cargar();
            }}
          />
        )}
      </Collapsible>

      {cargando && <SkeletonList rows={2} />}
      {!cargando && items.length === 0 && (
        <Empty icon={Pill} title="No hay medicamentos cargados">
          {canEdit ? "Agregá el primero con el botón de arriba." : "Cuando se cargue medicación, la vas a ver acá."}
        </Empty>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map((m, i) => {
          const pct = m.stockActual != null && m.stockMinimo ? Math.min(1, m.stockActual / (m.stockMinimo * 3)) : null;
          return (
            <li key={m.id} className="rise" style={stagger(i)}>
              <Card className={cx("flex h-full flex-col gap-3.5", m.lowStock && "!border-accent/50")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <IconBubble icon={Pill} tone="accent" size={48} />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-ink">{m.nombre}</p>
                      <p className="text-sm text-ink-2">Dosis: {m.dosis}</p>
                    </div>
                  </div>
                  {m.lowStock && (
                    <Badge tone="warn">
                      <TriangleAlert size={13} aria-hidden /> Stock bajo
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.horariosDelDia.map((h) => (
                    <span key={h} className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-bold tabular-nums text-brand-ink">
                      <Clock size={14} aria-hidden /> {h}
                    </span>
                  ))}
                </div>
                <p className="flex items-center gap-2 text-sm text-ink-2">
                  <CalendarDays size={16} aria-hidden /> {diasTexto(m.diasSemana)}
                </p>
                {m.stockActual != null && (
                  <div className="flex flex-col gap-1.5">
                    <p className="flex items-center gap-2 text-sm text-ink-2">
                      <Package size={16} aria-hidden /> Stock: <strong className="text-ink">{m.stockActual}</strong>
                      {m.stockMinimo != null && <span className="text-ink-3">(aviso desde {m.stockMinimo})</span>}
                    </p>
                    {pct !== null && <ProgressBar value={pct} tone={m.lowStock ? "accent" : "brand"} label={`Stock de ${m.nombre}`} />}
                  </div>
                )}
                <Cambios medicamentoId={m.id} />
                {canEdit && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Btn size="sm" variant="secondary" onClick={() => setForm(m)}>
                      Registrar cambio
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => baja(m)}>
                      Dar de baja
                    </Btn>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
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
  onDone: (mensaje: string) => void;
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
      onDone(inicial ? "Cambio registrado en el historial." : "Medicamento guardado.");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el medicamento."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h3 className="text-lg font-bold text-ink">{inicial ? `Registrar cambio en ${inicial.nombre}` : "Nuevo medicamento"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field label="Dosis">
            <Input required value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="50 mg" />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink-2">Horarios</legend>
          {horarios.map((h, i) => (
            <div key={i} className="flex animate-pop gap-2">
              <Input type="time" required value={h} onChange={(e) => setHorarios(horarios.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Horario ${i + 1}`} />
              {horarios.length > 1 && (
                <Btn type="button" variant="ghost" aria-label="Quitar horario" onClick={() => setHorarios(horarios.filter((_, j) => j !== i))}>
                  <X size={18} aria-hidden />
                </Btn>
              )}
            </div>
          ))}
          <Btn type="button" variant="ghost" size="sm" className="self-start" onClick={() => setHorarios([...horarios, "12:00"])}>
            <Plus size={16} aria-hidden /> Agregar horario
          </Btn>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-2">Días (vacío = todos los días)</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d, i) => {
              const on = dias.includes(i);
              return (
                <button
                  type="button"
                  key={d}
                  aria-pressed={on}
                  onClick={() => setDias(on ? dias.filter((x) => x !== i) : [...dias, i])}
                  className={cx(
                    "min-h-11 min-w-13 rounded-xl border-2 px-3 text-sm font-bold transition-all duration-200 active:scale-90",
                    on ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stock actual (comprimidos)">
            <Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
          <Field label="Avisar cuando queden" hint="Genera una alerta de stock bajo.">
            <Input type="number" min={0} value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>
          {inicial ? "Guardar cambio" : "Guardar medicamento"}
        </Btn>
      </form>
    </Card>
  );
}
