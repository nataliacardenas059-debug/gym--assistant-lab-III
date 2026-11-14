
const mongoose = require('mongoose');

const HorarioAdministrativo = require('../models/horarioAdministrativo');

// ==========================================
// VALIDAR FORMATO Y DISPONIBILIDAD DEL HORARIO
// ==========================================

const validarHorario = (horaInicio, horaFin) => {
  const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!formatoHora.test(horaInicio) || !formatoHora.test(horaFin)) {
    return 'Las horas deben tener el formato HH:mm.';
  }

  if (horaFin <= horaInicio) {
    return 'La hora de finalización debe ser posterior a la hora de inicio.';
  }

  return null;
};

// Comprobar que no se cruce con otro horario activo.
const comprobarCruceHorario = async (
  horaInicio,
  horaFin,
  excluirId = null
) => {
  const filtros = {
    activo: true,
    hora_inicio: { $lt: horaFin },
    hora_fin: { $gt: horaInicio }
  };

  if (excluirId) {
    filtros._id = { $ne: excluirId };
  }

  return HorarioAdministrativo.findOne(filtros);
};

// ==========================================
// CONSULTAR HORARIOS
// ==========================================

const obtenerHorarios = async (req, res) => {
  try {
    const horarios = await HorarioAdministrativo.find()
      .sort({ hora_inicio: 1 });

    return res.status(200).json({
      total: horarios.length,
      horarios
    });

  } catch (error) {
    console.error('Error al consultar horarios:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al consultar los horarios.'
    });
  }
};

// ==========================================
// CREAR HORARIO
// ==========================================

const crearHorario = async (req, res) => {
  try {
    const { hora_inicio, hora_fin } = req.body;

    if (!hora_inicio || !hora_fin) {
      return res.status(400).json({
        mensaje: 'Debes proporcionar la hora de inicio y finalización.'
      });
    }

    const errorHorario = validarHorario(hora_inicio, hora_fin);

    if (errorHorario) {
      return res.status(400).json({
        mensaje: errorHorario
      });
    }

    const horarioExistente = await comprobarCruceHorario(
      hora_inicio,
      hora_fin
    );

    if (horarioExistente) {
      return res.status(409).json({
        mensaje: 'El horario se cruza con otra franja administrativa activa.'
      });
    }

    const nuevoHorario = await HorarioAdministrativo.create({
      hora_inicio,
      hora_fin,
      activo: true
    });

    return res.status(201).json({
      mensaje: 'Horario administrativo creado correctamente.',
      horario: nuevoHorario
    });

  } catch (error) {
    console.error('Error al crear horario:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al crear el horario.'
    });
  }
};

// ==========================================
// ACTUALIZAR HORARIO
// ==========================================

const actualizarHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const { hora_inicio, hora_fin, activo } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        mensaje: 'El identificador del horario no es válido.'
      });
    }

    const horario = await HorarioAdministrativo.findById(id);

    if (!horario) {
      return res.status(404).json({
        mensaje: 'No se encontró el horario administrativo.'
      });
    }

    const nuevaHoraInicio = hora_inicio ?? horario.hora_inicio;
    const nuevaHoraFin = hora_fin ?? horario.hora_fin;

    const errorHorario = validarHorario(
      nuevaHoraInicio,
      nuevaHoraFin
    );

    if (errorHorario) {
      return res.status(400).json({
        mensaje: errorHorario
      });
    }

    const nuevoEstado = activo ?? horario.activo;

    if (typeof nuevoEstado !== 'boolean') {
      return res.status(400).json({
        mensaje: 'El estado activo debe ser verdadero o falso.'
      });
    }

    if (nuevoEstado) {
      const horarioExistente = await comprobarCruceHorario(
        nuevaHoraInicio,
        nuevaHoraFin,
        id
      );

      if (horarioExistente) {
        return res.status(409).json({
          mensaje: 'El horario se cruza con otra franja administrativa activa.'
        });
      }
    }

    horario.hora_inicio = nuevaHoraInicio;
    horario.hora_fin = nuevaHoraFin;
    horario.activo = nuevoEstado;

    await horario.save();

    return res.status(200).json({
      mensaje: 'Horario administrativo actualizado correctamente.',
      horario
    });

  } catch (error) {
    console.error('Error al actualizar horario:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al actualizar el horario.'
    });
  }
};

// ==========================================
// DESACTIVAR HORARIO
// ==========================================

const desactivarHorario = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        mensaje: 'El identificador del horario no es válido.'
      });
    }

    const horario = await HorarioAdministrativo.findById(id);

    if (!horario) {
      return res.status(404).json({
        mensaje: 'No se encontró el horario administrativo.'
      });
    }

    horario.activo = false;

    await horario.save();

    return res.status(200).json({
      mensaje: 'Horario administrativo desactivado correctamente.',
      horario
    });

  } catch (error) {
    console.error('Error al desactivar horario:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al desactivar el horario.'
    });
  }
};

module.exports = {
  obtenerHorarios,
  crearHorario,
  actualizarHorario,
  desactivarHorario
};
