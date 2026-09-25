"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useRequireAuth } from "@/lib/auth-context";
import { useNotificaciones } from "@/lib/use-notificaciones";
import CuidadorShell from "@/components/CuidadorShell";
import { Btn, Card, Empty, formatFecha, Loading, PageLoading } from "@/components/ui";

export default function NotificacionesPage() {
  const { ready } = useRequireAuth("FAMILIAR");
  const { items, noLeidas, cargando, marcarLeida } = useNotificaciones(true, 15_000);
  if (!ready) return <PageLoading />;

  return (
    <CuidadorShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold text-[#181C1B]">Avisos</h1>
        {noLeidas > 0 && (
          <Btn variant="secondary" onClick={() => items.filter((n) => !n.leida).forEach((n) => marcarLeida(n.id))}>
            <CheckCheck size={18} aria-hidden /> Marcar todo como leído
          </Btn>
        )}
      </div>
      <p className="text-sm text-[#3F4947]">
        Se actualizan solos cada pocos segundos. Podés elegir qué avisos recibir desde <Link href="/familiar" className="font-semibold text-[#25665F] underline">el panel, en “Mis avisos”</Link>.
      </p>
      {cargando && <Loading />}
      {!cargando && items.length === 0 && <Empty>No tenés avisos todavía.</Empty>}
      <ul className="flex flex-col gap-2">
        {items.map((n) => (
          <li key={n.id}>
            <Card className={`flex items-start gap-3 !p-4 ${n.leida ? "" : "!border-[#25665F] !bg-[#F1F8F6]"}`}>
              <Bell size={20} className={n.leida ? "text-[#6F7977]" : "text-[#25665F]"} aria-hidden />
              <div className="flex-1">
                <p className="font-semibold text-[#181C1B]">{n.titulo}</p>
                <p className="text-sm text-[#3F4947]">{n.mensaje}</p>
                <p className="mt-1 text-xs text-[#6F7977]">{formatFecha(n.enviadaEn, true)}</p>
              </div>
              {!n.leida && <Btn variant="ghost" onClick={() => marcarLeida(n.id)}>Marcar leído</Btn>}
            </Card>
          </li>
        ))}
      </ul>
    </CuidadorShell>
  );
}
