const Profesor = require('../models/profesor');
const Persona = require('../models/persona');

const CAMPOS_PERMITIDOS = [
  'personaId',
  'tipo_profesor',
  'horas_semana',
  'beneficio_activo',
];

const filtrarCampos = (body) => {
  const datos = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
};

const manejarError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({ mensaje: 'Esa persona ya está registrada como profesor' });
  }
  if (error.name === 'ValidationError') {
    const errores = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ mensaje: 'ID inválido' });
  }
  return res.status(500).json({ mensaje: error.message });
};

const POPULATE_PERSONA = 'nombre_completo numero_documento tipo_documento tipo_persona estado correo';

exports.crearProfesor = async (req, res) => {
  try {
    const datos = filtrarCampos(req.body);

    const persona = await Persona.findById(datos.personaId);
    if (!persona) return res.status(404).json({ mensaje: 'La persona no existe' });
    if (persona.estado !== 'activo') {
      return res.status(400).json({ mensaje: 'La persona está inactiva' });
    }
    if (persona.tipo_persona !== 'profesor') {
      return res.status(400).json({ mensaje: 'La persona debe ser de tipo profesor' });
    }

    const profesor = await Profesor.create(datos);
    res.status(201).json(profesor);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.obtenerProfesores = async (req, res) => {
  try {
    const { tipo_profesor, beneficio_activo } = req.query;
    const filtro = {};

    if (tipo_profesor) filtro.tipo_profesor = tipo_profesor;
    if (beneficio_activo !== undefined) filtro.beneficio_activo = beneficio_activo === 'true';

    const profesores = await Profesor.find(filtro)
      .populate('personaId', POPULATE_PERSONA)
      .sort({ createdAt: -1 });

    res.json(profesores);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.obtenerProfesor = async (req, res) => {
  try {
    const profesor = await Profesor.findById(req.params.id)
      .populate('personaId', POPULATE_PERSONA);
    if (!profesor) return res.status(404).json({ mensaje: 'Profesor no encontrado' });
    res.json(profesor);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.actualizarProfesor = async (req, res) => {
  try {
    const profesor = await Profesor.findById(req.params.id);
    if (!profesor) return res.status(404).json({ mensaje: 'Profesor no encontrado' });

    const datos = filtrarCampos(req.body);

    // No se cambia la persona de un registro existente
    delete datos.personaId;

    profesor.set(datos);
    await profesor.save();

    res.json(profesor);
  } catch (error) {
    manejarError(res, error);
  }
};

// Eliminación lógica: se desactiva el beneficio para conservar el historial
exports.eliminarProfesor = async (req, res) => {
  try {
    const profesor = await Profesor.findById(req.params.id);
    if (!profesor) return res.status(404).json({ mensaje: 'Profesor no encontrado' });

    profesor.beneficio_activo = false;
    await profesor.save();

    res.json({ mensaje: 'Beneficio del profesor desactivado', profesor });
  } catch (error) {
    manejarError(res, error);
  }
};