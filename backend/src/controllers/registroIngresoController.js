const mongoose = require('mongoose');

const Persona = require('../models/persona');
const Membresia = require('../models/membresia');
const Profesor = require('../models/profesor');
const RegistroIngreso = require('../models/registroIngreso');
const HorarioAdministrativo = require('../models/horarioAdministrativo');

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

// Obtener hora de Colombia en formato HH:mm.
const obtenerHoraColombia = () => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date());
};

// Obtener fecha de Colombia en formato YYYY-MM-DD.
const obtenerFechaColombia = (fecha) => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(fecha);

  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
};

// Comprobar si está activa una franja administrativa.
const estaEnHorarioAdministrativo = async () => {
  const horaActual = obtenerHoraColombia();

  const horarios = await HorarioAdministrativo.find({
    activo: true
  });

  return horarios.some((horario) => (
    horaActual >= horario.hora_inicio &&
    horaActual < horario.hora_fin
  ));
};

// Obtener el lunes de la semana actual según Colombia.
const obtenerInicioSemanaColombia = () => {
  const fecha = obtenerFechaColombia(new Date());
  const [anio, mes, dia] = fecha.split('-').map(Number);

  const inicio = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = inicio.getUTCDay();
  const diferencia = diaSemana === 0 ? 6 : diaSemana - 1;

  inicio.setUTCDate(inicio.getUTCDate() - diferencia);

  return inicio;
};

// Reiniciar los minutos del profesor cuando comienza otra semana.
const prepararSemanaProfesor = async (profesor) => {
  const inicioSemana = obtenerInicioSemanaColombia();

  const semanaAnterior = profesor.inicio_semana_control
    ? new Date(profesor.inicio_semana_control).getTime()
    : null;

  if (semanaAnterior !== inicioSemana.getTime()) {
    profesor.minutos_acumulados = 0;
    profesor.inicio_semana_control = inicioSemana;

    await profesor.save();
  }

  return profesor;
};

// Buscar una membresía o beneficio válido.
const buscarMembresiaValida = async (persona) => {
  const hoy = obtenerFechaColombia(new Date());

  const membresias = await Membresia.find({
    personaId: persona._id,
    estado: 'activa'
  }).sort({ createdAt: -1 });

  return membresias.find((membresia) => {
    const fechaInicio = obtenerFechaColombia(membresia.fecha_inicio);
    const fechaFin = obtenerFechaColombia(membresia.fecha_fin);

    const dentroDeVigencia =
      hoy >= fechaInicio && hoy <= fechaFin;

    if (persona.tipo_persona === 'administrativo') {
      return (
        membresia.tipo === 'beneficio' &&
        membresia.tipo_beneficio === 'administrativo' &&
        dentroDeVigencia
      );
    }

    if (membresia.tipo === 'beneficio') {
      return (
        persona.tipo_persona === 'administrativo' &&
        membresia.tipo_beneficio === 'administrativo' &&
        dentroDeVigencia
      );
    }

    if (membresia.tipo === 'mensual') {
      return dentroDeVigencia;
    }

    if (membresia.tipo === 'chequera') {
      return dentroDeVigencia && membresia.dias_restantes > 0;
    }

    return false;
  }) || null;
};

// ==========================================
// VALIDACIÓN DE ACCESO
// ==========================================

const validarAcceso = async (personaId) => {
  if (!mongoose.isValidObjectId(personaId)) {
    return {
      permitido: false,
      mensaje: 'El identificador de la persona no es válido.'
    };
  }

  const persona = await Persona.findById(personaId);

  if (!persona) {
    return {
      permitido: false,
      mensaje: 'La persona no está registrada.'
    };
  }

  if (persona.estado !== 'activo') {
    return {
      permitido: false,
      mensaje: 'La persona se encuentra inactiva.'
    };
  }

  const registroActivo = await RegistroIngreso.findOne({
    personaId: persona._id,
    estado: 'dentro'
  });

  if (registroActivo) {
    return {
      permitido: false,
      mensaje: 'La persona ya se encuentra dentro del gimnasio.'
    };
  }

  if (persona.tipo_persona === 'recepcionista') {
    return {
      permitido: true,
      mensaje: 'Acceso permitido al recepcionista.',
      persona,
      membresia: null,
      modalidadAcceso: 'recepcionista'
    };
  }

  const horarioAdministrativo = await estaEnHorarioAdministrativo();

  if (
    horarioAdministrativo &&
    ['estudiante', 'profesor'].includes(persona.tipo_persona)
  ) {
    return {
      permitido: false,
      mensaje: 'El acceso está restringido durante el horario administrativo.'
    };
  }

  if (persona.tipo_persona === 'profesor') {
    const profesor = await Profesor.findOne({
      personaId: persona._id
    });

    if (profesor) {
      await prepararSemanaProfesor(profesor);

      if (
        profesor.tipo_profesor === 'vinculado' &&
        profesor.beneficio_activo &&
        profesor.minutos_acumulados < 120
      ) {
        return {
          permitido: true,
          mensaje: 'Acceso permitido por beneficio de profesor vinculado.',
          persona,
          membresia: null,
          profesor,
          modalidadAcceso: 'beneficio_profesor_vinculado'
        };
      }
    }
  }

  const membresia = await buscarMembresiaValida(persona);

  if (!membresia) {
    return {
      permitido: false,
      mensaje: 'La persona no tiene una membresía o beneficio válido.'
    };
  }

  const modalidadAcceso =
    membresia.tipo === 'beneficio'
      ? 'beneficio_administrativo'
      : 'membresia';

  return {
    permitido: true,
    mensaje: 'Acceso permitido.',
    persona,
    membresia,
    modalidadAcceso
  };
};
// ==========================================
// REGISTRAR ENTRADA
// ==========================================


const registrarEntrada = async (req, res) => {
  let chequeraDescontada = false;
  let membresiaDescontada = null;

  try {
    const { personaId, metodo_ingreso } = req.body;

    if (!personaId) {
      return res.status(400).json({
        mensaje: 'Debes proporcionar el identificador de la persona.'
      });
    }

    const validacion = await validarAcceso(personaId);

    if (!validacion.permitido) {
      return res.status(403).json({
        mensaje: validacion.mensaje
      });
    }

    if (validacion.membresia?.tipo === 'chequera') {
      const resultado = await Membresia.updateOne(
        {
          _id: validacion.membresia._id,
          estado: 'activa',
          dias_restantes: { $gt: 0 }
        },
        {
          $inc: { dias_restantes: -1 }
        }
      );

      if (resultado.modifiedCount !== 1) {
        return res.status(403).json({
          mensaje: 'La chequera no tiene días disponibles.'
        });
      }

      chequeraDescontada = true;
      membresiaDescontada = validacion.membresia._id;
    }

    const nuevoRegistro = await RegistroIngreso.create({
      personaId: validacion.persona._id,
      fecha_hora: new Date(),
      metodo_ingreso: metodo_ingreso || 'recepcion',
      modalidad_acceso: validacion.modalidadAcceso,
      estado: 'dentro'
    });

    return res.status(201).json({
      mensaje: 'Entrada registrada correctamente.',
      registro: nuevoRegistro
    });

  } catch (error) {
    if (chequeraDescontada && membresiaDescontada) {
      await Membresia.updateOne(
        { _id: membresiaDescontada },
        { $inc: { dias_restantes: 1 } }
      );
    }

    console.error('Error al registrar entrada:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        mensaje: 'La persona ya tiene una entrada activa.'
      });
    }

    return res.status(500).json({
      mensaje: 'Ocurrió un error al registrar la entrada.'
    });
  }
};

// ==========================================
// REGISTRAR SALIDA
// ==========================================


const registrarSalida = async (req, res) => {
  try {
    const { personaId } = req.body;

    if (!mongoose.isValidObjectId(personaId)) {
      return res.status(400).json({
        mensaje: 'Debes proporcionar un identificador válido.'
      });
    }

    const registro = await RegistroIngreso.findOne({
      personaId,
      estado: 'dentro'
    });

    if (!registro) {
      return res.status(404).json({
        mensaje: 'La persona no tiene una entrada activa.'
      });
    }

    const horaSalida = new Date();

    const tiempoTotal = Math.max(
      0,
      Math.floor(
        (horaSalida.getTime() - registro.fecha_hora.getTime()) / 60000
      )
    );

    // Solo acumular si esta visita utilizó el beneficio del profesor vinculado.
    if (registro.modalidad_acceso === 'beneficio_profesor_vinculado') {
      const profesor = await Profesor.findOne({
        personaId,
        tipo_profesor: 'vinculado',
        beneficio_activo: true
      });

      if (!profesor) {
        return res.status(409).json({
          mensaje: 'No se encontró el beneficio activo del profesor para actualizar sus minutos.'
        });
      }

      await prepararSemanaProfesor(profesor);

      profesor.minutos_acumulados += tiempoTotal;

      await profesor.save();
    }

    registro.hora_salida = horaSalida;
    registro.tiempo_total = tiempoTotal;
    registro.estado = 'finalizado';

    await registro.save();

    return res.status(200).json({
      mensaje: 'Salida registrada correctamente.',
      registro
    });

  } catch (error) {
    console.error('Error al registrar salida:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al registrar la salida.'
    });
  }
};

// ==========================================
// CONSULTAR AFORO ACTUAL
// ==========================================

const obtenerPersonaPorDocumento = async (req, res) => {
  try {
    const documento = String(req.params.documento || '').trim();
    if (!documento) return res.status(400).json({ mensaje: 'Debes proporcionar un número de documento.' });

    const persona = await Persona.findOne({ numero_documento: documento }).select('-password');
    if (!persona) return res.status(404).json({ mensaje: 'No se encontró ninguna persona con ese documento.' });

    const registroActivo = await RegistroIngreso.findOne({ personaId: persona._id, estado: 'dentro' });
    return res.status(200).json({ persona, dentro: Boolean(registroActivo), registroActivo });
  } catch (error) {
    console.error('Error al buscar persona para recepción:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al buscar la persona.' });
  }
};

// ==========================================
// CONSULTAR AFORO ACTUAL
// ==========================================

const obtenerAforoActual = async (req, res) => {
  try {
    const registrosDentro = await RegistroIngreso.find({ estado: 'dentro' })
      .populate('personaId', 'nombre_completo numero_documento tipo_documento tipo_persona')
      .sort({ fecha_hora: 1 });

    return res.status(200).json({
      aforo_actual: registrosDentro.length,
      personas_dentro: registrosDentro
        .filter((registro) => registro.personaId)
        .map((registro) => ({
          ...registro.personaId.toObject(),
          fecha_hora_entrada: registro.fecha_hora
        }))
    });

  } catch (error) {
    console.error('Error al consultar aforo:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al consultar el aforo.'
    });
  }
};

// ==========================================
// CONSULTAR HISTORIAL DE INGRESOS
// ==========================================

const obtenerHistorialIngresos = async (req, res) => {
  try {
    const {
      personaId,
      desde,
      hasta,
      estado,
      pagina = 1,
      limite = 20
    } = req.query;

    const filtros = {};

    if (personaId) {
      if (!mongoose.isValidObjectId(personaId)) {
        return res.status(400).json({
          mensaje: 'El identificador de persona no es válido.'
        });
      }

      filtros.personaId = personaId;
    }

    if (estado) {
      if (!['dentro', 'finalizado'].includes(estado)) {
        return res.status(400).json({
          mensaje: 'El estado indicado no es válido.'
        });
      }

      filtros.estado = estado;
    }

    if (desde || hasta) {
      filtros.fecha_hora = {};

      if (desde) {
        const fechaDesde = new Date(`${desde}T00:00:00-05:00`);

        if (Number.isNaN(fechaDesde.getTime())) {
          return res.status(400).json({
            mensaje: 'La fecha inicial no es válida.'
          });
        }

        filtros.fecha_hora.$gte = fechaDesde;
      }

      if (hasta) {
        const fechaHasta = new Date(`${hasta}T23:59:59.999-05:00`);

        if (Number.isNaN(fechaHasta.getTime())) {
          return res.status(400).json({
            mensaje: 'La fecha final no es válida.'
          });
        }

        filtros.fecha_hora.$lte = fechaHasta;
      }
    }

    const numeroPagina = Math.max(1, parseInt(pagina, 10) || 1);
    const cantidad = Math.min(
      100,
      Math.max(1, parseInt(limite, 10) || 20)
    );

    const total = await RegistroIngreso.countDocuments(filtros);

    const registros = await RegistroIngreso.find(filtros)
      .populate(
        'personaId',
        'nombre_completo numero_documento tipo_persona'
      )
      .sort({ fecha_hora: -1 })
      .skip((numeroPagina - 1) * cantidad)
      .limit(cantidad);

    return res.status(200).json({
      total,
      pagina: numeroPagina,
      limite: cantidad,
      totalPaginas: Math.ceil(total / cantidad),
      registros
    });

  } catch (error) {
    console.error('Error al consultar historial:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al consultar el historial.'
    });
  }
};

// ==========================================
// EXPORTAR FUNCIONES
// ==========================================

module.exports = {
  validarAcceso,
  obtenerPersonaPorDocumento,
  registrarEntrada,
  registrarSalida,
  obtenerAforoActual,
  obtenerHistorialIngresos
};
