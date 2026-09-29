#!/usr/bin/env node
/**
 * Crea cuentas y datos de prueba en el backend usando SOLO su API pública
 * (registro, invitaciones, medicación, ficha, historial, notas y QR).
 *
 *   node scripts/seed-qa.mjs                       # contra http://localhost:3000
 *   API_URL=https://mi-backend node scripts/seed-qa.mjs
 *
 * Es idempotente: si las cuentas ya existen, inicia sesión y completa lo que falte.
 * Cuentas (contraseña común, solo para desarrollo): ver CUENTAS más abajo.
 */
const API = (process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "Nonos-QA-2026";

const CUENTAS = {
  marta: { email: "marta.qa@nonos.test", nombreCompleto: "Marta Gómez", rol: "ADULTO_MAYOR", telefono: "+54 11 5555-0101", fechaNacimiento: "1948-03-14" },
  lucia: { email: "lucia.qa@nonos.test", nombreCompleto: "Lucía Pérez", rol: "FAMILIAR", telefono: "+54 11 5555-0102" },
  diego: { email: "diego.qa@nonos.test", nombreCompleto: "Diego Gómez", rol: "FAMILIAR", telefono: "+54 11 5555-0103" },
};

async function http(method, path, { token, body } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: r.ok, status: r.status, data };
}

async function sesion(c) {
  await http("POST", "/auth/register", { body: { email: c.email, password: PASSWORD, nombreCompleto: c.nombreCompleto, rol: c.rol } });
  const l = await http("POST", "/auth/login", { body: { email: c.email, password: PASSWORD } });
  if (!l.ok) throw new Error(`No se pudo iniciar sesión con ${c.email}: ${l.status} ${JSON.stringify(l.data)}`);
  const me = await http("GET", "/auth/me", { token: l.data.token });
  const user = me.data.user;
  await http("PUT", `/usuarios/${user.id}`, { token: l.data.token, body: { telefono: c.telefono, ...(c.fechaNacimiento && { fechaNacimiento: c.fechaNacimiento }) } });
  return { token: l.data.token, id: user.id };
}

const hm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

async function main() {
  const health = await http("GET", "/health");
  if (!health.ok) throw new Error(`El backend no responde en ${API}`);

  const marta = await sesion(CUENTAS.marta);
  const lucia = await sesion(CUENTAS.lucia);
  const diego = await sesion(CUENTAS.diego);

  // Red de cuidado: Marta invita a Lucía (cuidadora digital); Diego pide acompañar a Marta (familiar).
  const vinculos = await http("GET", `/usuarios/${marta.id}/vinculos`, { token: marta.token });
  const yaVinculado = (id) => vinculos.data.some((v) => v.familiarId === id);

  if (!yaVinculado(lucia.id)) {
    const inv = await http("POST", "/invitaciones", { token: marta.token, body: { emailDestino: CUENTAS.lucia.email, tipoVinculo: "CUIDADOR", tipoCuidador: "DIGITAL", direccion: "EMISOR_ES_ADULTO_MAYOR" } });
    const rec = await http("GET", "/invitaciones/recibidas", { token: lucia.token });
    for (const i of rec.data) await http("POST", `/invitaciones/${i.id}/aceptar`, { token: lucia.token });
    if (!inv.ok && inv.status !== 409) console.warn("Invitación a Lucía:", inv.status, inv.data);
  }
  if (!yaVinculado(diego.id)) {
    await http("POST", "/invitaciones", { token: diego.token, body: { emailDestino: CUENTAS.marta.email, tipoVinculo: "FAMILIAR", direccion: "EMISOR_ES_FAMILIAR" } });
    const rec = await http("GET", "/invitaciones/recibidas", { token: marta.token });
    for (const i of rec.data) await http("POST", `/invitaciones/${i.id}/aceptar`, { token: marta.token });
  }

  await http("PUT", `/usuarios/${marta.id}/contacto-emergencia`, { token: marta.token, body: { familiarId: lucia.id, esContactoEmergencia: true, prioridadContacto: 1 } });
  await http("PUT", `/usuarios/${marta.id}/contacto-emergencia`, { token: marta.token, body: { familiarId: diego.id, esContactoEmergencia: true, prioridadContacto: 2 } });

  // Ficha de salud (solo si está vacía, para poder repetir el script sin duplicar).
  const meds = await http("GET", `/medicamentos?usuarioId=${marta.id}`, { token: marta.token });
  if (meds.data.length === 0) {
    const ahora = new Date();
    const pronto = hm(new Date(ahora.getTime() + 75 * 60000));
    const luego = hm(new Date(ahora.getTime() + 5 * 3600000));
    const pedidos = [
      { nombre: "Enalapril", dosis: "10 mg", horariosDelDia: ["08:00", "20:00"], diasSemana: [], stockActual: 12, stockMinimo: 20 },
      { nombre: "Metformina", dosis: "850 mg", horariosDelDia: ["09:00", pronto, "21:00"], diasSemana: [], stockActual: 60, stockMinimo: 15 },
      { nombre: "Atorvastatina", dosis: "20 mg", horariosDelDia: [luego], diasSemana: [1, 2, 3, 4, 5], stockActual: 30, stockMinimo: 10 },
    ];
    for (const m of pedidos) await http("POST", "/medicamentos", { token: marta.token, body: { ...m, usuarioId: marta.id } });
  }

  const conds = await http("GET", `/condiciones?usuarioId=${marta.id}`, { token: marta.token });
  if (conds.data.length === 0) {
    for (const c of [
      { nombre: "Hipertensión arterial", descripcion: "En tratamiento desde 2015." },
      { nombre: "Diabetes tipo 2", descripcion: "Controlada con metformina y dieta." },
      { nombre: "Alergia a la penicilina", descripcion: "Reacción cutánea severa." },
    ])
      await http("POST", "/condiciones", { token: marta.token, body: { ...c, usuarioId: marta.id } });
  }

  const contactos = await http("GET", `/contactos?usuarioId=${marta.id}`, { token: marta.token });
  if (contactos.data.length === 0) {
    await http("POST", "/contactos", { token: marta.token, body: { nombre: "Rosa (vecina)", telefono: "+54 11 5555-0199", usuarioId: marta.id } });
    await http("POST", "/contactos", { token: marta.token, body: { nombre: "Dr. Sosa (clínico)", telefono: "+54 11 5555-0188", usuarioId: marta.id } });
  }

  await http("PUT", `/usuarios/${marta.id}/medidas-anticipadas`, {
    token: marta.token,
    body: { medidasAnticipadas: "Avisar primero a mi hija Lucía.\nPrefiero ser atendida en el Hospital Italiano.\nNo quiero maniobras de reanimación prolongadas." },
  });

  const hist = await http("GET", `/eventos-historial?usuarioId=${marta.id}`, { token: marta.token });
  if (hist.data.length === 0) {
    const dia = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
    await http("POST", "/eventos-historial", { token: marta.token, body: { usuarioId: marta.id, descripcion: "Caída en el baño, sin lesiones graves.", fecha: dia(40) } });
    await http("POST", "/eventos-historial", { token: lucia.token, body: { usuarioId: marta.id, descripcion: "Internación por neumonía.", fecha: dia(120), fechaFin: dia(112) } });
    await http("POST", "/eventos-historial", { token: marta.token, body: { usuarioId: marta.id, descripcion: "Control con cardiólogo: todo estable.", fecha: dia(9) } });
  }

  const notas = await http("GET", `/notas?usuarioId=${marta.id}`, { token: lucia.token });
  if (notas.data.length === 0) {
    await http("POST", "/notas", { token: lucia.token, body: { usuarioId: marta.id, titulo: "Turno con el cardiólogo", contenido: "El jueves a las 10:30. Llevar los últimos estudios y la lista de medicación." } });
    await http("POST", "/notas", { token: diego.token, body: { usuarioId: marta.id, titulo: "Compras", contenido: "Reponer enalapril esta semana: queda poco stock." } });
  }

  const qr = await http("GET", `/usuarios/${marta.id}/qr`, { token: marta.token });
  if (qr.status === 404) await http("POST", "/qr/create", { token: marta.token, body: { usuarioId: marta.id } });

  console.log("Listo. Cuentas de prueba (contraseña común en este archivo):");
  for (const c of Object.values(CUENTAS)) console.log(`  · ${c.rol === "ADULTO_MAYOR" ? "Adulto mayor" : "Familiar/cuidador"}: ${c.email}`);
  console.log(`IDs → marta: ${marta.id} · lucia: ${lucia.id} · diego: ${diego.id}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
