"use client";

import { borrarPushToken, getVapidPublicKey, guardarPushToken } from "./api";

/**
 * Web Push: el backend firma con VAPID y envía { title, body } a cada
 * suscripción guardada en /push-tokens. Acá vive todo lo del navegador:
 * service worker, permiso, suscripción y alta/baja en el backend.
 */

export type EstadoPush = "verificando" | "no-soportado" | "bloqueado" | "inactivo" | "activo";

/** Error con un mensaje pensado para mostrarse tal cual a la persona. */
export class PushError extends Error {}

export const pushSoportado = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function claveAUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registro() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!pushSoportado()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "activo" : "inactivo";
}

/** Pide permiso (si hace falta), suscribe este navegador y lo asocia al usuario. */
export async function activarPush(usuarioId: string) {
  if (!pushSoportado()) throw new PushError("Este navegador no permite notificaciones.");
  if (Notification.permission !== "granted") {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") throw new PushError("No diste permiso para mostrar avisos. Podés habilitarlo desde la configuración del navegador.");
  }

  try {
    const reg = await registro();
    const publicKey = await getVapidPublicKey();
    const esperada = claveAUint8(publicKey);

    let sub = await reg.pushManager.getSubscription();
    // Si el backend cambió sus claves VAPID, la suscripción vieja ya no sirve.
    if (sub) {
      const actual = sub.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
      const igual = actual && actual.length === esperada.length && actual.every((b, i) => b === esperada[i]);
      if (!igual) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: esperada });

    const { endpoint, keys } = sub.toJSON();
    if (!endpoint || !keys?.p256dh || !keys?.auth) throw new PushError("El navegador devolvió una suscripción incompleta.");
    await guardarPushToken({ usuarioId, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  } catch (e) {
    if (e instanceof PushError) throw e;
    throw new PushError("Este navegador no pudo activar los avisos ahora. Probá con Chrome, Edge o Safari (en iPhone, primero agregá NONOS a la pantalla de inicio).");
  }
}

/** Baja en el backend y en el navegador (deja de recibir avisos en este dispositivo). */
export async function desactivarPush() {
  if (!pushSoportado()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await borrarPushToken(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

/**
 * Al abrir la app con el permiso ya concedido: asegura que la suscripción de
 * este navegador quede a nombre de la cuenta actual (el backend hace upsert
 * por endpoint, así que si otra persona usó antes este navegador, se reasigna).
 */
export async function sincronizarPush(usuarioId: string) {
  if (!pushSoportado() || Notification.permission !== "granted") return;
  try {
    await activarPush(usuarioId);
  } catch {
    /* silencioso: no bloquea el uso de la app */
  }
}

/** Notificación local de prueba, para verificar que el service worker funciona. */
export async function notificacionDePrueba() {
  const reg = await registro();
  await reg.showNotification("NONOS", {
    body: "Así vas a ver los avisos importantes, incluso con la app cerrada.",
    icon: "/pwa-icon/192",
    badge: "/pwa-icon/96",
    data: { url: "/avisos" },
  });
}
