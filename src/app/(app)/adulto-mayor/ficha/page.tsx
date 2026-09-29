"use client";

import { useCallback, useEffect, useState } from "react";
import { getUsuarioById } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import { CondicionesManager, ContactosManager, MedidasAnticipadas } from "@/components/care/FichaManagers";
import { Volver } from "@/components/Volver";
import { PageHeader } from "@/components/ui";

export default function FichaPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  const [medidas, setMedidas] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (user) getUsuarioById(user.id).then((u) => setMedidas(u.medidasAnticipadas ?? "")).catch(() => {});
  }, [user]);
  useEffect(cargar, [cargar]);

  if (!ready || !user) return null;

  return (
    <>
      <Volver />
      <PageHeader title="Mi ficha de salud" subtitle="Esta información ayuda a quien te asista en una emergencia. Cargá solo lo importante." />
      <div className="flex flex-col gap-10">
        <CondicionesManager adultoMayorId={user.id} canEdit />
        <ContactosManager adultoMayorId={user.id} canEdit />
        <MedidasAnticipadas adultoMayorId={user.id} inicial={medidas} canEdit onSaved={cargar} />
      </div>
    </>
  );
}
