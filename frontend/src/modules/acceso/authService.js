import { encabezadoAutorizacion, manejarSesionVencida } from './sesion';

// Autenticación conectada al backend (/api/auth) con MongoDB y JWT.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export const LONGITUD_MINIMA_PASSWORD = 6;

async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...encabezadoAutorizacion(),
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica que el backend esté encendido.');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    manejarSesionVencida(respuesta);
    throw new Error(datos.mensaje || `Error ${respuesta.status} al consultar el servidor.`);
  }
  return datos;
}

// En el frontend la recepción usa el rol 'admin' (rutas /recepcion).
const rolFrontend = (rolBackend) => (rolBackend === 'recepcionista' ? 'admin' : 'usuario');

const aFecha = (valor) => (valor ? String(valor).slice(0, 10) : null);

/* ---------- INICIO DE SESIÓN ---------- */
export async function iniciarSesion(correo, password) {
  const correoNormalizado = correo?.trim().toLowerCase();
  if (!correoNormalizado) throw new Error('Ingresa tu correo institucional.');

  const datos = await solicitar('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo: correoNormalizado, password }),
  });

  if (datos.primerIngreso) return { primerIngreso: true, correo: correoNormalizado };

  const persona = datos.usuario;
  return {
    usuario: {
      id: persona.id,
      nombre: persona.nombre_completo,
      correo: persona.correo,
      rol: rolFrontend(persona.rol),
      tipoPersona: persona.tipo_persona,
      numeroDocumento: persona.numero_documento,
      tipoDocumento: persona.tipo_documento,
      token: datos.token,
    },
  };
}

/* ---------- PRIMER INGRESO ---------- */
export async function crearPassword(correo, numeroDocumento, password) {
  if (!password || password.length < LONGITUD_MINIMA_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
  }
  return solicitar('/api/auth/primer-ingreso', {
    method: 'POST',
    body: JSON.stringify({ correo, numero_documento: numeroDocumento?.trim(), password }),
  });
}

/* ---------- PERFIL Y CONTRASEÑA ---------- */
export async function obtenerPerfil() {
  const datos = await solicitar('/api/auth/perfil');
  return datos.usuario;
}

export async function cambiarPassword(passwordActual, passwordNueva) {
  if (!passwordNueva || passwordNueva.length < LONGITUD_MINIMA_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
  }
  return solicitar('/api/auth/cambiar-password', {
    method: 'PUT',
    body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
  });
}

// Solo recepción: la persona deberá crear una contraseña nueva en su próximo ingreso.
export async function restablecerPassword(personaId) {
  return solicitar(`/api/auth/restablecer-password/${personaId}`, { method: 'PATCH' });
}

/* ---------- INFORMACIÓN DEL USUARIO ---------- */
export async function obtenerMembresia() {
  try {
    const datos = await solicitar('/api/auth/mi-membresia');
    if (datos.mensaje) return { mensaje: datos.mensaje };
    return {
      ...datos,
      fecha_inicio: aFecha(datos.fecha_inicio),
      fecha_fin: aFecha(datos.fecha_fin),
    };
  } catch (error) {
    return { mensaje: error.message };
  }
}

export async function obtenerAforo() {
  try {
    return await solicitar('/api/auth/aforo');
  } catch {
    return { total: 0, capacidad: 30 };
  }
}

// Convierte cada visita (entrada + salida) en movimientos para la tabla "Mis Ingresos".
export async function obtenerHistorial() {
  const { registros = [] } = await solicitar('/api/auth/mis-ingresos');
  const movimientos = [];

  registros.forEach((registro) => {
    movimientos.push({ id: `${registro._id}-e`, tipo: 'entrada', fecha: registro.fecha_hora });
    if (registro.hora_salida) {
      movimientos.push({ id: `${registro._id}-s`, tipo: 'salida', fecha: registro.hora_salida });
    }
  });

  return movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function registrarSalida() {
  try {
    return await solicitar('/api/auth/mi-salida', { method: 'POST' });
  } catch (error) {
    return { mensaje: error.message };
  }
}
