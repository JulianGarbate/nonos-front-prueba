"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pill, Users, Siren, MailPlus, ChevronRight } from "lucide-react";
import { useRequireAuth } from "@/lib/auth-context";
import { Medicamento, Vinculo, getMedicamentos, getVinculos, getInvitacionesRecibidas } from "@/lib/api";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import { AlertaPendienteAdulto } from "@/components/care/AlertasPanel";
import { Card, PageLoading } from "@/components/ui";

function proximaToma(meds: Medicamento[]) {
  const ahora = new Date();
  const hoy = ahora.getDay();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  let mejor: { nombre: string; dosis: string; hora: string; min: number } | null = null;
  for (const m of meds) {
    if (m.diasSemana.length && !m.diasSemana.includes(hoy)) continue;
    for (const h of m.horariosDelDia) {
      const [hh, mm] = h.split(":").map(Number);
      const min = hh * 60 + mm;
      if (min >= minAhora && (!mejor || min < mejor.min)) mejor = { nombre: m.nombre, dosis: m.dosis, hora: h, min };
    }
  }
  return mejor;
}

export default function AdultoMayorHome() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [meds, setMeds] = useState<Medicamento[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [invitaciones, setInvitaciones] = useState(0);

  useEffect(() => {
    if (!user) return;
    getMedicamentos(user.id).then(setMeds).catch(() => {});
    getVinculos(user.id).then(setVinculos).catch(() => {});
    getInvitacionesRecibidas().then((i) => setInvitaciones(i.length)).catch(() => {});
  }, [user]);

  if (!ready || !user) return <PageLoading />;

  const proxima = proximaToma(meds);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <AdultoMayorShell>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#181C1B]">{saludo}, {user.nombreCompleto.split(" ")[0]}</h1>
        <p className="mt-1 text-lg text-[#3F4947]">Acá está todo lo importante.</p>
      </div>

      <AlertaPendienteAdulto adultoMayorId={user.id} />

      {invitaciones > 0 && (
        <Link href="/invitaciones" className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-[#25665F] bg-[#E8F0EE] p-4 text-[#1D544E]">
          <MailPlus size={26} aria-hidden />
          <span className="flex-1 text-lg font-bold">Tenés {invitaciones} invitación{invitaciones > 1 ? "es" : ""} para revisar</span>
          <ChevronRight aria-hidden />
        </Link>
      )}

      <Link href="/adulto-mayor/emergencia" className="flex min-h-24 items-center justify-center gap-3 rounded-2xl bg-[#BA1A1A] p-4 text-2xl font-extrabold text-white shadow-lg">
        <Siren size={36} aria-hidden /> PEDIR AYUDA
      </Link>

      <Card className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFDBD1] text-[#98462E]"><Pill size={26} aria-hidden /></span>
        <div>
          <p className="text-sm font-semibold text-[#3F4947]">{proxima ? "Tu próxima medicación" : "Medicación"}</p>
          {proxima ? (
            <p className="text-xl font-bold text-[#181C1B]">{proxima.nombre} · {proxima.hora}<span className="block text-base font-normal text-[#3F4947]">{proxima.dosis}</span></p>
          ) : (
            <p className="text-lg text-[#181C1B]">{meds.length ? "Ya no hay más tomas para hoy." : "Todavía no hay medicación cargada."}</p>
          )}
        </div>
      </Card>

      <Link href="/adulto-mayor/red">
        <Card className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E8F0EE] text-[#25665F]"><Users size={26} aria-hidden /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#3F4947]">Tu red de cuidado</p>
            <p className="text-xl font-bold text-[#181C1B]">{vinculos.length ? `${vinculos.length} persona${vinculos.length > 1 ? "s" : ""} te acompañan` : "Todavía no sumaste a nadie"}</p>
          </div>
          <ChevronRight aria-hidden className="text-[#6F7977]" />
        </Card>
      </Link>
    </AdultoMayorShell>
  );
}
