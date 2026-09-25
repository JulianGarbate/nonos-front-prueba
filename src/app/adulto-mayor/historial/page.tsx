"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRequireAuth } from "@/lib/auth-context";
import AdultoMayorShell from "@/components/AdultoMayorShell";
import { HistorialManager } from "@/components/care/RegistrosManagers";
import { PageLoading } from "@/components/ui";

export default function HistorialPage() {
  const { user, ready } = useRequireAuth("ADULTO_MAYOR");
  if (!ready || !user) return <PageLoading />;
  return (
    <AdultoMayorShell>
      <Link href="/adulto-mayor/mas" className="flex min-h-11 items-center gap-1 text-[#25665F] font-semibold"><ArrowLeft size={18} aria-hidden /> Volver</Link>
      <HistorialManager adultoMayorId={user.id} />
    </AdultoMayorShell>
  );
}
