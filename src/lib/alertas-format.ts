import { Alerta, TipoAlerta } from "./api";

export const TIPOS_ALERTA: TipoAlerta[] = [
  "SOS_DIRECTO",
  "FC_ELEVADA",
  "FC_BAJA",
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
    titulo: "Frecuencia cardíaca alta",
    detalle: "Cuando el pulso sube por encima de lo normal o de su rutina.",
    critica: true,
  },
  FC_BAJA: {
    titulo: "Frecuencia cardíaca baja",
    detalle: "Cuando el pulso baja por debajo de lo normal o de su rutina.",
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
    detalle: "Cuando se detecta un cambio importante en el sueño o la actividad.",
    critica: false,
  },
  LOGRO_POSITIVO: {
    titulo: "Buenas noticias",
    detalle: "Cuando la persona superó su actividad habitual. Una buena excusa para llamarla.",
    critica: false,
  },
};

// Configuraciones sugeridas según el tipo de participación (doc NONOS DEFINIDO).
export const PRESET_IMPORTANTES: TipoAlerta[] = ["SOS_DIRECTO", "FC_ELEVADA", "FC_BAJA", "SP02_BAJO"];
export const PRESET_TODAS: TipoAlerta[] = [...TIPOS_ALERTA];

/** Título de la alerta: el cambio de rutina por sueño se distingue del de actividad. */
export function tituloAlerta(a: Alerta) {
  if (a.tipo === "CAMBIO_DE_RUTINA" && a.datosContexto?.tipoMedicion === "SUENO") return "Cambio en el sueño";
  return ALERTA_INFO[a.tipo].titulo;
}

/** Mensaje pensado para el cuidador/familiar. */
export function mensajeParaCuidador(a: Alerta, nombre?: string) {
  const quien = nombre ?? "La persona";
  const ctx = a.datosContexto;
  const valor = (u: string) =>
    ctx?.valorMedido != null ? ` (${ctx.valorMedido}${u}${ctx.promedio != null ? `, habitual ${Math.round(ctx.promedio)}` : ""})` : "";
  switch (a.tipo) {
    case "SOS_DIRECTO":
      return `${quien} pidió ayuda. Comunicate con ${nombre ?? "la persona"} cuanto antes.`;
    case "FC_ELEVADA":
      return `Frecuencia cardíaca por encima de lo normal${valor(" bpm")}.`;
    case "FC_BAJA":
      return `Frecuencia cardíaca por debajo de lo normal${valor(" bpm")}.`;
    case "SP02_BAJO":
      return `Oxígeno en sangre bajo${valor("%")}.`;
    case "CAMBIO_DE_RUTINA":
      return ctx?.tipoMedicion === "SUENO"
        ? "El sueño de esta noche se alejó bastante de su rutina habitual."
        : "Se detectó un cambio importante en su rutina habitual.";
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
