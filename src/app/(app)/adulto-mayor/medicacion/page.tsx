"use client";

import { useRequireAuth } from "@/lib/auth-context";
import MedicacionManager from "@/components/care/MedicacionManager";
import { PageHeader } from "@/components/ui";

export default function MedicacionPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  if (!ready || !user) return null;

  return (
    <>
      <PageHeader title="Mi medicación" subtitle="Si tu médico cambió algo en una consulta, registralo acá o avisale a tu familiar o cuidador para que lo actualice." />
      <MedicacionManager adultoMayorId={user.id} canEdit />
    </>
  );
}
