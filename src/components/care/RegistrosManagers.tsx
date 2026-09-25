"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Btn, Card, Empty, ErrorText, Field, formatDia, formatFecha, Input, Loading, SectionTitle, Textarea } from "@/components/ui";

const aInputDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

/* ───────── Historial de acontecimientos relevantes ───────── */

export function HistorialManager({ adultoMayorId }: { adultoMayorId: string }) {
  const { user } = useAuth();
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
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await deleteHistorial(ev.id);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        action={<Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>{form ? "Cancelar" : (<><Plus size={18} aria-hidden /> Registrar</>)}</Btn>}
      >
        Historial de acontecimientos
      </SectionTitle>
      <p className="text-sm text-[#3F4947]">Episodios, consultas o situaciones importantes, para que no queden solo en la memoria de una persona. No reemplaza una historia clínica.</p>
      <ErrorText>{error}</ErrorText>
      {form && <FormEvento key={form === "nuevo" ? "n" : form.id} adultoMayorId={adultoMayorId} inicial={form === "nuevo" ? null : form} onDone={() => { setForm(null); cargar(); }} />}
      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>Todavía no hay acontecimientos registrados.</Empty>}
      <ol className="flex flex-col gap-3 border-l-2 border-[#BFC9C6] pl-4">
        {items.map((ev) => {
          const mio = ev.authorId === user?.id;
          return (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[1.4rem] top-2 h-3 w-3 rounded-full bg-[#25665F]" aria-hidden />
              <Card className="flex flex-col gap-1 !p-4">
                <p className="text-sm font-semibold text-[#25665F]">
                  {formatDia(ev.fecha)}
                  {ev.fechaFin && <> → {formatDia(ev.fechaFin)}</>}
                </p>
                <p className="text-[#181C1B]">{ev.descripcion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6F7977]">{mio ? "Registrado por vos" : "Registrado por otra persona de la red"}</span>
                  {mio && (
                    <div className="flex gap-1">
                      <Btn variant="ghost" aria-label="Editar" onClick={() => setForm(ev)}><Pencil size={16} aria-hidden /></Btn>
                      <Btn variant="ghost" aria-label="Eliminar" onClick={() => borrar(ev)}><Trash2 size={16} aria-hidden /></Btn>
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
        <Field label="¿Qué ocurrió?"><Textarea required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej.: Internación por neumonía" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha"><Input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Hasta (opcional)"><Input type="date" min={fecha} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>Guardar</Btn>
      </form>
    </Card>
  );
}

/* ───────── Notas entre cuidadores ───────── */

export function NotasManager({ adultoMayorId }: { adultoMayorId: string }) {
  const { user } = useAuth();
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
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      await deleteNota(n.id);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        action={<Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>{form ? "Cancelar" : (<><Plus size={18} aria-hidden /> Nueva nota</>)}</Btn>}
      >
        Notas compartidas
      </SectionTitle>
      <p className="text-sm text-[#3F4947]">Lo que un cuidador quiere que sepa el resto de la red. Solo quien la escribió puede editarla.</p>
      <ErrorText>{error}</ErrorText>
      {form && <FormNota key={form === "nuevo" ? "n" : form.id} adultoMayorId={adultoMayorId} inicial={form === "nuevo" ? null : form} onDone={() => { setForm(null); cargar(); }} />}
      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>No hay notas todavía.</Empty>}
      <ul className="flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id}>
            <Card className="!p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[#181C1B]">{n.titulo}</p>
                <span className="shrink-0 text-xs text-[#6F7977]">{formatFecha(n.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[#3F4947]">{n.contenido}</p>
              <p className="mt-1 text-xs text-[#6F7977]">{n.cuidadorId === user?.id ? "Escrita por vos" : "Escrita por otra persona de la red"}</p>
              {n.cuidadorId === user?.id && (
                <div className="mt-2 flex gap-2">
                  <Btn variant="secondary" onClick={() => setForm(n)}>Editar</Btn>
                  <Btn variant="danger" onClick={() => borrar(n)}>Eliminar</Btn>
                </div>
              )}
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
        <Field label="Título"><Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
        <Field label="Nota"><Textarea required value={contenido} onChange={(e) => setContenido(e.target.value)} /></Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>Guardar</Btn>
      </form>
    </Card>
  );
}
