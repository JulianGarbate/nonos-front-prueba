"use client";

import { useEffect, useState } from "react";
import { CircleCheck, TriangleAlert, ScrollText, Pill, Siren } from "lucide-react";
import { EventoHistorial, Medicamento, getHistorial, getMedicamentos } from "@/lib/api";
import { mensajeParaCuidador } from "@/lib/alertas-format";
import { useAlertas } from "@/components/care/AlertasPanel";
import { Card, formatDia, SectionTitle } from "@/components/ui";

function Linea({ ok, icon: Icon, children }: { ok: boolean; icon: typeof CircleCheck; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ok ? "bg-[#DCF4EF] text-[#25665F]" : "bg-[#FFDBD1] text-[#98462E]"}`}>
        {ok ? <CircleCheck size={16} aria-hidden /> : <Icon size={16} aria-hidden />}
      </span>
      <span className="text-[#181C1B]">{children}</span>
    </li>
  );
}

export default function ResumenHoy({ adultoMayorId, nombre }: { adultoMayorId: string; nombre: string }) {
  const { items: alertas } = useAlertas(adultoMayorId);
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);

  useEffect(() => {
    getMedicamentos(adultoMayorId).then(setMeds).catch(() => {});
    getHistorial(adultoMayorId).then(setHistorial).catch(() => {});
  }, [adultoMayorId]);

  const primerNombre = nombre.split(" ")[0];
  const pendientes = alertas.filter((a) => a.estado === "PENDIENTE" && a.tipo !== "LOGRO_POSITIVO");
  const criticas = pendientes.filter((a) => a.categoria === "CRITICO");
  const logro = alertas.find((a) => a.tipo === "LOGRO_POSITIVO" && Date.now() - new Date(a.createdAt).getTime() < 48 * 3600 * 1000);
  const stockBajo = meds.filter((m) => m.lowStock);
  const ultimoEvento = historial[0];

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Resumen de hoy</SectionTitle>
      <Card>
        <ul className="flex flex-col gap-3">
          <Linea ok={criticas.length === 0} icon={Siren}>
            {criticas.length === 0 ? "Sin alertas críticas." : <><strong>{criticas.length} alerta{criticas.length > 1 ? "s" : ""} crítica{criticas.length > 1 ? "s" : ""} sin resolver.</strong> {mensajeParaCuidador(criticas[0], primerNombre)}</>}
          </Linea>
          <Linea ok={stockBajo.length === 0} icon={Pill}>
            {stockBajo.length === 0 ? (meds.length ? "Medicación con stock suficiente." : "Sin medicación cargada.") : <>Poco stock de <strong>{stockBajo.map((m) => m.nombre).join(", ")}</strong>.</>}
          </Linea>
          <Linea ok={pendientes.length === criticas.length} icon={TriangleAlert}>
            {pendientes.length === criticas.length ? "Sin otros avisos pendientes." : `${pendientes.length - criticas.length} aviso(s) informativo(s) para revisar en Alertas.`}
          </Linea>
          <Linea ok icon={ScrollText}>
            {ultimoEvento ? <>Último acontecimiento registrado: <strong>{ultimoEvento.descripcion}</strong> ({formatDia(ultimoEvento.fecha)}).</> : "Sin acontecimientos registrados."}
          </Linea>
        </ul>
      </Card>
      {logro && (
        <Card className="!bg-[#DCF4EF]">
          <p className="font-semibold text-[#1D544E]">{mensajeParaCuidador(logro, primerNombre)}</p>
        </Card>
      )}
    </div>
  );
}
