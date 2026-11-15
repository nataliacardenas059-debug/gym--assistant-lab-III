const Membresia = require('../models/membresia');
const Persona = require('../models/persona');

const CAMPOS_PERMITIDOS = [
  'personaId',
  'fecha_inicio',
  'fecha_fin',
  'tipo',
  'dias_restantes',
  'estado',
  'comprobante',
  'tipo_beneficio',
];

const filtrarCampos = (body) => {
  const datos = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
};

const manejarError = (res, error) => {
  if (error.name === 'ValidationError') {
    const errores = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ mensaje: 'Datos inválidos', errores });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ mensaje: 'ID inválido' });
  }
  return res.status(500).json({ mensaje: error.message });
};

const POPULATE_PERSONA = 'nombre_completo numero_documento tipo_documento tipo_persona estado';

exports.crearMembresia = async (req, res) => {
  try {
    const datos = filtrarCampos(req.body);

    // La persona debe existir y estar activa
    const persona = await Persona.findById(datos.personaId);
    if (!persona) return res.status(404).json({ mensaje: 'La persona no existe' });
    if (persona.estado !== 'activo') {
      return res.status(400).json({ mensaje: 'La persona está inactiva' });
    }

    // Regla de negocio: una sola membresía activa por persona
    const yaActiva = await Membresia.findOne({ personaId: datos.personaId, estado: 'activa' });
    if (yaActiva) {
      return res.status(409).json({ mensaje: 'La persona ya tiene una membresía activa' });
    }

    // El modelo exige null en dias_restantes cuando no es chequera
    if (datos.tipo !== 'chequera') datos.dias_restantes = null;

    const membresia = await Membresia.create(datos);
    res.status(201).json(membresia);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.obtenerMembresias = async (req, res) => {
  try {
    const { estado, tipo, personaId } = req.query;
    const filtro = {};

    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    if (personaId) filtro.personaId = personaId;

    const membresias = await Membresia.find(filtro)
      .populate('personaId', POPULATE_PERSONA)
      .sort({ fecha_fin: -1 });

    res.json(membresias);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.obtenerMembresia = async (req, res) => {
  try {
    const membresia = await Membresia.findById(req.params.id)
      .populate('personaId', POPULATE_PERSONA);
    if (!membresia) return res.status(404).json({ mensaje: 'Membresía no encontrada' });
    res.json(membresia);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.actualizarMembresia = async (req, res) => {
  try {
    const membresia = await Membresia.findById(req.params.id);
    if (!membresia) return res.status(404).json({ mensaje: 'Membresía no encontrada' });

    const datos = filtrarCampos(req.body);

    // No se cambia de dueño una membresía existente
    delete datos.personaId;

    membresia.set(datos);

    // Si cambia a un tipo que no es chequera, se limpia dias_restantes
    if (membresia.tipo !== 'chequera') membresia.dias_restantes = null;

    await membresia.save(); // aquí corren las validaciones del modelo
    res.json(membresia);
  } catch (error) {
    manejarError(res, error);
  }
};

// Eliminación lógica: pasa a inactiva para conservar el historial
exports.eliminarMembresia = async (req, res) => {
  try {
    const membresia = await Membresia.findById(req.params.id);
    if (!membresia) return res.status(404).json({ mensaje: 'Membresía no encontrada' });

    membresia.estado = 'inactiva';
    await membresia.save();

    res.json({ mensaje: 'Membresía desactivada', membresia });
  } catch (error) {
    manejarError(res, error);
  }
};