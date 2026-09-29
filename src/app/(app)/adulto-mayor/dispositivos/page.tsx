"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { CircleDot, Copy, Database, KeyRound, Link2, RefreshCw, TriangleAlert, Unlink, Watch } from "lucide-react";
import {
  Dispositivo,
  EstadoHistorico,
  deleteDispositivo,
  getDispositivos,
  getGoogleHealthAuthUrl,
  getSyncHistorico,
  iniciarSyncHistorico,
  mensajeDeError,
  registrarBotonFisico,
  syncDispositivo,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import DatosPulsera from "@/components/DatosPulsera";
import { useConfirm, useToast } from "@/components/feedback";
import { Volver } from "@/components/Volver";
import {
  Badge,
  Btn,
  Card,
  Collapsible,
  Empty,
  ErrorText,
  Field,
  IconBubble,
  Input,
  Notice,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Select,
  SkeletonList,
  formatFecha,
  tiempoRelativo,
} from "@/components/ui";

const DESDE_OPCIONES = [
  { key: "todo", label: "Todo lo que tenga Google (desde 2015)", desde: undefined },
  { key: "2a", label: "Últimos 2 años", desde: () => new Date(Date.now() - 2 * 365 * 86400000) },
  { key: "1a", label: "Último año", desde: () => new Date(Date.now() - 365 * 86400000) },
  { key: "3m", label: "Últimos 3 meses", desde: () => new Date(Date.now() - 90 * 86400000) },
  { key: "otra", label: "Elegir una fecha…", desde: undefined },
] as const;

export default function DispositivosPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const confirmar = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Dispositivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [idBoton, setIdBoton] = useState("");
  const [secreto, setSecreto] = useState<string | null>(null);
  const [conexion, setConexion] = useState<"ok" | "fallo" | null>(null);
  const [resultadoSync, setResultadoSync] = useState<{ insertadas: number; tiposConError: string[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [desdeKey, setDesdeKey] = useState<(typeof DESDE_OPCIONES)[number]["key"]>("todo");
  const [desdeFecha, setDesdeFecha] = useState("");
  const [historico, setHistorico] = useState<EstadoHistorico | null>(null);
  const [abrirHistorico, setAbrirHistorico] = useState(false);

  // El backend redirige acá al terminar la vinculación con Google: ?conectado=1 (ok) o ?conectado=0 (canceló o falló).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("conectado");
    if (p === null) return;
    setConexion(p === "1" ? "ok" : "fallo");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await getDispositivos(user.id));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [user]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const fitbit = items.filter((d) => d.tipo === "FITBIT_AIR");
  const botones = items.filter((d) => d.tipo === "BOTON_FISICO");
  const dispositivoId = fitbit[0]?.id;

  // Estado de la última carga histórica (vive en memoria del backend: 404 si no hay ninguna).
  useEffect(() => {
    if (!dispositivoId) return;
    getSyncHistorico(dispositivoId).then(setHistorico).catch(() => {});
  }, [dispositivoId]);

  const enCurso = historico?.estado === "EN_CURSO";
  useEffect(() => {
    if (!enCurso || !dispositivoId) return;
    const t = setInterval(async () => {
      try {
        const e = await getSyncHistorico(dispositivoId);
        setHistorico(e);
        if (e.estado !== "EN_CURSO") {
          setRefreshKey((k) => k + 1);
          cargar();
          if (e.estado === "TERMINADO") toast.ok(`Historial cargado: ${e.insertadas.toLocaleString("es-AR")} mediciones nuevas.`);
        }
      } catch {
        /* se reintenta */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [enCurso, dispositivoId, cargar, toast]);

  if (!ready || !user) return null;
  const usuarioId = user.id;

  async function conectarFitbit() {
    setOcupado("fitbit");
    setError(null);
    try {
      window.location.href = await getGoogleHealthAuthUrl(usuarioId);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo iniciar la conexión con Google Health."));
      setOcupado(null);
    }
  }

  async function sync(d: Dispositivo) {
    setOcupado(d.id);
    setError(null);
    setResultadoSync(null);
    try {
      setResultadoSync(await syncDispositivo(d.id));
      setRefreshKey((k) => k + 1);
      await cargar();
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 409) {
        setError("Google Health pidió que vuelvas a conectar la pulsera para seguir sincronizando.");
        await cargar();
      } else setError(mensajeDeError(e, "No se pudo sincronizar."));
    } finally {
      setOcupado(null);
    }
  }

  async function cargarHistorial(d: Dispositivo) {
    setError(null);
    setOcupado(`hist-${d.id}`);
    try {
      const opcion = DESDE_OPCIONES.find((o) => o.key === desdeKey)!;
      const desde = desdeKey === "otra" ? (desdeFecha ? new Date(desdeFecha).toISOString() : undefined) : typeof opcion.desde === "function" ? opcion.desde().toISOString() : undefined;
      await iniciarSyncHistorico(d.id, desde);
      setHistorico(await getSyncHistorico(d.id));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo iniciar la carga del historial."));
    } finally {
      setOcupado(null);
      // Si Google rechazó el permiso, el dispositivo pasó a "hay que reconectarlo".
      cargar();
    }
  }

  async function desvincular(d: Dispositivo) {
    const esBoton = d.tipo === "BOTON_FISICO";
    const ok = await confirmar({
      title: esBoton ? "¿Desvincular este botón?" : "¿Desvincular la pulsera?",
      message: esBoton ? "El botón deja de poder enviar pedidos de ayuda." : "Se borran los permisos guardados y dejan de llegar datos nuevos. Las mediciones ya recibidas se conservan.",
      confirmLabel: "Desvincular",
      icon: Unlink,
    });
    if (!ok) return;
    try {
      await deleteDispositivo(d.id);
      toast.ok("Dispositivo desvinculado.");
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  async function registrarBoton(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOcupado("boton");
    try {
      const r = await registrarBotonFisico({ usuarioId, identificadorExterno: idBoton.trim() });
      setSecreto(r.secreto);
      setIdBoton("");
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo registrar el botón."));
    } finally {
      setOcupado(null);
    }
  }

  const progreso =
    historico && enCurso
      ? (new Date(historico.progresoHasta).getTime() - new Date(historico.desde).getTime()) / Math.max(1, new Date(historico.hasta).getTime() - new Date(historico.desde).getTime())
      : 0;

  return (
    <>
      <Volver />
      <PageHeader title="Pulsera y botón" subtitle="Tus dispositivos de cuidado: el botón de emergencia y la pulsera que mide tu salud." />

      {conexion === "ok" && (
        <Notice tone="ok" title="¡Tu pulsera quedó conectada!" onClose={() => setConexion(null)}>
          Tocá “Sincronizar” para traer tus primeras mediciones desde Google Health.
        </Notice>
      )}
      {conexion === "fallo" && (
        <Notice tone="danger" title="No pudimos conectar tu pulsera" onClose={() => setConexion(null)}>
          Cancelaste el permiso o Google no respondió. Podés intentarlo de nuevo con el botón “Conectar con Google Health”.
        </Notice>
      )}
      <ErrorText>{error}</ErrorText>
      {cargando && <SkeletonList rows={2} />}

      {/* Botón de emergencia */}
      <section className="flex flex-col gap-3">
        <SectionTitle icon={CircleDot}>Botón de emergencia</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-2">El botón físico envía la misma alerta que el botón de la pantalla.</p>
        {botones.map((d) => (
          <Card key={d.id} className="flex animate-pop items-center justify-between gap-3 !p-4">
            <div className="flex items-center gap-3.5">
              <IconBubble icon={CircleDot} tone="danger" size={46} />
              <div>
                <p className="font-bold text-ink">{d.identificadorExterno}</p>
                <p className="text-xs text-ink-3">Vinculado el {formatFecha(d.fechaVinculacion)}</p>
              </div>
            </div>
            <Btn variant="danger" size="sm" onClick={() => desvincular(d)}>
              Desvincular
            </Btn>
          </Card>
        ))}
        {!cargando && botones.length === 0 && (
          <Empty icon={CircleDot} title="No hay ningún botón registrado">
            Registrá el identificador del botón para que sus pedidos de ayuda lleguen a tu red.
          </Empty>
        )}

        {secreto && (
          <Card className="flex animate-pop flex-col gap-3 !border-2 !border-brand">
            <p className="flex items-center gap-2 font-bold text-ink">
              <KeyRound size={20} className="text-brand" aria-hidden /> Copiá esta clave ahora
            </p>
            <p className="text-sm text-ink-2">Es la clave que el botón usa para identificarse. Por seguridad no se vuelve a mostrar.</p>
            <code className="break-all rounded-xl bg-surface-2 p-3 text-sm text-ink">{secreto}</code>
            <div className="flex flex-wrap gap-2">
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(secreto);
                  toast.ok("Clave copiada.");
                }}
              >
                <Copy size={16} aria-hidden /> Copiar
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setSecreto(null)}>
                Ya la guardé
              </Btn>
            </div>
          </Card>
        )}

        <Card>
          <form onSubmit={registrarBoton} className="flex flex-col gap-3">
            <Field label="Identificador del botón" hint="Figura en el dispositivo (por ejemplo su código o dirección MAC).">
              <Input required value={idBoton} onChange={(e) => setIdBoton(e.target.value)} />
            </Field>
            <Btn type="submit" loading={ocupado === "boton"} className="self-start">
              Registrar botón
            </Btn>
          </form>
        </Card>
      </section>

      {/* Pulsera */}
      <section className="flex flex-col gap-3">
        <SectionTitle icon={Watch}>Pulsera inteligente (Fitbit)</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-2">
          Compartís solo los datos que autorices en Google Health. Se usan para detectar cambios importantes y avisar a tu red cuando haga falta.
        </p>

        {fitbit.map((d) => (
          <Card key={d.id} className="flex animate-pop flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <IconBubble icon={Watch} tone={d.requiereReautenticacion ? "accent" : "ok"} size={52} />
                <div>
                  <p className="text-lg font-bold text-ink">Fitbit Air</p>
                  <p className="text-sm text-ink-2">
                    {d.ultimaSincronizacion ? (
                      <>
                        Última sincronización {tiempoRelativo(d.ultimaSincronizacion)} <span className="text-ink-3">({formatFecha(d.ultimaSincronizacion, true)})</span>
                      </>
                    ) : (
                      "Todavía no sincronizó"
                    )}
                  </p>
                </div>
              </div>
              {d.requiereReautenticacion ? (
                <Badge tone="warn">
                  <TriangleAlert size={13} aria-hidden /> Hay que reconectarla
                </Badge>
              ) : (
                <Badge tone="ok">Conectada</Badge>
              )}
            </div>

            {d.requiereReautenticacion && (
              <Notice tone="warn" title="Google Health necesita tu permiso otra vez">
                Mientras tanto no llegan datos nuevos ni se generan alertas de la pulsera.
              </Notice>
            )}

            <div className="flex flex-wrap gap-2">
              <Btn loading={ocupado === d.id} disabled={d.requiereReautenticacion} onClick={() => sync(d)}>
                <RefreshCw size={18} aria-hidden /> Sincronizar
              </Btn>
              <Btn variant="secondary" onClick={() => setAbrirHistorico((v) => !v)} aria-expanded={abrirHistorico} disabled={d.requiereReautenticacion}>
                <Database size={18} aria-hidden /> Cargar historial completo
              </Btn>
              <Btn variant="danger" onClick={() => desvincular(d)}>
                <Unlink size={18} aria-hidden /> Desvincular
              </Btn>
            </div>

            {resultadoSync && (
              <Notice tone={resultadoSync.tiposConError.length ? "warn" : "ok"} onClose={() => setResultadoSync(null)}>
                Sincronización lista: se importaron <strong>{resultadoSync.insertadas.toLocaleString("es-AR")}</strong> mediciones nuevas.
                {resultadoSync.tiposConError.length > 0 && <> No se pudieron traer: {resultadoSync.tiposConError.join(", ")}.</>}
              </Notice>
            )}

            <Collapsible open={abrirHistorico || enCurso}>
              <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
                <p className="text-sm leading-relaxed text-ink-2">
                  Trae de Google Health todo el historial de la pulsera (en tramos de 90 días). Puede tardar varios minutos y <strong>no genera alertas</strong>. Se puede repetir sin
                  duplicar datos.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Desde cuándo">
                    <Select value={desdeKey} onChange={(e) => setDesdeKey(e.target.value as typeof desdeKey)} disabled={enCurso}>
                      {DESDE_OPCIONES.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {desdeKey === "otra" && (
                    <Field label="Fecha de inicio">
                      <Input type="date" max={new Date().toISOString().slice(0, 10)} value={desdeFecha} onChange={(e) => setDesdeFecha(e.target.value)} disabled={enCurso} />
                    </Field>
                  )}
                </div>
                <Btn loading={ocupado === `hist-${d.id}` || enCurso} disabled={enCurso || (desdeKey === "otra" && !desdeFecha)} onClick={() => cargarHistorial(d)} className="self-start">
                  {enCurso ? "Cargando…" : "Empezar la carga"}
                </Btn>

                {historico && (
                  <div className="flex flex-col gap-2" role="status">
                    {enCurso && (
                      <>
                        <ProgressBar value={progreso} label="Avance de la carga del historial" />
                        <p className="text-sm text-ink-2">
                          Llegó hasta <strong>{formatFecha(historico.progresoHasta)}</strong> · {Math.round(progreso * 100)}% · {historico.insertadas.toLocaleString("es-AR")} mediciones importadas.
                        </p>
                      </>
                    )}
                    {historico.estado === "TERMINADO" && (
                      <Notice tone={historico.tiposConError.length ? "warn" : "ok"}>
                        Historial cargado: <strong>{historico.insertadas.toLocaleString("es-AR")}</strong> mediciones nuevas.
                        {historico.tiposConError.length > 0 && <> No se pudieron traer: {historico.tiposConError.join(", ")}.</>}
                      </Notice>
                    )}
                    {historico.estado === "ERROR" && (
                      <Notice tone="danger" title="La carga falló">
                        {historico.error ?? "Google Health rechazó las consultas."}
                        {historico.tiposConError.length > 0 && <> Sin datos de: {historico.tiposConError.join(", ")}.</>} Probá con una fecha de inicio más cercana.
                      </Notice>
                    )}
                  </div>
                )}
              </div>
            </Collapsible>
          </Card>
        ))}

        <Btn variant={fitbit.length ? "secondary" : "primary"} size="lg" loading={ocupado === "fitbit"} onClick={conectarFitbit}>
          <Link2 size={20} aria-hidden /> {fitbit.length ? "Reconectar con Google Health" : "Conectar con Google Health"}
        </Btn>
      </section>

      {fitbit.length > 0 && <DatosPulsera usuarioId={usuarioId} refreshKey={refreshKey} />}
    </>
  );
}
