const Persona = require('../models/persona');

// Solo estos campos se pueden enviar desde este módulo
const CAMPOS_PERMITIDOS = [
  'nombre_completo',
  'numero_documento',
  'tipo_documento',
  'tipo_persona',
  'rol',
  'estado',
  'correo',
  'tipo_acceso',
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
    const campo = Object.keys(error.keyPattern || {})[0] || 'campo';
    return res.status(409).json({ mensaje: `Ya existe una persona con ese ${campo}` });
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

exports.crearPersona = async (req, res) => {
  try {
    const datos = filtrarCampos(req.body);

    // Si no envían rol, se deduce del tipo de persona
    if (!datos.rol) {
      datos.rol = datos.tipo_persona === 'recepcionista' ? 'recepcionista' : 'usuario';
    }

    const persona = await Persona.create(datos);
    res.status(201).json(persona);
  } catch (error) {
    manejarError(res, error);
  }
};

// Filtros opcionales: ?estado=activo&tipo_persona=estudiante&buscar=juan
exports.obtenerPersonas = async (req, res) => {
  try {
    const { estado, tipo_persona, buscar } = req.query;
    const filtro = {};

    if (estado) filtro.estado = estado;
    if (tipo_persona) filtro.tipo_persona = tipo_persona;
    if (buscar) {
      filtro.$or = [
        { nombre_completo: { $regex: buscar, $options: 'i' } },
        { numero_documento: { $regex: buscar, $options: 'i' } },
      ];
    }

    const personas = await Persona.find(filtro).sort({ nombre_completo: 1 });
    res.json(personas);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.obtenerPersona = async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.id);
    if (!persona) return res.status(404).json({ mensaje: 'Persona no encontrada' });
    res.json(persona);
  } catch (error) {
    manejarError(res, error);
  }
};

exports.actualizarPersona = async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.id);
    if (!persona) return res.status(404).json({ mensaje: 'Persona no encontrada' });

    persona.set(filtrarCampos(req.body));
    await persona.save(); // aquí sí corre el hook de rol/tipo_persona

    res.json(persona);
  } catch (error) {
    manejarError(res, error);
  }
};

// Eliminación lógica: pasa a inactivo para no romper membresías ni registros de ingreso
exports.eliminarPersona = async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.id);
    if (!persona) return res.status(404).json({ mensaje: 'Persona no encontrada' });

    persona.estado = 'inactivo';
    await persona.save();

    res.json({ mensaje: 'Persona desactivada', persona });
  } catch (error) {
    manejarError(res, error);
  }
};