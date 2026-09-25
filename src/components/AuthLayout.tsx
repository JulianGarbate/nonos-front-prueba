import { ReactNode } from "react";
import { HeartHandshake } from "lucide-react";

export default function AuthLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center bg-[#F7FAF8] px-5 py-10">
      <header className="mb-8 flex flex-col items-center gap-1 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25665F] text-white">
          <HeartHandshake size={30} aria-hidden />
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#25665F]">NONOS</h1>
        <p className="text-sm text-[#3F4947]">Tecnología que acompaña. Cuidando a quienes más queremos.</p>
      </header>
      <div className="w-full max-w-md rounded-2xl border border-[#E0E4E3] bg-white p-6 shadow-[0_4px_20px_rgba(0,40,35,0.08)]">
        <h2 className="mb-5 text-2xl font-bold text-[#181C1B]">{titulo}</h2>
        {children}
      </div>
    </main>
  );
}
