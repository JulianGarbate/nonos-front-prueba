"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUsuarioById } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import { CondicionesManager, ContactosManager, MedidasAnticipadas } from "@/components/care/FichaManagers";
import { PageLoading } from "@/components/ui";

export default function FichaPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [medidas, setMedidas] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (user) getUsuarioById(user.id).then((u) => setMedidas(u.medidasAnticipadas ?? "")).catch(() => {});
  }, [user]);
  useEffect(cargar, [cargar]);

  if (!ready || !user) return <PageLoading />;

  return (
    <AdultoMayorShell>
      <Link href="/adulto-mayor/mas" className="flex min-h-11 items-center gap-1 text-[#25665F] font-semibold"><ArrowLeft size={18} aria-hidden /> Volver</Link>
      <h1 className="text-3xl font-bold text-[#181C1B]">Mi ficha de salud</h1>
      <p className="text-[#3F4947]">Esta información ayuda a quien te asista en una emergencia. Cargá solo lo importante.</p>
      <CondicionesManager adultoMayorId={user.id} canEdit />
      <ContactosManager adultoMayorId={user.id} canEdit />
      <MedidasAnticipadas adultoMayorId={user.id} inicial={medidas} canEdit onSaved={cargar} />
    </AdultoMayorShell>
  );
}
