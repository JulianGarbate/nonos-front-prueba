"use client";

import Link from "next/link";
import { useRequireAuth } from "@/lib/auth-context";
import NotificacionesLista from "@/components/NotificacionesLista";
import { PageHeader } from "@/components/ui";

export default function NotificacionesPage() {
  const { ready } = useRequireAuth("FAMILIAR");
  if (!ready) return null;

  return (
    <>
      <PageHeader
        title="Avisos"
        subtitle={
          <>
            Se actualizan solos. Elegí qué avisos recibir desde{" "}
            <Link href="/familiar#avisos" className="font-semibold text-brand underline underline-offset-4">
              el panel, en “Mis avisos”
            </Link>
            .
          </>
        }
      />
      <NotificacionesLista />
    </>
  );
}
