"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contenido" className="flex min-h-screen flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert size={44} aria-hidden />
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">Algo salió mal</h1>
      <p className="max-w-md text-lg leading-relaxed text-ink-2">Tuvimos un problema inesperado. Tus datos están a salvo: probá de nuevo.</p>
      <button
        onClick={reset}
        className="inline-flex min-h-13 items-center gap-2 rounded-xl bg-brand px-6 text-lg font-semibold text-on-brand shadow-md transition hover:-translate-y-0.5 hover:bg-brand-hover active:scale-95"
      >
        <RefreshCw size={20} aria-hidden /> Reintentar
      </button>
    </main>
  );
}
