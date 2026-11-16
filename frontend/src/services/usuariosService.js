const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Verifica que el backend esté encendido.');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const detalle = Array.isArray(datos.errores) ? `: ${datos.errores.join(', ')}` : '';
    throw new Error(`${datos.mensaje || `Error ${respuesta.status} al consultar el servidor.`}${detalle}`);
  }
  return datos;
}

const hoyISO = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const fechaISO = (valor) => valor ? new Date(valor).toISOString().slice(0, 10) : '';

function normalizarPersona(persona, membresia, profesor) {
  const esAdministrativo = persona.tipo_persona === 'administrativo';
  const esVinculado = persona.tipo_persona === 'profesor' && profesor?.tipo_profesor === 'vinculado';
  return {
    ...persona,
    id: persona._id,
    correo_institucional: persona.correo || '',
    rol: persona.rol || 'usuario',
    membresia_id: membresia?._id || null,
    membresia_estado: esAdministrativo || esVinculado
      ? 'no_aplica'
      : (membresia?.estado || 'sin_informacion'),
    membresia_tipo: membresia?.tipo || 'mensual',
    membresia_fecha_inicio: fechaISO(membresia?.fecha_inicio),
    membresia_fecha_fin: fechaISO(membresia?.fecha_fin),
    membresia_dias_restantes: membresia?.dias_restantes ?? '',
    tipo_acceso: esAdministrativo ? 'administrativo' : (esVinculado ? 'beneficio_profesor_vinculado' : 'membresia'),
    profesor_id: profesor?._id || null,
    tipo_profesor: profesor?.tipo_profesor || '',
    beneficio_activo: profesor?.beneficio_activo ?? false,
  };
}

export async function obtenerUsuarios() {
  const [personas, membresias, profesores] = await Promise.all([
    solicitar('/api/personas'),
    solicitar('/api/membresias'),
    solicitar('/api/profesores'),
  ]);

  const membresiasPorPersona = new Map();
  membresias.forEach((m) => {
    const personaId = typeof m.personaId === 'object' ? m.personaId?._id : m.personaId;
    if (!personaId) return;
    const anterior = membresiasPorPersona.get(String(personaId));
    if (!anterior || (m.estado === 'activa' && anterior.estado !== 'activa')) {
      membresiasPorPersona.set(String(personaId), m);
    }
  });

  const profesoresPorPersona = new Map();
  profesores.forEach((profesor) => {
    const personaId = typeof profesor.personaId === 'object' ? profesor.personaId?._id : profesor.personaId;
    if (personaId) profesoresPorPersona.set(String(personaId), profesor);
  });

  return personas.map((persona) => normalizarPersona(
    persona,
    membresiasPorPersona.get(String(persona._id)),
    profesoresPorPersona.get(String(persona._id)),
  ));
}

function datosPersona(datos) {
  return {
    nombre_completo: datos.nombre_completo.trim(),
    correo: datos.correo_institucional.trim().toLowerCase(),
    numero_documento: datos.numero_documento.trim(),
    tipo_documento: datos.tipo_documento,
    tipo_persona: datos.tipo_persona,
    estado: datos.estado,
    tipo_acceso: datos.tipo_persona === 'administrativo'
      ? undefined
      : (datos.tipo_persona === 'profesor' && datos.tipo_profesor === 'vinculado' ? 'beneficio' : 'membresia'),
  };
}

async function guardarMembresia(personaId, datos, usuarioActual = null) {
  const noRequiereMembresia = datos.tipo_persona === 'administrativo' ||
    (datos.tipo_persona === 'profesor' && datos.tipo_profesor === 'vinculado') ||
    datos.membresia_estado === 'no_aplica' ||
    datos.membresia_estado === 'sin_informacion';

  if (noRequiereMembresia) {
    if (usuarioActual?.membresia_id && usuarioActual.membresia_estado === 'activa') {
      await solicitar(`/api/membresias/${usuarioActual.membresia_id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: 'inactiva' }),
      });
    }
    return;
  }

  const esChequera = datos.membresia_tipo === 'chequera';
  const dias = Number(datos.membresia_dias_restantes);
  if (esChequera && (!Number.isInteger(dias) || dias < 1)) {
    throw new Error('Indica la cantidad de días comprados (mínimo 1).');
  }
  if (!esChequera && !datos.membresia_fecha_fin) {
    throw new Error('Selecciona la fecha de vencimiento de la membresía mensual.');
  }

  const payload = {
    fecha_inicio: usuarioActual?.membresia_fecha_inicio || hoyISO(),
    fecha_fin: esChequera ? null : datos.membresia_fecha_fin,
    tipo: esChequera ? 'chequera' : 'mensual',
    dias_restantes: esChequera ? dias : null,
    estado: datos.membresia_estado,
    tipo_beneficio: 'ninguno',
  };

  if (usuarioActual?.membresia_id) {
    await solicitar(`/api/membresias/${usuarioActual.membresia_id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } else {
    await solicitar('/api/membresias', {
      method: 'POST',
      body: JSON.stringify({ ...payload, personaId }),
    });
  }
}

async function guardarPerfilProfesor(personaId, datos, usuarioActual = null) {
  if (datos.tipo_persona !== 'profesor') {
    if (usuarioActual?.profesor_id) {
      await solicitar(`/api/profesores/${usuarioActual.profesor_id}`, {
        method: 'PUT',
        body: JSON.stringify({ beneficio_activo: false }),
      });
    }
    return;
  }
  const tipoProfesor = datos.tipo_profesor;
  if (!['vinculado', 'externo'].includes(tipoProfesor)) {
    throw new Error('Selecciona si el profesor es vinculado o externo.');
  }
  const payload = {
    tipo_profesor: tipoProfesor,
    beneficio_activo: tipoProfesor === 'vinculado',
  };
  if (usuarioActual?.profesor_id) {
    await solicitar(`/api/profesores/${usuarioActual.profesor_id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } else {
    await solicitar('/api/profesores', {
      method: 'POST',
      body: JSON.stringify({ ...payload, personaId }),
    });
  }
}

export async function crearUsuario(datos) {
  const persona = await solicitar('/api/personas', {
    method: 'POST',
    body: JSON.stringify(datosPersona(datos)),
  });
  try {
    await guardarPerfilProfesor(persona._id, datos);
    await guardarMembresia(persona._id, datos);
  } catch (error) {
    error.message = `La persona se creó, pero faltó guardar información complementaria: ${error.message}`;
    throw error;
  }
  return normalizarPersona(persona, null, null);
}

export async function actualizarUsuario(id, datos, usuarioActual) {
  const persona = await solicitar(`/api/personas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datosPersona(datos)),
  });
  await guardarPerfilProfesor(persona._id, datos, usuarioActual);
  await guardarMembresia(persona._id, datos, usuarioActual);
  return persona;
}

export async function cambiarEstadoUsuario(id, estado) {
  return solicitar(`/api/personas/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado }),
  });
}
