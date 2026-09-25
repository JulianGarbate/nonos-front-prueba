import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("nonos_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el access token venció (15 min), intenta renovarlo una vez con el
// refresh token y reintenta el request original.
let refreshing: Promise<string | null> | null = null;

async function renovarToken(): Promise<string | null> {
  const refreshToken = window.localStorage.getItem("nonos_refresh_token");
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<LoginResponse>(`${API_URL}/auth/refresh`, { refreshToken });
    window.localStorage.setItem("nonos_token", data.token);
    window.localStorage.setItem("nonos_refresh_token", data.refreshToken);
    return data.token;
  } catch {
    window.localStorage.removeItem("nonos_token");
    window.localStorage.removeItem("nonos_refresh_token");
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      original &&
      !original._retry &&
      !String(original.url).includes("/auth/")
    ) {
      original._retry = true;
      refreshing ??= renovarToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      window.dispatchEvent(new Event("nonos:sesion-expirada"));
    }
    return Promise.reject(error);
  },
);

/* ───────── Auth ───────── */

export type RolUsuario = "ADULTO_MAYOR" | "FAMILIAR";

export interface Usuario {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: RolUsuario;
  fechaNacimiento: string | null;
  telefono: string | null;
  fotoUrl?: string | null;
  medidasAnticipadas?: string | null;
  activo?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
}

export const login = (email: string, password: string) =>
  api.post<LoginResponse>("/auth/login", { email, password }).then((r) => r.data);

export const register = (payload: { email: string; password: string; nombreCompleto: string; rol: RolUsuario }) =>
  api.post("/auth/register", payload).then((r) => r.data);

export const loginWithGoogle = (idToken: string, rol?: RolUsuario) =>
  api.post<LoginResponse>("/auth/google", { idToken, rol }).then((r) => r.data);

export const me = () => api.get<{ user: Usuario }>("/auth/me").then((r) => r.data.user);

export const logoutRequest = (refreshToken: string) => api.post("/auth/logout", { refreshToken });

export const logoutAll = () => api.post("/auth/logout-all");

/* ───────── Usuarios / red de cuidado ───────── */

export const getUsuarioById = (id: string) => api.get<Usuario>(`/usuarios/${id}`).then((r) => r.data);

export const updateUsuario = (
  id: string,
  payload: Partial<{ email: string; nombreCompleto: string; fechaNacimiento: string | null; telefono: string }>,
) => api.put<Usuario>(`/usuarios/${id}`, payload).then((r) => r.data);

export const deleteUsuario = (id: string) => api.delete(`/usuarios/${id}`);

export type TipoVinculo = "FAMILIAR" | "CUIDADOR";
export type TipoCuidador = "FISICO" | "DIGITAL";

export type TipoAlerta =
  | "SOS_DIRECTO"
  | "FC_ELEVADA"
  | "MEDICACION_STOCK_BAJO"
  | "SP02_BAJO"
  | "CAMBIO_DE_RUTINA"
  | "LOGRO_POSITIVO";

export interface Vinculo {
  id: string;
  adultoMayorId: string;
  familiarId: string;
  tipoVinculo: TipoVinculo;
  tipoCuidador: TipoCuidador | null;
  esContactoEmergencia: boolean;
  prioridadContacto: number | null;
  tipoNotificaciones: TipoAlerta[];
  createdAt: string;
}

export const getVinculos = (adultoMayorId: string) =>
  api.get<Vinculo[]>(`/usuarios/${adultoMayorId}/vinculos`).then((r) => r.data);

export const updateVinculo = (adultoMayorId: string, familiarId: string, tipoVinculo: TipoVinculo) =>
  api.put<Vinculo>(`/usuarios/${adultoMayorId}/vinculos/${familiarId}`, { tipoVinculo }).then((r) => r.data);

export const deleteVinculo = (adultoMayorId: string, familiarId: string) =>
  api.delete(`/usuarios/${adultoMayorId}/vinculos/${familiarId}`);

export const getAdultosMayoresVinculados = (familiarId: string) =>
  api.get<Usuario[]>(`/usuarios/${familiarId}/adultos-mayores-vinculados`).then((r) => r.data);

export const setContactoEmergencia = (
  adultoMayorId: string,
  payload: { familiarId: string; esContactoEmergencia: boolean; prioridadContacto?: number },
) => api.put<Vinculo>(`/usuarios/${adultoMayorId}/contacto-emergencia`, payload).then((r) => r.data);

export const getNotificacionesRecibidas = (familiarId: string, adultoMayorId: string) =>
  api
    .get<{ tipoNotificaciones: TipoAlerta[] }>(`/usuarios/${familiarId}/notificaciones/${adultoMayorId}`)
    .then((r) => r.data.tipoNotificaciones);

export const editarNotificacionesRecibidas = (familiarId: string, adultoMayorId: string, tipos: TipoAlerta[]) =>
  api
    .put<{ tipoNotificaciones: TipoAlerta[] }>(`/usuarios/${familiarId}/notificaciones/${adultoMayorId}`, {
      tipoNotificaciones: tipos,
    })
    .then((r) => r.data.tipoNotificaciones);

export const editarMedidasAnticipadas = (id: string, medidasAnticipadas: string) =>
  api.put<Usuario>(`/usuarios/${id}/medidas-anticipadas`, { medidasAnticipadas }).then((r) => r.data);

/* ───────── Invitaciones ───────── */

export type DireccionInvitacion = "EMISOR_ES_ADULTO_MAYOR" | "EMISOR_ES_FAMILIAR";
export type EstadoInvitacion = "PENDIENTE" | "ACEPTADA" | "RECHAZADA" | "EXPIRADA";

export interface Invitacion {
  id: string;
  emisorId: string;
  emailDestino: string;
  tipoVinculo: TipoVinculo;
  tipoCuidador: TipoCuidador | null;
  direccion: DireccionInvitacion;
  estado: EstadoInvitacion;
  expiraEn: string;
  createdAt: string;
}

export const crearInvitacion = (payload: {
  emailDestino: string;
  tipoVinculo: TipoVinculo;
  direccion: DireccionInvitacion;
  tipoCuidador?: TipoCuidador;
}) => api.post<Invitacion>("/invitaciones", payload).then((r) => r.data);

export const getInvitacionesRecibidas = () => api.get<Invitacion[]>("/invitaciones/recibidas").then((r) => r.data);
export const getInvitacionesEnviadas = () => api.get<Invitacion[]>("/invitaciones/enviadas").then((r) => r.data);
export const aceptarInvitacion = (id: string) => api.post(`/invitaciones/${id}/aceptar`).then((r) => r.data);
export const rechazarInvitacion = (id: string) => api.post(`/invitaciones/${id}/rechazar`).then((r) => r.data);

/* ───────── Medicación ───────── */

export interface Medicamento {
  id: string;
  usuarioId: string;
  nombre: string;
  dosis: string;
  horariosDelDia: string[];
  diasSemana: number[];
  stockActual: number | null;
  stockMinimo: number | null;
  activo: boolean;
  lowStock?: boolean;
  createdAt: string;
}

export type MedicamentoInput = Partial<{
  nombre: string;
  dosis: string;
  horariosDelDia: string[];
  diasSemana: number[];
  stockActual: number;
  stockMinimo: number;
}>;

export const getMedicamentos = (usuarioId: string) =>
  api.get<Medicamento[]>("/medicamentos", { params: { usuarioId } }).then((r) => r.data);

export const createMedicamento = (payload: MedicamentoInput & { nombre: string; dosis: string; horariosDelDia: string[]; usuarioId: string }) =>
  api.post<Medicamento>("/medicamentos", payload).then((r) => r.data);

// Endpoint que deja registro en el historial de cambios (quién, qué, cuándo).
export const updateMedicamentoConHistorial = (id: string, usuarioId: string, payload: MedicamentoInput) =>
  api
    .post<{ medicamentoActualizado: Medicamento; cambio: CambioMedicacion }>(`/medicamentos/update/${id}`, {
      usuarioId,
      ...payload,
    })
    .then((r) => r.data.medicamentoActualizado);

export const deleteMedicamento = (id: string) => api.delete(`/medicamentos/${id}`);

export interface CambioMedicacion {
  id: string;
  medicamentoId: string;
  usuarioId: string;
  cambio: string;
  fechaCambio: string;
}

export const getCambiosMedicacion = (medicamentoId: string) =>
  api.get<CambioMedicacion[]>(`/medicamentos/cambios/${medicamentoId}`).then((r) => r.data);

/* ───────── Ficha: contactos, condiciones, notas, historial ───────── */

export interface Contacto {
  id: string;
  usuarioId: string;
  nombre: string;
  telefono: string;
  esEmergencia?: boolean;
}
export const getContactos = (usuarioId: string) =>
  api.get<Contacto[]>("/contactos", { params: { usuarioId } }).then((r) => r.data);
export const createContacto = (p: { nombre: string; telefono: string; usuarioId: string }) =>
  api.post<Contacto>("/contactos", p).then((r) => r.data);
export const updateContacto = (id: string, p: Partial<{ nombre: string; telefono: string }>) =>
  api.put<Contacto>(`/contactos/${id}`, p).then((r) => r.data);
export const deleteContacto = (id: string) => api.delete(`/contactos/${id}`);

export interface CondicionMedica {
  id: string;
  usuarioId: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}
export const getCondiciones = (usuarioId: string) =>
  api.get<CondicionMedica[]>("/condiciones", { params: { usuarioId } }).then((r) => r.data);
export const createCondicion = (p: { nombre: string; descripcion?: string; usuarioId: string }) =>
  api.post<CondicionMedica>("/condiciones", p).then((r) => r.data);
export const updateCondicion = (id: string, p: { nombre: string; descripcion?: string }) =>
  api.put<CondicionMedica>(`/condiciones/${id}`, p).then((r) => r.data);
export const deleteCondicion = (id: string) => api.delete(`/condiciones/${id}`);

export interface Nota {
  id: string;
  usuarioId: string;
  cuidadorId: string;
  titulo: string;
  contenido: string;
  createdAt: string;
}
export const getNotas = (usuarioId: string) =>
  api.get<Nota[]>("/notas", { params: { usuarioId } }).then((r) => r.data);
export const createNota = (p: { titulo: string; contenido: string; usuarioId: string }) =>
  api.post<Nota>("/notas", p).then((r) => r.data);
export const updateNota = (id: string, p: { titulo: string; contenido: string }) =>
  api.put<Nota>(`/notas/${id}`, p).then((r) => r.data);
export const deleteNota = (id: string) => api.delete(`/notas/${id}`);

export interface EventoHistorial {
  id: string;
  usuarioId: string;
  authorId: string;
  descripcion: string;
  fecha: string;
  fechaFin: string | null;
  createdAt: string;
}
export const getHistorial = (usuarioId: string) =>
  api.get<EventoHistorial[]>("/eventos-historial", { params: { usuarioId } }).then((r) => r.data);
export const createHistorial = (p: { usuarioId: string; descripcion: string; fecha: string; fechaFin?: string }) =>
  api.post<EventoHistorial>("/eventos-historial", p).then((r) => r.data);
export const updateHistorial = (id: string, p: { descripcion?: string; fecha?: string; fechaFin?: string | null }) =>
  api.put<EventoHistorial>(`/eventos-historial/${id}`, p).then((r) => r.data);
export const deleteHistorial = (id: string) => api.delete(`/eventos-historial/${id}`);

/* ───────── Emergencias y alertas ───────── */

export type EstadoAlerta = "PENDIENTE" | "CANCELADA" | "RESUELTA";

export interface Alerta {
  id: string;
  usuarioId: string;
  tipo: TipoAlerta;
  estado: EstadoAlerta;
  categoria: "CRITICO" | "INFORMATIVO";
  descripcion: string;
  datosContexto: { valorMedido?: number; promedio?: number } | null;
  ventanaExpiraEn: string | null;
  confirmadaEn: string | null;
  escaladaEn: string | null;
  createdAt: string;
}

export const getAlertas = (usuarioId: string) =>
  api.get<Alerta[]>("/alertas", { params: { usuarioId } }).then((r) => r.data);
export const dispararSOS = (usuarioId: string) => api.post<Alerta>("/alertas/emergencia", { usuarioId }).then((r) => r.data);
export const confirmarAlerta = (id: string, isOk: boolean) =>
  api.put(`/alertas/${id}/confirmar`, { isOk }).then((r) => r.data);

export interface Feedback {
  id: string;
  alertaId: string;
  autorId: string;
  fueEmergenciaReal: boolean;
  comentario: string | null;
  createdAt: string;
  autor?: { id: string; nombreCompleto: string; email: string; rol: RolUsuario };
}
export const getFeedback = (alertaId: string) =>
  api.get<Feedback[]>(`/alertas/feedback/${alertaId}`).then((r) => r.data);
export const crearFeedback = (p: { alertaId: string; comentario: string; fueEmergenciaReal: boolean }) =>
  api.post<Feedback>("/alertas/feedback", p).then((r) => r.data);

export interface Notificacion {
  id: string;
  usuarioId: string;
  alertaId: string | null;
  tipo: "PUSH" | "EMAIL" | "SMS";
  titulo: string;
  mensaje: string;
  leida: boolean;
  enviadaEn: string;
}
export const getNotificaciones = () => api.get<Notificacion[]>("/notificaciones").then((r) => r.data);
export const marcarNotificacionLeida = (id: string) =>
  api.put<Notificacion>(`/notificaciones/${id}/leida`).then((r) => r.data);

/* ───────── QR / perfil de emergencia ───────── */

export interface QRPropio {
  id: string;
  codigo: string;
  isActivo: boolean;
  expiraEn: string;
  creadoEn: string;
}
export const getQRPropio = (usuarioId: string) =>
  api.get<QRPropio>(`/usuarios/${usuarioId}/qr`).then((r) => r.data);
export const crearQR = (usuarioId: string) =>
  api.post<{ qr: QRPropio }>("/qr/create", { usuarioId }).then((r) => r.data.qr);
export const regenerarQR = (usuarioId: string) =>
  api.post<QRPropio>(`/usuarios/${usuarioId}/qr/regenerar`).then((r) => r.data);
export const revocarQR = (usuarioId: string) => api.delete<QRPropio>(`/usuarios/${usuarioId}/qr`).then((r) => r.data);

export interface PerfilEmergencia {
  nombreCompleto: string;
  edad: number | null;
  condiciones: CondicionMedica[];
  medicacionActual: Medicamento[];
  contactosDeEmergencia: { nombreCompleto: string | null; telefono: string | null }[];
  medidasAnticipadas: string | null;
  fechaUltimaActualizacion: string;
}

/* ───────── Dispositivos ───────── */

export type TipoDispositivo = "FITBIT_AIR" | "BOTON_FISICO";
export interface Dispositivo {
  id: string;
  usuarioId: string;
  tipo: TipoDispositivo;
  identificadorExterno: string;
  activo: boolean;
  fechaVinculacion: string;
  ultimaSincronizacion: string | null;
  requiereReautenticacion: boolean;
}
export const getDispositivos = (usuarioId: string) =>
  api.get<Dispositivo[]>("/dispositivos", { params: { usuarioId } }).then((r) => r.data);
export const deleteDispositivo = (id: string) => api.delete(`/dispositivos/${id}`);
export const getGoogleHealthAuthUrl = (usuarioId?: string) =>
  api
    .get<{ authUrl: string }>("/dispositivos/oauth/google-health", { params: usuarioId ? { usuarioId } : undefined })
    .then((r) => r.data.authUrl);
export const syncDispositivo = (id: string) =>
  api.post<{ insertadas: number; tiposConError: string[] }>(`/dispositivos/${id}/sync`).then((r) => r.data);
export interface EstadoHistorico {
  estado: "EN_CURSO" | "TERMINADO" | "ERROR";
  desde: string;
  hasta: string;
  progresoHasta: string;
  insertadas: number;
  tiposConError: string[];
  iniciadoEn: string;
  terminadoEn: string | null;
  error?: string;
}
export const iniciarSyncHistorico = (id: string, desde?: string) =>
  api.post(`/dispositivos/${id}/sync/historico`, desde ? { desde } : {}).then((r) => r.data);
export const getSyncHistorico = (id: string) =>
  api.get<EstadoHistorico>(`/dispositivos/${id}/sync/historico`).then((r) => r.data);
export const registrarBotonFisico =(p: { usuarioId: string; identificadorExterno: string }) =>
  api.post<{ id: string; secreto: string }>("/dispositivos/boton-fisico", p).then((r) => r.data);

export type TipoMedicion = "FRECUENCIA_CARDIACA" | "SPO2" | "SUENO" | "HRV" | "PASOS";

export interface Medicion {
  id: string;
  usuarioId: string;
  dispositivoId: string;
  tipo: TipoMedicion;
  valor: number;
  unidad: string;
  timestamp: string;
}

export const getMediciones = (usuarioId: string, tipo: TipoMedicion, desde?: string) =>
  api.get<Medicion[]>("/mediciones", { params: { usuarioId, tipo, ...(desde && { desde }) } }).then((r) => r.data);

/* ───────── Helpers ───────── */

export function mensajeDeError(err: unknown, fallback = "Ocurrió un error. Probá de nuevo.") {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { message?: string; error?: string } | undefined;
    return d?.message || d?.error || fallback;
  }
  return fallback;
}
