"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Watch, CircleDot, Copy, TriangleAlert } from "lucide-react";
import {
  Dispositivo,
  EstadoHistorico,
  getSyncHistorico,
  iniciarSyncHistorico,
  deleteDispositivo,
  getDispositivos,
  getGoogleHealthAuthUrl,
  mensajeDeError,
  registrarBotonFisico,
  syncDispositivo,
} from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import DatosPulsera from "@/components/DatosPulsera";
import { Badge, Btn, Card, Empty, ErrorText, Field, formatFecha, Input, Loading, PageLoading, SectionTitle } from "@/components/ui";

export default function DispositivosPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [items, setItems] = useState<Dispositivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [idBoton, setIdBoton] = useState("");
  const [secreto, setSecreto] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<{ insertadas: number; tiposConError: string[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [desdeHist, setDesdeHist] = useState("");
  const [historico, setHistorico] = useState<EstadoHistorico | null>(null);


  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("conectado")) setConectado(true);
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

  const dispositivoId = items.find((d) => d.tipo === "FITBIT_AIR")?.id;
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
        }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [enCurso, dispositivoId, cargar]);

  if (!ready || !user) return <PageLoading />;
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
    try {
      setResultadoSync(null);
      setResultadoSync(await syncDispositivo(d.id));
      setRefreshKey((k) => k + 1);
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo sincronizar."));
    } finally {
      setOcupado(null);
    }
  }

  async function cargarHistorial(d: Dispositivo) {
    setError(null);
    setOcupado(`hist-${d.id}`);
    try {
      await iniciarSyncHistorico(d.id, desdeHist || undefined);
      setHistorico(await getSyncHistorico(d.id));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo iniciar la carga del historial."));
    } finally {
      setOcupado(null);
    }
  }

  async function desvincular(d: Dispositivo) {
    if (!confirm("¿Desvincular este dispositivo?")) return;
    try {
      await deleteDispositivo(d.id);
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

  const fitbit = items.filter((d) => d.tipo === "FITBIT_AIR");
  const botones = items.filter((d) => d.tipo === "BOTON_FISICO");

  return (
    <AdultoMayorShell>
      <Link href="/adulto-mayor/mas" className="flex min-h-11 items-center gap-1 font-semibold text-[#25665F]"><ArrowLeft size={18} aria-hidden /> Volver</Link>
      <h1 className="text-3xl font-bold text-[#181C1B]">Pulsera y botón</h1>
      {conectado && <p role="status" className="rounded-xl bg-[#DCF4EF] p-4 font-semibold text-[#1D544E]">Tu pulsera se conectó correctamente con Google Health.</p>}
      <ErrorText>{error}</ErrorText>
      {resultadoSync && (
        <p role="status" className={`rounded-xl p-4 text-sm font-semibold ${resultadoSync.tiposConError.length ? "bg-[#FFDBD1] text-[#98462E]" : "bg-[#DCF4EF] text-[#1D544E]"}`}>
          Sincronización lista: se importaron {resultadoSync.insertadas} mediciones nuevas.
          {resultadoSync.tiposConError.length > 0 && <> No se pudieron traer: {resultadoSync.tiposConError.join(", ")}.</>}
        </p>
      )}
      {cargando && <Loading />}

      <div className="flex flex-col gap-3">
        <SectionTitle>Botón de emergencia</SectionTitle>
        <p className="text-sm text-[#3F4947]">El botón físico envía la misma alerta que el botón de la pantalla.</p>
        {botones.map((d) => (
          <Card key={d.id} className="flex items-center justify-between gap-3 !p-4">
            <div className="flex items-center gap-3"><CircleDot size={22} className="text-[#BA1A1A]" aria-hidden /><div><p className="font-semibold">{d.identificadorExterno}</p><p className="text-xs text-[#6F7977]">Vinculado el {formatFecha(d.fechaVinculacion)}</p></div></div>
            <Btn variant="danger" onClick={() => desvincular(d)}>Desvincular</Btn>
          </Card>
        ))}
        {!cargando && botones.length === 0 && <Empty>No hay ningún botón registrado.</Empty>}

        {secreto && (
          <Card className="flex flex-col gap-2 !border-2 !border-[#25665F]">
            <p className="font-bold text-[#181C1B]">Copiá esta clave ahora</p>
            <p className="text-sm text-[#3F4947]">Es la clave que el botón usa para identificarse. Por seguridad no se vuelve a mostrar.</p>
            <code className="break-all rounded-lg bg-[#F1F4F2] p-3 text-sm">{secreto}</code>
            <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(secreto)}><Copy size={16} aria-hidden /> Copiar</Btn>
            <Btn variant="ghost" onClick={() => setSecreto(null)}>Ya la guardé</Btn>
          </Card>
        )}

        <Card>
          <form onSubmit={registrarBoton} className="flex flex-col gap-3">
            <Field label="Identificador del botón" hint="Figura en el dispositivo (por ejemplo su código o dirección MAC)."><Input required value={idBoton} onChange={(e) => setIdBoton(e.target.value)} /></Field>
            <Btn type="submit" loading={ocupado === "boton"}>Registrar botón</Btn>
          </form>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Pulsera inteligente (Fitbit)</SectionTitle>
        <p className="text-sm text-[#3F4947]">Compartís solo los datos que autorices en Google Health. Se usan para detectar cambios importantes y avisar a tu red cuando haga falta.</p>
        {fitbit.map((d) => (
          <Card key={d.id} className="flex flex-col gap-3 !p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3"><Watch size={22} className="text-[#25665F]" aria-hidden /><div><p className="font-semibold">Fitbit Air</p><p className="text-xs text-[#6F7977]">Última sincronización: {formatFecha(d.ultimaSincronizacion, true)}</p></div></div>
              {d.requiereReautenticacion && <Badge tone="warn"><TriangleAlert size={14} aria-hidden /> Reconectar</Badge>}
            </div>
            <div className="flex gap-2">
              <Btn loading={ocupado === d.id} onClick={() => sync(d)}>Sincronizar</Btn>
              <Btn variant="danger" onClick={() => desvincular(d)}>Desvincular</Btn>
            </div>
            <div className="flex flex-col gap-2 border-t border-[#E0E4E3] pt-3">
              <Field label="Cargar historial completo desde" hint="Vacío = desde 2015. Puede tardar varios minutos; para probar usá una fecha cercana.">
                <Input type="date" value={desdeHist} onChange={(e) => setDesdeHist(e.target.value)} />
              </Field>
              <Btn variant="secondary" loading={ocupado === `hist-${d.id}` || enCurso} disabled={enCurso} onClick={() => cargarHistorial(d)}>Cargar historial completo</Btn>
              {historico && (
                <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${historico.estado === "ERROR" ? "bg-[#FFDBD1] text-[#98462E]" : "bg-[#DCF4EF] text-[#1D544E]"}`}>
                  {historico.estado === "EN_CURSO" && <>Cargando… llegó hasta {formatFecha(historico.progresoHasta)}. Importadas: {historico.insertadas}.</>}
                  {historico.estado === "TERMINADO" && <>Historial cargado: {historico.insertadas} mediciones nuevas.</>}
                  {historico.estado === "ERROR" && <>La carga falló{historico.error ? `: ${historico.error}` : "."}</>}
                  {historico.tiposConError.length > 0 && <> No se pudieron traer: {historico.tiposConError.join(", ")}.</>}
                </p>
              )}
            </div>
          </Card>
        ))}
        <Btn variant="secondary" size="lg" loading={ocupado === "fitbit"} onClick={conectarFitbit}>
          {fitbit.length ? "Reconectar con Google Health" : "Conectar con Google Health"}
        </Btn>
      </div>

      {fitbit.length > 0 && <DatosPulsera usuarioId={usuarioId} refreshKey={refreshKey} />}
    </AdultoMayorShell>
  );
}
