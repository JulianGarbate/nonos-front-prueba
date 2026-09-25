"use client";

import { useEffect, useState } from "react";
import { TipoAlerta, editarNotificacionesRecibidas, getNotificacionesRecibidas, getVinculos, mensajeDeError } from "@/lib/api";
import { ALERTA_INFO, PRESET_IMPORTANTES, PRESET_TODAS, TIPOS_ALERTA } from "@/lib/alertas-format";
import { Btn, Card, ErrorText, Loading, SectionTitle } from "@/components/ui";

export default function NotificacionesConfig({ familiarId, adultoMayorId, nombre }: { familiarId: string; adultoMayorId: string; nombre: string }) {
  const [tipos, setTipos] = useState<TipoAlerta[] | null>(null);
  const [rol, setRol] = useState<string>("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTipos(null);
    getNotificacionesRecibidas(familiarId, adultoMayorId).then(setTipos).catch((e) => setError(mensajeDeError(e)));
    getVinculos(adultoMayorId)
      .then((vs) => {
        const v = vs.find((x) => x.familiarId === familiarId);
        if (v) setRol(v.tipoVinculo === "FAMILIAR" ? "Familiar" : v.tipoCuidador === "FISICO" ? "Cuidador/a físico" : "Cuidador/a digital");
      })
      .catch(() => {});
  }, [familiarId, adultoMayorId]);

  function toggle(t: TipoAlerta) {
    setOk(false);
    setTipos((prev) => (prev ? (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]) : prev));
  }

  async function guardar(nuevos = tipos) {
    if (!nuevos) return;
    setGuardando(true);
    setError(null);
    try {
      setTipos(await editarNotificacionesRecibidas(familiarId, adultoMayorId, nuevos));
      setOk(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Qué avisos querés recibir sobre {nombre.split(" ")[0]}</SectionTitle>
      <p className="text-sm text-[#3F4947]">
        {rol && <>Tu rol: <strong>{rol}</strong>. </>}
        Por defecto el cuidador físico recibe lo más importante y el digital recibe todo, pero podés activar o desactivar cada categoría —incluso todas.
      </p>
      {!tipos && !error && <Loading />}
      {tipos && (
        <>
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={() => { setTipos(PRESET_IMPORTANTES); setOk(false); }}>Solo lo importante</Btn>
            <Btn variant="secondary" onClick={() => { setTipos(PRESET_TODAS); setOk(false); }}>Todo</Btn>
            <Btn variant="secondary" onClick={() => { setTipos([]); setOk(false); }}>Ninguno</Btn>
          </div>
          <Card className="!p-2">
            <ul className="divide-y divide-[#E0E4E3]">
              {TIPOS_ALERTA.map((t) => {
                const on = tipos.includes(t);
                return (
                  <li key={t}>
                    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 p-3">
                      <span>
                        <span className="block font-semibold text-[#181C1B]">{ALERTA_INFO[t].titulo}</span>
                        <span className="block text-sm text-[#3F4947]">{ALERTA_INFO[t].detalle}</span>
                      </span>
                      <input type="checkbox" role="switch" checked={on} onChange={() => toggle(t)} className="h-6 w-6 shrink-0 accent-[#25665F]" aria-label={ALERTA_INFO[t].titulo} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
          <ErrorText>{error}</ErrorText>
          {ok && <p role="status" className="text-sm font-medium text-[#25665F]">Preferencias guardadas.</p>}
          <Btn size="lg" loading={guardando} onClick={() => guardar()}>Guardar preferencias</Btn>
        </>
      )}
    </div>
  );
}
