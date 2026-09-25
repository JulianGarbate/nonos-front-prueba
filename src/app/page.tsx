"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeForRol, useAuth } from "@/lib/auth-context";
import { PageLoading } from "@/components/ui";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? homeForRol(user.rol) : "/login");
  }, [user, loading, router]);

  return <PageLoading />;
}
