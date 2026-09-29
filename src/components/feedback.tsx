"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Info, Trash2, X, type LucideIcon } from "lucide-react";
import { Btn, cx } from "@/components/ui";

/* Avisos efímeros (toasts) y diálogos de confirmación, reemplazo de alert()/confirm(). */

type ToastTone = "ok" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: ReactNode;
}
interface ToastApi {
  ok: (m: ReactNode) => void;
  error: (m: ReactNode) => void;
  info: (m: ReactNode) => void;
}

export interface ConfirmOpts {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "brand";
  icon?: LucideIcon;
}
type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;

const ToastCtx = createContext<ToastApi | null>(null);
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de <FeedbackProvider>");
  return ctx;
};
export const useConfirm = () => {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <FeedbackProvider>");
  return ctx;
};

const TOAST_STYLE: Record<ToastTone, { icon: LucideIcon; box: string }> = {
  ok: { icon: CheckCircle2, box: "border-brand/30 [&>svg:first-child]:text-brand" },
  error: { icon: CircleAlert, box: "border-danger/40 [&>svg:first-child]:text-danger" },
  info: { icon: Info, box: "border-line-strong [&>svg:first-child]:text-brand" },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dlg, setDlg] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, message: ReactNode) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ ok: (m) => push("ok", m), error: (m) => push("error", m), info: (m) => push("info", m) }), [push]);
  const confirmar = useCallback<ConfirmFn>((opts) => new Promise((resolve) => setDlg({ opts, resolve })), []);

  return (
    <ToastCtx.Provider value={api}>
      <ConfirmCtx.Provider value={confirmar}>
        {children}

        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
        >
          {toasts.map((t) => {
            const { icon: Icon, box } = TOAST_STYLE[t.tone];
            return (
              <div
                key={t.id}
                role={t.tone === "error" ? "alert" : "status"}
                className={cx(
                  "pointer-events-auto flex w-full max-w-sm animate-toast items-start gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-pop",
                  box,
                )}
              >
                <Icon size={22} className="mt-0.5 shrink-0" aria-hidden />
                <p className="flex-1 text-sm font-medium leading-relaxed text-ink">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Cerrar aviso"
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>

        {dlg && (
          <ConfirmDialog
            opts={dlg.opts}
            onClose={(v) => {
              dlg.resolve(v);
              setDlg(null);
            }}
          />
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOpts; onClose: (v: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const danger = (opts.tone ?? "danger") === "danger";
  const Icon = opts.icon ?? (danger ? Trash2 : Info);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet m-auto"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div className="w-[min(92vw,26rem)] animate-sheet rounded-3xl border border-line bg-surface p-6 shadow-pop">
        <span className={cx("mb-4 flex h-12 w-12 items-center justify-center rounded-full", danger ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand")}>
          <Icon size={24} aria-hidden />
        </span>
        <h2 id="confirm-title" className="text-xl font-bold text-ink">
          {opts.title}
        </h2>
        {opts.message && <p className="mt-2 text-base leading-relaxed text-ink-2">{opts.message}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn variant="secondary" onClick={() => onClose(false)} autoFocus>
            {opts.cancelLabel ?? "Cancelar"}
          </Btn>
          <Btn variant={danger ? "sos" : "primary"} onClick={() => onClose(true)}>
            {opts.confirmLabel ?? "Confirmar"}
          </Btn>
        </div>
      </div>
    </dialog>
  );
}
