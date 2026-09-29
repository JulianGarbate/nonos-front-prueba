"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { NotebookPen, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import {
  EventoHistorial,
  Nota,
  createHistorial,
  createNota,
  deleteHistorial,
  deleteNota,
  getHistorial,
  getNotas,
  mensajeDeError,
  updateHistorial,
  updateNota,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useConfirm, useToast } from "@/components/feedback";
import { Badge, Btn, Card, Collapsible, Empty, ErrorText, Field, Input, SectionTitle, SkeletonList, Textarea, formatDia, formatFecha, stagger } from "@/components/ui";

const aInputDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

/* ───────── Historial de acontecimientos relevantes ───────── */

export function HistorialManager({ adultoMayorId }: { adultoMayorId: string }) {
  const { user } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<EventoHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<EventoHistorial | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await getHistorial(adultoMayorId));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [adultoMayorId]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrar(ev: EventoHistorial) {
    if (!(await confirmar({ title: "¿Eliminar este registro?", message: "Solo vos, como autor, podés borrarlo. No se puede deshacer.", confirmLabel: "Eliminar" }))) return;
    try {
      await deleteHistorial(ev.id);
      toast.ok("Registro eliminado.");
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        icon={ScrollText}
        action={
          <Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>
            {form ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={18} aria-hidden /> Registrar
              </>
            )}
          </Btn>
        }
      >
        Historial de acontecimientos
      </SectionTitle>
      <p className="text-sm leading-relaxed text-ink-2">
        Episodios, consultas o situaciones importantes, para que no queden solo en la memoria de una persona. No reemplaza una historia clínica.
      </p>
      <ErrorText>{error}</ErrorText>
      <Collapsible open={!!form}>
        {form && (
          <FormEvento
            key={form === "nuevo" ? "n" : form.id}
            adultoMayorId={adultoMayorId}
            inicial={form === "nuevo" ? null : form}
            onDone={() => {
              setForm(null);
              toast.ok("Historial actualizado.");
              cargar();
            }}
          />
        )}
      </Collapsible>
      {cargando && <SkeletonList rows={2} />}
      {!cargando && items.length === 0 && (
        <Empty icon={ScrollText} title="Todavía no hay acontecimientos">
          Caídas, consultas, internaciones… lo que valga la pena recordar.
        </Empty>
      )}
      <ol className="relative flex flex-col gap-4 border-l-2 border-line-strong pl-6">
        {items.map((ev, i) => {
          const mio = ev.authorId === user?.id;
          return (
            <li key={ev.id} className="rise relative" style={stagger(i)}>
              <span aria-hidden className="absolute -left-[1.95rem] top-5 h-3.5 w-3.5 rounded-full border-[3px] border-canvas bg-brand shadow-md" />
              <Card className="flex flex-col gap-1.5 !p-4">
                <p className="text-sm font-bold text-brand">
                  {formatDia(ev.fecha)}
                  {ev.fechaFin && <> → {formatDia(ev.fechaFin)}</>}
                </p>
                <p className="leading-relaxed text-ink">{ev.descripcion}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge>{mio ? "Registrado por vos" : "Registrado por otra persona de la red"}</Badge>
                  {mio && (
                    <div className="flex gap-0.5">
                      <Btn variant="ghost" size="sm" aria-label="Editar" onClick={() => setForm(ev)}>
                        <Pencil size={16} aria-hidden />
                      </Btn>
                      <Btn variant="ghost" size="sm" aria-label="Eliminar" onClick={() => borrar(ev)}>
                        <Trash2 size={16} aria-hidden />
                      </Btn>
                    </div>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FormEvento({ adultoMayorId, inicial, onDone }: { adultoMayorId: string; inicial: EventoHistorial | null; onDone: () => void }) {
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [fecha, setFecha] = useState(aInputDate(inicial?.fecha) || new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState(aInputDate(inicial?.fechaFin));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      if (inicial) await updateHistorial(inicial.id, { descripcion, fecha, fechaFin: fechaFin || null });
      else await createHistorial({ usuarioId: adultoMayorId, descripcion, fecha, ...(fechaFin && { fechaFin }) });
      onDone();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="¿Qué ocurrió?">
          <Textarea required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej.: Internación por neumonía" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            <Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Hasta (opcional)">
            <Input type="date" min={fecha} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>
          Guardar
        </Btn>
      </form>
    </Card>
  );
}

/* ───────── Notas entre cuidadores ───────── */

export function NotasManager({ adultoMayorId }: { adultoMayorId: string }) {
  const { user } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Nota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Nota | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems((await getNotas(adultoMayorId)).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [adultoMayorId]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrar(n: Nota) {
    if (!(await confirmar({ title: "¿Eliminar esta nota?", message: "El resto de la red deja de verla.", confirmLabel: "Eliminar" }))) return;
    try {
      await deleteNota(n.id);
      toast.ok("Nota eliminada.");
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        icon={NotebookPen}
        action={
          <Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>
            {form ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={18} aria-hidden /> Nueva nota
              </>
            )}
          </Btn>
        }
      >
        Notas compartidas
      </SectionTitle>
      <p className="text-sm leading-relaxed text-ink-2">Lo que un cuidador quiere que sepa el resto de la red. Solo quien la escribió puede editarla.</p>
      <ErrorText>{error}</ErrorText>
      <Collapsible open={!!form}>
        {form && (
          <FormNota
            key={form === "nuevo" ? "n" : form.id}
            adultoMayorId={adultoMayorId}
            inicial={form === "nuevo" ? null : form}
            onDone={() => {
              setForm(null);
              toast.ok("Nota guardada.");
              cargar();
            }}
          />
        )}
      </Collapsible>
      {cargando && <SkeletonList rows={2} />}
      {!cargando && items.length === 0 && (
        <Empty icon={NotebookPen} title="No hay notas todavía">
          Dejá un aviso para que el resto de la red esté al tanto.
        </Empty>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((n, i) => (
          <li key={n.id} className="rise" style={stagger(i)}>
            <Card className="flex h-full flex-col gap-2 !p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink">{n.titulo}</p>
                <span className="shrink-0 text-xs text-ink-3">{formatFecha(n.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{n.contenido}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <Badge>{n.cuidadorId === user?.id ? "Escrita por vos" : "Escrita por otra persona de la red"}</Badge>
                {n.cuidadorId === user?.id && (
                  <div className="flex gap-0.5">
                    <Btn variant="ghost" size="sm" aria-label="Editar nota" onClick={() => setForm(n)}>
                      <Pencil size={16} aria-hidden />
                    </Btn>
                    <Btn variant="ghost" size="sm" aria-label="Eliminar nota" onClick={() => borrar(n)}>
                      <Trash2 size={16} aria-hidden />
                    </Btn>
                  </div>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormNota({ adultoMayorId, inicial, onDone }: { adultoMayorId: string; inicial: Nota | null; onDone: () => void }) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [contenido, setContenido] = useState(inicial?.contenido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (inicial) await updateNota(inicial.id, { titulo, contenido });
      else await createNota({ titulo, contenido, usuarioId: adultoMayorId });
      onDone();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>
        <Field label="Nota">
          <Textarea required value={contenido} onChange={(e) => setContenido(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>
          Guardar
        </Btn>
      </form>
    </Card>
  );
}
