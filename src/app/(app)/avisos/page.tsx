"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PageLoading } from "@/components/ui";

/** Destino de los clics en las notificaciones push: lleva a los avisos del rol. */
export default function Avisos() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(user.rol === "ADULTO_MAYOR" ? "/adulto-mayor/avisos" : "/familiar/notificaciones");
  }, [user, router]);
  return <PageLoading />;
}
