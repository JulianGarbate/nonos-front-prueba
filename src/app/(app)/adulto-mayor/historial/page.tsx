"use client";

import { useRequireAuth } from "@/lib/auth-context";
import { HistorialManager } from "@/components/care/RegistrosManagers";
import { Volver } from "@/components/Volver";

export default function HistorialPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  if (!ready || !user) return null;
  return (
    <>
      <Volver />
      <HistorialManager adultoMayorId={user.id} />
    </>
  );
}
