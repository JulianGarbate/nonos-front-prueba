"use client";

import { useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import MedicacionManager from "@/components/care/MedicacionManager";
import { PageLoading } from "@/components/ui";

export default function MedicacionPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  if (!ready || !user) return <PageLoading />;

  return (
    <AdultoMayorShell>
      <h1 className="text-3xl font-bold text-[#181C1B]">Mi medicación</h1>
      <p className="text-[#3F4947]">
        Si tu médico cambió algo en una consulta, registralo acá o avisale a tu familiar o cuidador para que lo actualice.
      </p>
      <MedicacionManager adultoMayorId={user.id} canEdit />
    </AdultoMayorShell>
  );
}
