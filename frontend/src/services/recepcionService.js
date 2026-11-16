const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

function obtenerToken() {
  try { return JSON.parse(localStorage.getItem('gym_sesion') || 'null')?.token || ''; }
  catch { return ''; }
}

async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...(obtenerToken() ? { Authorization: `Bearer ${obtenerToken()}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica que el backend esté encendido.');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || `Error ${respuesta.status} al consultar el servidor.`);
  }
  return datos;
}

export const buscarPersonaPorDocumento = (documento) =>
  solicitar(`/api/registros/persona/${encodeURIComponent(documento)}`);

export const registrarEntrada = (personaId) =>
  solicitar('/api/registros/entrada', {
    method: 'POST',
    body: JSON.stringify({ personaId, metodo_ingreso: 'recepcion' }),
  });

export const registrarSalida = (personaId) =>
  solicitar('/api/registros/salida', {
    method: 'POST',
    body: JSON.stringify({ personaId }),
  });

export const obtenerAforoActual = () => solicitar('/api/registros/aforo');

export const obtenerHistorialIngresos = (parametros = {}) => {
  const query = new URLSearchParams(parametros);
  return solicitar(`/api/registros/historial${query.size ? `?${query}` : ''}`);
};

export const obtenerHorariosAdministrativos = () =>
  solicitar('/api/horarios-administrativos');

export const crearHorarioAdministrativo = (hora_inicio, hora_fin) =>
  solicitar('/api/horarios-administrativos', {
    method: 'POST',
    body: JSON.stringify({ hora_inicio, hora_fin }),
  });

export const desactivarHorarioAdministrativo = (id) =>
  solicitar(`/api/horarios-administrativos/${id}/desactivar`, {
    method: 'PATCH',
  });
