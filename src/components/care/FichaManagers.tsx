"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { HeartPulse, Pencil, Phone, Plus, ScrollText, Trash2, UserRound } from "lucide-react";
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
import { useConfirm, useToast } from "@/components/feedback";
import { Btn, Card, Collapsible, Empty, ErrorText, Field, IconBubble, Input, SectionTitle, SkeletonList, Textarea, stagger } from "@/components/ui";

/* ───────── Condiciones y alergias ───────── */

export function CondicionesManager({ adultoMayorId, canEdit }: { adultoMayorId: string; canEdit: boolean }) {
  const confirmar = useConfirm();
  const toast = useToast();
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
    if (!(await confirmar({ title: `¿Eliminar "${c.nombre}"?`, message: "Se quita de la ficha de salud y del perfil de emergencia.", confirmLabel: "Eliminar" }))) return;
    try {
      await deleteCondicion(c.id);
      toast.ok("Se eliminó de la ficha.");
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        icon={HeartPulse}
        action={
          canEdit && (
            <Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>
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
        Condiciones y alergias
      </SectionTitle>
      <p className="text-sm leading-relaxed text-ink-2">
        Solo lo relevante para el cuidado y para una emergencia. Las alergias se cargan acá también (ej. “Alergia a la penicilina”).
      </p>
      <ErrorText>{error}</ErrorText>
      <Collapsible open={!!form}>
        {form && (
          <FormCondicion
            key={form === "nuevo" ? "n" : form.id}
            adultoMayorId={adultoMayorId}
            inicial={form === "nuevo" ? null : form}
            onDone={() => {
              setForm(null);
              toast.ok("Ficha actualizada.");
              cargar();
            }}
          />
        )}
      </Collapsible>
      {cargando && <SkeletonList rows={2} />}
      {!cargando && items.length === 0 && (
        <Empty icon={HeartPulse} title="Sin condiciones ni alergias">
          {canEdit ? "Cargalas para que estén disponibles en una emergencia." : "Todavía no se cargó nada."}
        </Empty>
      )}
      <ul className="flex flex-col gap-2.5">
        {items.map((c, i) => (
          <li key={c.id} className="rise flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card" style={stagger(i)}>
            <div className="flex min-w-0 items-start gap-3.5">
              <IconBubble icon={HeartPulse} tone="danger" size={40} />
              <div className="min-w-0">
                <p className="font-bold text-ink">{c.nombre}</p>
                {c.descripcion && <p className="text-sm leading-relaxed text-ink-2">{c.descripcion}</p>}
              </div>
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-0.5">
                <Btn variant="ghost" size="sm" aria-label={`Editar ${c.nombre}`} onClick={() => setForm(c)}>
                  <Pencil size={18} aria-hidden />
                </Btn>
                <Btn variant="ghost" size="sm" aria-label={`Eliminar ${c.nombre}`} onClick={() => borrar(c)}>
                  <Trash2 size={18} aria-hidden />
                </Btn>
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
        <Field label="Nombre">
          <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Hipertensión / Alergia a la penicilina" />
        </Field>
        <Field label="Detalle (opcional)">
          <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Btn type="submit" loading={guardando}>
          Guardar
        </Btn>
      </form>
    </Card>
  );
}

/* ───────── Contactos telefónicos ───────── */

export function ContactosManager({ adultoMayorId, canEdit }: { adultoMayorId: string; canEdit: boolean }) {
  const confirmar = useConfirm();
  const toast = useToast();
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
    if (!(await confirmar({ title: `¿Eliminar a ${c.nombre}?`, message: "Deja de figurar entre los contactos telefónicos.", confirmLabel: "Eliminar" }))) return;
    try {
      await deleteContacto(c.id);
      toast.ok("Contacto eliminado.");
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  return (
    <div className="@container flex flex-col gap-3">
      <SectionTitle
        icon={Phone}
        action={
          canEdit && (
            <Btn variant={form ? "secondary" : "primary"} onClick={() => setForm(form ? null : "nuevo")}>
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
        Contactos telefónicos
      </SectionTitle>
      <p className="text-sm leading-relaxed text-ink-2">Personas para llamar que no necesitan cuenta en NONOS (vecinos, amigos, otros familiares).</p>
      <ErrorText>{error}</ErrorText>
      <Collapsible open={!!form}>
        {form && (
          <FormContacto
            key={form === "nuevo" ? "n" : form.id}
            adultoMayorId={adultoMayorId}
            inicial={form === "nuevo" ? null : form}
            onDone={() => {
              setForm(null);
              toast.ok("Contacto guardado.");
              cargar();
            }}
          />
        )}
      </Collapsible>
      {cargando && <SkeletonList rows={2} />}
      {!cargando && items.length === 0 && (
        <Empty icon={UserRound} title="No hay contactos">
          {canEdit ? "Sumá a alguien a quien llamar en una urgencia." : "Todavía no se cargó ninguno."}
        </Empty>
      )}
      <ul className="grid gap-2.5 @2xl:grid-cols-2">
        {items.map((c, i) => (
          <li key={c.id} className="rise flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card" style={stagger(i)}>
            <div className="flex min-w-0 items-center gap-3.5">
              <IconBubble icon={UserRound} size={40} />
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{c.nombre}</p>
                <a href={`tel:${c.telefono}`} className="flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                  <Phone size={14} aria-hidden /> {c.telefono}
                </a>
              </div>
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-0.5">
                <Btn variant="ghost" size="sm" aria-label={`Editar ${c.nombre}`} onClick={() => setForm(c)}>
                  <Pencil size={18} aria-hidden />
                </Btn>
                <Btn variant="ghost" size="sm" aria-label={`Eliminar ${c.nombre}`} onClick={() => borrar(c)}>
                  <Trash2 size={18} aria-hidden />
                </Btn>
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
        <Field label="Nombre">
          <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <Input required type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <ErrorText>{error}</ErrorText>
          <Btn type="submit" loading={guardando}>
            Guardar
          </Btn>
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
  const toast = useToast();
  const [texto, setTexto] = useState(inicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTexto(inicial ?? ""), [inicial]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await editarMedidasAnticipadas(adultoMayorId, texto);
      toast.ok("Medidas anticipadas guardadas.");
      onSaved?.();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle icon={ScrollText}>Medidas anticipadas</SectionTitle>
      <p className="text-sm leading-relaxed text-ink-2">
        Preferencias que la persona deja asentadas para una emergencia en la que no pueda comunicarse. Se muestran en el perfil de emergencia. NONOS no define protocolos
        médicos: solo registra y pone a disposición lo que se escriba acá.
      </p>
      {canEdit ? (
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Medidas anticipadas"
            placeholder="Ej.: Avisar primero a mi hija Ana. Prefiero ser atendida en el Hospital Italiano."
          />
          <ErrorText>{error}</ErrorText>
          <Btn type="submit" loading={guardando} className="self-start">
            Guardar
          </Btn>
        </form>
      ) : texto ? (
        <p className="whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 leading-relaxed text-ink">{texto}</p>
      ) : (
        <Empty>No dejó medidas anticipadas.</Empty>
      )}
    </div>
  );
}
