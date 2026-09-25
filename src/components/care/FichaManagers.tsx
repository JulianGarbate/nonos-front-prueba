"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Phone, Pencil, Trash2, ShieldCheck } from "lucide-react";
import {
  CondicionMedica,
  Contacto,
  createCondicion,
  createContacto,
  deleteCondicion,
  deleteContacto,
  editarMedidasAnticipadas,
  getCondiciones,
  getContactos,
  mensajeDeError,
  updateCondicion,
  updateContacto,
} from "@/lib/api";
import { Btn, Card, Empty, ErrorText, Field, Input, Loading, SectionTitle, Textarea } from "@/components/ui";

/* ───────── Condiciones y alergias ───────── */

export function CondicionesManager({ adultoMayorId, canEdit }: { adultoMayorId: string; canEdit: boolean }) {
  const [items, setItems] = useState<CondicionMedica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<CondicionMedica | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await getCondiciones(adultoMayorId));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [adultoMayorId]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrar(c: CondicionMedica) {
    if (!confirm(`¿Eliminar "${c.nombre}"?`)) return;
    try {
      await deleteCondicion(c.id);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        action={canEdit && <Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>{form ? "Cancelar" : (<><Plus size={18} aria-hidden /> Agregar</>)}</Btn>}
      >
        Condiciones y alergias
      </SectionTitle>
      <p className="text-sm text-[#3F4947]">Solo lo relevante para el cuidado y para una emergencia. Las alergias se cargan acá también (ej. “Alergia a la penicilina”).</p>
      <ErrorText>{error}</ErrorText>
      {form && <FormCondicion key={form === "nuevo" ? "n" : form.id} adultoMayorId={adultoMayorId} inicial={form === "nuevo" ? null : form} onDone={() => { setForm(null); cargar(); }} />}
      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>No hay condiciones ni alergias cargadas.</Empty>}
      <ul className="flex flex-col gap-2">
        {items.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#E0E4E3] bg-white p-4">
            <div>
              <p className="font-semibold text-[#181C1B]">{c.nombre}</p>
              {c.descripcion && <p className="text-sm text-[#3F4947]">{c.descripcion}</p>}
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Btn variant="ghost" aria-label={`Editar ${c.nombre}`} onClick={() => setForm(c)}><Pencil size={18} aria-hidden /></Btn>
                <Btn variant="ghost" aria-label={`Eliminar ${c.nombre}`} onClick={() => borrar(c)}><Trash2 size={18} aria-hidden /></Btn>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormCondicion({ adultoMayorId, inicial, onDone }: { adultoMayorId: string; inicial: CondicionMedica | null; onDone: () => void }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (inicial) await updateCondicion(inicial.id, { nombre, descripcion });
      else await createCondicion({ nombre, descripcion, usuarioId: adultoMayorId });
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
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Hipertensión / Alergia a la penicilina" /></Field>
        <Field label="Detalle (opcional)"><Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>Guardar</Btn>
      </form>
    </Card>
  );
}

/* ───────── Contactos telefónicos ───────── */

export function ContactosManager({ adultoMayorId, canEdit }: { adultoMayorId: string; canEdit: boolean }) {
  const [items, setItems] = useState<Contacto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Contacto | "nuevo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await getContactos(adultoMayorId));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [adultoMayorId]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function borrar(c: Contacto) {
    if (!confirm(`¿Eliminar a ${c.nombre}?`)) return;
    try {
      await deleteContacto(c.id);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        action={canEdit && <Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>{form ? "Cancelar" : (<><Plus size={18} aria-hidden /> Agregar</>)}</Btn>}
      >
        Contactos telefónicos
      </SectionTitle>
      <p className="text-sm text-[#3F4947]">Personas para llamar que no necesitan cuenta en NONOS (vecinos, amigos, otros familiares).</p>
      <ErrorText>{error}</ErrorText>
      {form && <FormContacto key={form === "nuevo" ? "n" : form.id} adultoMayorId={adultoMayorId} inicial={form === "nuevo" ? null : form} onDone={() => { setForm(null); cargar(); }} />}
      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>No hay contactos cargados.</Empty>}
      <ul className="flex flex-col gap-2">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E0E4E3] bg-white p-4">
            <div>
              <p className="font-semibold text-[#181C1B]">{c.nombre}</p>
              <a href={`tel:${c.telefono}`} className="flex items-center gap-1 text-sm font-medium text-[#25665F] underline">
                <Phone size={14} aria-hidden /> {c.telefono}
              </a>
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Btn variant="ghost" aria-label={`Editar ${c.nombre}`} onClick={() => setForm(c)}><Pencil size={18} aria-hidden /></Btn>
                <Btn variant="ghost" aria-label={`Eliminar ${c.nombre}`} onClick={() => borrar(c)}><Trash2 size={18} aria-hidden /></Btn>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormContacto({ adultoMayorId, inicial, onDone }: { adultoMayorId: string; inicial: Contacto | null; onDone: () => void }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (inicial) await updateContacto(inicial.id, { nombre, telefono });
      else await createContacto({ nombre, telefono, usuarioId: adultoMayorId });
      onDone();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }
  return (
    <Card>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre"><Input required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
        <Field label="Teléfono"><Input required type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
        <div className="sm:col-span-2 flex flex-col gap-3">
          <ErrorText>{error}</ErrorText>
          <Btn type="submit" loading={guardando}>Guardar</Btn>
        </div>
      </form>
    </Card>
  );
}

/* ───────── Medidas anticipadas ───────── */

export function MedidasAnticipadas({
  adultoMayorId,
  inicial,
  canEdit,
  onSaved,
}: {
  adultoMayorId: string;
  inicial: string | null | undefined;
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const [texto, setTexto] = useState(inicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTexto(inicial ?? ""), [inicial]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setOk(false);
    setError(null);
    try {
      await editarMedidasAnticipadas(adultoMayorId, texto);
      setOk(true);
      onSaved?.();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Medidas anticipadas</SectionTitle>
      <p className="text-sm text-[#3F4947]">
        Preferencias que la persona deja asentadas para una emergencia en la que no pueda comunicarse. Se muestran en el perfil de emergencia. NONOS no define protocolos médicos: solo registra y pone a disposición lo que se escriba acá.
      </p>
      {canEdit ? (
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Medidas anticipadas" placeholder="Ej.: Avisar primero a mi hija Ana. Prefiero ser atendida en el Hospital Italiano." />
          <ErrorText>{error}</ErrorText>
          {ok && <p role="status" className="flex items-center gap-1 text-sm font-medium text-[#25665F]"><ShieldCheck size={16} aria-hidden /> Guardado.</p>}
          <Btn type="submit" loading={guardando} className="self-start">Guardar</Btn>
        </form>
      ) : texto ? (
        <p className="whitespace-pre-wrap rounded-xl bg-[#F1F4F2] p-4 text-[#181C1B]">{texto}</p>
      ) : (
        <Empty>No dejó medidas anticipadas.</Empty>
      )}
    </div>
  );
}
