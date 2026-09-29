import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main id="contenido" className="flex min-h-screen flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-24 w-24 animate-float items-center justify-center rounded-full bg-brand-soft text-brand">
        <Compass size={44} aria-hidden />
      </span>
      <p className="text-sm font-bold uppercase tracking-widest text-brand">Error 404</p>
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">No encontramos esa página</h1>
      <p className="max-w-md text-lg leading-relaxed text-ink-2">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <Link
        href="/"
        className="inline-flex min-h-13 items-center gap-2 rounded-xl bg-brand px-6 text-lg font-semibold text-on-brand shadow-md transition hover:-translate-y-0.5 hover:bg-brand-hover active:scale-95"
      >
        <Home size={20} aria-hidden /> Volver al inicio
      </Link>
    </main>
  );
}
