"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, FileHeart, LayoutDashboard, MailPlus, NotebookPen, Phone, Pill, ScrollText, SlidersHorizontal, Watch, Users, type LucideIcon } from "lucide-react";
import { Usuario, getAdultosMayoresVinculados, getUsuarioById, mensajeDeError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import ResumenHoy from "@/components/care/ResumenHoy";
import MedicacionManager from "@/components/care/MedicacionManager";
import { CondicionesManager, ContactosManager, MedidasAnticipadas } from "@/components/care/FichaManagers";
import { HistorialManager, NotasManager } from "@/components/care/RegistrosManagers";
import { AlertasCuidador, useAlertas } from "@/components/care/AlertasPanel";
import NotificacionesConfig from "@/components/care/NotificacionesConfig";
import DatosPulsera from "@/components/DatosPulsera";
import { Avatar, Card, ErrorText, Empty, Skeleton, Tabs, cx } from "@/components/ui";

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "resumen", label: "Resumen", icon: LayoutDashboard },
  { key: "alertas", label: "Alertas", icon: BellRing },
  { key: "medicacion", label: "Medicación", icon: Pill },
  { key: "ficha", label: "Ficha de salud", icon: FileHeart },
  { key: "pulsera", label: "Pulsera", icon: Watch },
  { key: "historial", label: "Historial", icon: ScrollText },
  { key: "notas", label: "Notas", icon: NotebookPen },
  { key: "avisos", label: "Mis avisos", icon: SlidersHorizontal },
];
type TabKey = string;

const edad = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 86400000)) : null);

export default function FamiliarPanel() {
  const { user, ready } = useRequireAuth("FAMILIAR");
  const [adultos, setAdultos] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("resumen");
  const [medidas, setMedidas] = useState<string | null>(null);

  // La pestaña activa vive en el hash (#alertas): sirve para volver, recargar y enlazar desde los avisos.
  useEffect(() => {
    const desdeHash = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.key === h)) setTab(h);
    };
    desdeHash();
    window.addEventListener("hashchange", desdeHash);
    return () => window.removeEventListener("hashchange", desdeHash);
  }, []);

  function cambiarTab(k: TabKey) {
    setTab(k);
    window.history.replaceState(null, "", `#${k}`);
  }

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

  const adulto = adultos.find((a) => a.id === seleccionado) ?? null;

  if (!ready || !user) return null;

  return (
    <>
      {cargando && (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="h-72" />
          <Skeleton className="h-96" />
        </div>
      )}
      <ErrorText>{error}</ErrorText>

      {!cargando && adultos.length === 0 && !error && (
        <Card className="mx-auto flex max-w-xl animate-pop flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-20 w-20 animate-float items-center justify-center rounded-full bg-brand-soft text-brand">
            <Users size={38} aria-hidden />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Todavía no acompañás a nadie</h1>
          <p className="max-w-md leading-relaxed text-ink-2">
            El vínculo se crea con una invitación aceptada por las dos partes. Pedile a la persona que te invite, o enviale vos una solicitud.
          </p>
          <Link href="/invitaciones" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-6 font-semibold text-on-brand shadow-md transition hover:-translate-y-0.5 hover:bg-brand-hover active:scale-95">
            <MailPlus size={18} aria-hidden /> Ir a invitaciones
          </Link>
        </Card>
      )}

      {adulto && <PanelAdulto key={adulto.id} adulto={adulto} adultos={adultos} tab={tab} cambiarTab={cambiarTab} medidas={medidas} cargarMedidas={cargarMedidas} userId={user.id} onSelect={(id) => {
        setSeleccionado(id);
        window.localStorage.setItem("nonos_adulto_activo", id);
      }} />}
    </>
  );
}

function PanelAdulto({
  adulto,
  adultos,
  tab,
  cambiarTab,
  medidas,
  cargarMedidas,
  userId,
  onSelect,
}: {
  adulto: Usuario;
  adultos: Usuario[];
  tab: TabKey;
  cambiarTab: (k: TabKey) => void;
  medidas: string | null;
  cargarMedidas: () => void;
  userId: string;
  onSelect: (id: string) => void;
}) {
  const { items: alertas } = useAlertas(adulto.id, 60_000);
  const pendientes = useMemo(() => alertas.filter((a) => a.estado === "PENDIENTE" && a.tipo !== "LOGRO_POSITIVO").length, [alertas]);
  const hayCritica = alertas.some((a) => a.estado === "PENDIENTE" && a.categoria === "CRITICO");
  const años = edad(adulto.fechaNacimiento);

  const tabs = TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon, badge: t.key === "alertas" ? pendientes || undefined : undefined }));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
      {/* Columna lateral (escritorio) / cabecera (móvil) */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <Card className="flex flex-col gap-4 !p-5">
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            <span className="relative">
              <Avatar nombre={adulto.nombreCompleto} size={64} />
              <span
                aria-label={hayCritica ? "Con alertas críticas" : "Sin alertas críticas"}
                className={cx("absolute bottom-0 right-0 h-4 w-4 rounded-full ring-[3px] ring-surface", hayCritica ? "animate-pulse bg-danger-fill" : "bg-brand")}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-3">Acompañás a</p>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-ink">{adulto.nombreCompleto}</h1>
              <p className="text-sm text-ink-2">{años != null ? `${años} años` : "Adulto mayor"}</p>
            </div>
          </div>
          {adulto.telefono && (
            <a
              href={`tel:${adulto.telefono}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-soft px-4 text-sm font-bold text-brand-ink transition hover:bg-brand hover:text-on-brand active:scale-95"
            >
              <Phone size={16} aria-hidden /> Llamar: {adulto.telefono}
            </a>
          )}
          {adultos.length > 1 && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-3">Cambiar de persona</p>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                {adultos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a.id)}
                    aria-pressed={a.id === adulto.id}
                    className={cx(
                      "flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-left text-sm font-semibold transition-all active:scale-95",
                      a.id === adulto.id ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink-2 hover:border-line-strong",
                    )}
                  >
                    <Avatar nombre={a.nombreCompleto} size={26} /> {a.nombreCompleto.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Secciones: lista vertical en escritorio */}
        <nav aria-label="Secciones" className="hidden flex-col gap-1 lg:flex">
          {TABS.map((t) => {
            const on = tab === t.key;
            const Icon = t.icon;
            const badge = t.key === "alertas" ? pendientes : 0;
            return (
              <button
                key={t.key}
                onClick={() => cambiarTab(t.key)}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-left text-[0.95rem] font-semibold transition-all duration-200",
                  on ? "bg-brand text-on-brand shadow-md" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                )}
              >
                <Icon size={19} aria-hidden className="transition-transform duration-200 group-hover:scale-110" />
                <span className="flex-1">{t.label}</span>
                {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-fill px-1.5 text-xs font-bold text-white">{badge}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        <Tabs tabs={tabs} value={tab} onChange={cambiarTab} label="Secciones" className="lg:hidden" />

        <div role="tabpanel" className="flex animate-rise flex-col gap-10" key={`${adulto.id}-${tab}`}>
          {tab === "resumen" && <ResumenHoy adultoMayorId={adulto.id} nombre={adulto.nombreCompleto} telefono={adulto.telefono} />}
          {tab === "alertas" && <AlertasCuidador adultoMayorId={adulto.id} nombre={adulto.nombreCompleto} />}
          {tab === "medicacion" && <MedicacionManager adultoMayorId={adulto.id} canEdit />}
          {tab === "ficha" && (
            <>
              <CondicionesManager adultoMayorId={adulto.id} canEdit />
              <ContactosManager adultoMayorId={adulto.id} canEdit />
              <MedidasAnticipadas adultoMayorId={adulto.id} inicial={medidas} canEdit={false} onSaved={cargarMedidas} />
            </>
          )}
          {tab === "pulsera" && <DatosPulsera usuarioId={adulto.id} />}
          {tab === "historial" && <HistorialManager adultoMayorId={adulto.id} />}
          {tab === "notas" && <NotasManager adultoMayorId={adulto.id} />}
          {tab === "avisos" && <NotificacionesConfig familiarId={userId} adultoMayorId={adulto.id} nombre={adulto.nombreCompleto} />}
          {!TABS.some((t) => t.key === tab) && <Empty>Sección no disponible.</Empty>}
        </div>
      </div>
    </div>
  );
}
