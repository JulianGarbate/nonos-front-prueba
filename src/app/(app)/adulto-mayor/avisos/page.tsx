"use client";

import Link from "next/link";
import { useRequireAuth } from "@/lib/auth-context";
import NotificacionesLista from "@/components/NotificacionesLista";
import { Volver } from "@/components/Volver";
import { PageHeader } from "@/components/ui";

export default function AvisosAdultoPage() {
  const { ready } = useRequireAuth("ADULTO_MAYOR");
  if (!ready) return null;
  return (
    <>
      <Volver />
      <PageHeader
        title="Avisos"
        subtitle={
          <>
            Lo que NONOS te fue notificando. Podés elegir cómo recibirlos desde{" "}
            <Link href="/perfil" className="font-semibold text-brand underline underline-offset-4">
              tu perfil
            </Link>
            .
          </>
        }
      />
      <NotificacionesLista />
    </>
  );
}
