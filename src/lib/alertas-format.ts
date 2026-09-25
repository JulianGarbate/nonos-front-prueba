import { Alerta, TipoAlerta } from "./api";

export const TIPOS_ALERTA: TipoAlerta[] = [
  "SOS_DIRECTO",
  "FC_ELEVADA",
  "SP02_BAJO",
  "MEDICACION_STOCK_BAJO",
  "CAMBIO_DE_RUTINA",
  "LOGRO_POSITIVO",
];

// Categorías que ve el usuario al configurar sus notificaciones.
export const ALERTA_INFO: Record<TipoAlerta, { titulo: string; detalle: string; critica: boolean }> = {
  SOS_DIRECTO: {
    titulo: "Pedido de ayuda (SOS)",
    detalle: "Cuando la persona presiona el botón de emergencia.",
    critica: true,
  },
  FC_ELEVADA: {
    titulo: "Frecuencia cardíaca fuera de lo habitual",
    detalle: "Cuando el pulso se aleja de su rutina normal.",
    critica: true,
  },
  SP02_BAJO: {
    titulo: "Oxígeno en sangre bajo",
    detalle: "Cuando el nivel de oxígeno baja de lo esperado.",
    critica: true,
  },
  MEDICACION_STOCK_BAJO: {
    titulo: "Medicación por agotarse",
    detalle: "Cuando queda poco stock de un medicamento.",
    critica: false,
  },
  CAMBIO_DE_RUTINA: {
    titulo: "Cambios en la rutina",
    detalle: "Cuando se detecta un cambio importante en sus hábitos.",
    critica: false,
  },
  LOGRO_POSITIVO: {
    titulo: "Buenas noticias",
    detalle: "Cuando la persona superó su actividad habitual. Una buena excusa para llamarla.",
    critica: false,
  },
};

// Configuraciones sugeridas según el tipo de participación (doc NONOS DEFINIDO).
export const PRESET_IMPORTANTES: TipoAlerta[] = ["SOS_DIRECTO", "FC_ELEVADA", "SP02_BAJO"];
export const PRESET_TODAS: TipoAlerta[] = [...TIPOS_ALERTA];

/** Mensaje pensado para el cuidador/familiar. */
export function mensajeParaCuidador(a: Alerta, nombre?: string) {
  const quien = nombre ?? "La persona";
  const ctx = a.datosContexto;
  switch (a.tipo) {
    case "SOS_DIRECTO":
      return `${quien} pidió ayuda. Comunicate con ${nombre ?? "la persona"} cuanto antes.`;
    case "FC_ELEVADA":
      return `Frecuencia cardíaca fuera de rango${ctx?.valorMedido ? ` (${ctx.valorMedido} bpm${ctx.promedio ? `, habitual ${Math.round(ctx.promedio)}` : ""})` : ""}.`;
    case "SP02_BAJO":
      return `Oxígeno en sangre bajo${ctx?.valorMedido ? ` (${ctx.valorMedido}%)` : ""}.`;
    case "CAMBIO_DE_RUTINA":
      return "Se detectó un cambio importante en su rutina habitual.";
    case "LOGRO_POSITIVO":
      return `${quien} estuvo más activo/a que de costumbre. Podría ser un buen momento para felicitar y conversar sobre su día.`;
    default:
      return a.descripcion;
  }
}

/** Mensaje pensado para el adulto mayor: simple y sin culpa. */
export function mensajeParaAdulto(a: Alerta) {
  switch (a.tipo) {
    case "SOS_DIRECTO":
      return "Pediste ayuda. Ya avisamos a tus contactos.";
    case "LOGRO_POSITIVO":
      return "¡Excelente! Estuviste más activo que de costumbre.";
    case "MEDICACION_STOCK_BAJO":
      return a.descripcion;
    default:
      return "Detectamos algo distinto en tus mediciones. ¿Estás bien?";
  }
}

export const ALERTA_ESTADO_LABEL = {
  PENDIENTE: "Pendiente",
  RESUELTA: "Resuelta",
  CANCELADA: "Cancelada",
} as const;
