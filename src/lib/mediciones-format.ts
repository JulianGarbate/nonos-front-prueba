import { Activity, Footprints, HeartPulse, Moon, Wind, type LucideIcon } from "lucide-react";
import type { TipoMedicion } from "./api";

export const MEDICIONES: Record<TipoMedicion, { label: string; unidad: string; icon: LucideIcon; decimales: number }> = {
  FRECUENCIA_CARDIACA: { label: "Frecuencia cardíaca", unidad: "bpm", icon: HeartPulse, decimales: 0 },
  SPO2: { label: "Oxígeno en sangre", unidad: "%", icon: Wind, decimales: 0 },
  PASOS: { label: "Pasos", unidad: "pasos", icon: Footprints, decimales: 0 },
  SUENO: { label: "Sueño", unidad: "", icon: Moon, decimales: 0 },
  HRV: { label: "Variabilidad cardíaca", unidad: "ms", icon: Activity, decimales: 0 },
};

export const ORDEN_MEDICIONES: TipoMedicion[] = ["FRECUENCIA_CARDIACA", "SPO2", "PASOS", "SUENO", "HRV"];

/** El backend guarda el sueño en minutos. */
export const horasMin = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

export function formatValor(tipo: TipoMedicion, v: number) {
  if (tipo === "SUENO") return horasMin(v);
  return Number.isInteger(v) ? v.toLocaleString("es-AR") : v.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}
