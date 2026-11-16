// Utilidades compartidas para enviar el token en todas las peticiones al backend.
// La sesión (usuario + token) se guarda en localStorage con la clave 'gym_sesion'.

export const CLAVE_SESION = 'gym_sesion';

export function obtenerToken() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION))?.token || null;
  } catch {
    return null;
  }
}

// Encabezado Authorization listo para agregar a fetch.
export function encabezadoAutorizacion() {
  const token = obtenerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Si el backend responde 401 (sin sesión, token vencido o inválido),
// se borra la sesión y se envía al usuario al login.
export function manejarSesionVencida(respuesta) {
  if (respuesta.status === 401 && obtenerToken()) {
    localStorage.removeItem(CLAVE_SESION);
    window.location.assign('/login');
  }
}
