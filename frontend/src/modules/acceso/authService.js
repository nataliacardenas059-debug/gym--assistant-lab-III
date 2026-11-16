const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

function tokenActual() {
  try { return JSON.parse(localStorage.getItem('gym_sesion') || 'null')?.token || ''; }
  catch { return ''; }
}

async function solicitar(ruta, opciones = {}, requiereSesion = true) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...(requiereSesion && tokenActual() ? { Authorization: `Bearer ${tokenActual()}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica que el backend esté encendido.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.mensaje || `Error ${respuesta.status} al consultar el servidor.`);
  return datos;
}

export const USAR_SIMULADO = false;

export async function iniciarSesion(correo, password) {
  const datos = await solicitar('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, password }),
  }, false);
  if (datos.primerIngreso) return { primerIngreso: true, correo: datos.correo };
  return { usuario: { ...datos.usuario, token: datos.token } };
}

export async function crearPassword(correo, numero_documento, password) {
  const datos = await solicitar('/api/auth/primer-ingreso', {
    method: 'POST',
    body: JSON.stringify({ correo, numero_documento, password }),
  }, false);
  return { usuario: { ...datos.usuario, token: datos.token } };
}

export async function obtenerPerfil() {
  return (await solicitar('/api/auth/perfil')).usuario;
}

export async function actualizarPerfil(datos) {
  return solicitar('/api/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}

export async function cambiarPassword(password_actual, password_nueva) {
  return solicitar('/api/auth/cambiar-password', {
    method: 'PUT',
    body: JSON.stringify({ password_actual, password_nueva }),
  });
}

export async function obtenerMembresia() {
  return solicitar('/api/auth/mi-membresia');
}

export async function obtenerAforo() {
  const datos = await solicitar('/api/registros/aforo');
  return { total: datos.aforo_actual || 0, capacidad: 30 };
}

export async function obtenerHistorial() {
  return solicitar('/api/auth/mis-ingresos');
}

export async function registrarSalida() {
  return solicitar('/api/auth/mi-salida', { method: 'POST', body: JSON.stringify({}) });
}
