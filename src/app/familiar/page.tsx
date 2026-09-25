"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MailPlus } from "lucide-react";
import { Usuario, getAdultosMayoresVinculados, getUsuarioById, mensajeDeError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import CuidadorShell from "@/components/CuidadorShell";
import ResumenHoy from "@/components/care/ResumenHoy";
import MedicacionManager from "@/components/care/MedicacionManager";
import { CondicionesManager, ContactosManager, MedidasAnticipadas } from "@/components/care/FichaManagers";
import { HistorialManager, NotasManager } from "@/components/care/RegistrosManagers";
import { AlertasCuidador } from "@/components/care/AlertasPanel";
import NotificacionesConfig from "@/components/care/NotificacionesConfig";
import DatosPulsera from "@/components/DatosPulsera";
import { Card, ErrorText, Loading, PageLoading, Select } from "@/components/ui";

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "alertas", label: "Alertas" },
  { key: "medicacion", label: "Medicación" },
  { key: "ficha", label: "Ficha de salud" },
  { key: "pulsera", label: "Pulsera" },
  { key: "historial", label: "Historial" },
  { key: "notas", label: "Notas" },
  { key: "avisos", label: "Mis avisos" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function FamiliarPanel() {
  const { user, ready } = useRequireAuth("FAMILIAR");
  const [adultos, setAdultos] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("resumen");
  const [medidas, setMedidas] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getAdultosMayoresVinculados(user.id)
      .then((l) => {
        setAdultos(l);
        const guardado = window.localStorage.getItem("nonos_adulto_activo");
        setSeleccionado(l.find((a) => a.id === guardado)?.id ?? l[0]?.id ?? null);
      })
      .catch((e) => setError(mensajeDeError(e, "No se pudieron cargar tus adultos mayores.")))
      .finally(() => setCargando(false));
  }, [user]);

  const cargarMedidas = useCallback(() => {
    if (seleccionado) getUsuarioById(seleccionado).then((u) => setMedidas(u.medidasAnticipadas ?? "")).catch(() => setMedidas(""));
  }, [seleccionado]);
  useEffect(cargarMedidas, [cargarMedidas]);

  if (!ready || !user) return <PageLoading />;
  const adulto = adultos.find((a) => a.id === seleccionado) ?? null;

  return (
    <CuidadorShell>
      {cargando && <Loading />}
      <ErrorText>{error}</ErrorText>

      {!cargando && adultos.length === 0 && !error && (
        <Card className="flex flex-col items-start gap-3">
          <h1 className="text-2xl font-bold text-[#181C1B]">Todavía no acompañás a nadie</h1>
          <p className="text-[#3F4947]">El vínculo se crea con una invitación aceptada por las dos partes. Pedile a la persona que te invite, o enviale vos una solicitud.</p>
          <Link href="/invitaciones" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#25665F] px-5 font-semibold text-white"><MailPlus size={18} aria-hidden /> Ir a invitaciones</Link>
        </Card>
      )}

      {adulto && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#3F4947]">Acompañás a</p>
              <h1 className="text-3xl font-bold text-[#181C1B]">{adulto.nombreCompleto}</h1>
              {adulto.telefono && <a href={`tel:${adulto.telefono}`} className="text-sm font-medium text-[#25665F] underline">Llamar: {adulto.telefono}</a>}
            </div>
            {adultos.length > 1 && (
              <div className="w-full sm:w-64">
                <Select
                  aria-label="Adulto mayor"
                  value={adulto.id}
                  onChange={(e) => {
                    setSeleccionado(e.target.value);
                    window.localStorage.setItem("nonos_adulto_activo", e.target.value);
                  }}
                >
                  {adultos.map((a) => <option key={a.id} value={a.id}>{a.nombreCompleto}</option>)}
                </Select>
              </div>
            )}
          </div>

          <div role="tablist" aria-label="Secciones" className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === t.key ? "bg-[#25665F] text-white" : "border border-[#E0E4E3] bg-white text-[#3F4947]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="flex flex-col gap-8" key={`${adulto.id}-${tab}`}>
            {tab === "resumen" && <ResumenHoy adultoMayorId={adulto.id} nombre={adulto.nombreCompleto} />}
            {tab === "alertas" && <AlertasCuidador adultoMayorId={adulto.id} nombre={adulto.nombreCompleto} />}
            {tab === "medicacion" && <MedicacionManager adultoMayorId={adulto.id} canEdit />}
            {tab === "ficha" && (
              <>
                <CondicionesManager adultoMayorId={adulto.id} canEdit />
                <ContactosManager adultoMayorId={adulto.id} canEdit />
                <MedidasAnticipadas adultoMayorId={adulto.id} inicial={medidas} canEdit={false} />
              </>
            )}
            {tab === "pulsera" && <DatosPulsera usuarioId={adulto.id} />}
            {tab === "historial" && <HistorialManager adultoMayorId={adulto.id} />}
            {tab === "notas" && <NotasManager adultoMayorId={adulto.id} />}
            {tab === "avisos" && <NotificacionesConfig familiarId={user.id} adultoMayorId={adulto.id} nombre={adulto.nombreCompleto} />}
          </div>
        </>
      )}
    </CuidadorShell>
  );
}
