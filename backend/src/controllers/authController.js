const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Persona = require('../models/persona');
const Membresia = require('../models/membresia');
const Profesor = require('../models/profesor');
const RegistroIngreso = require('../models/registroIngreso');
const { registrarSalida } = require('./registroIngresoController');

const LONGITUD_MINIMA_PASSWORD = 6;
const RONDAS_BCRYPT = 10;
const LIMITE_MINUTOS_PROFESOR = 120;

// ==========================================
// AYUDAS
// ==========================================

const normalizarCorreo = (correo) => String(correo || '').trim().toLowerCase();

const validarPassword = (password) => {
  if (typeof password !== 'string' || password.length < LONGITUD_MINIMA_PASSWORD) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`;
  }
  return null;
};

const generarToken = (persona) => jwt.sign(
  { id: persona._id.toString(), rol: persona.rol },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRA || '8h' }
);

// Datos públicos de la persona (nunca se envía la contraseña).
const datosUsuario = (persona) => ({
  id: persona._id,
  nombre_completo: persona.nombre_completo,
  correo: persona.correo,
  numero_documento: persona.numero_documento,
  tipo_documento: persona.tipo_documento,
  tipo_persona: persona.tipo_persona,
  rol: persona.rol,
  estado: persona.estado,
  ultima_asistencia: persona.ultima_asistencia
});

// ==========================================
// INICIAR SESIÓN
// POST /api/auth/login  { correo, password }
// ==========================================

const iniciarSesion = async (req, res) => {
  try {
    const correo = normalizarCorreo(req.body.correo);
    const { password } = req.body;

    if (!correo) {
      return res.status(400).json({ mensaje: 'Ingresa tu correo institucional.' });
    }

    const persona = await Persona.findOne({ correo }).select('+password');

    if (!persona) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    if (persona.estado !== 'activo') {
      return res.status(403).json({ mensaje: 'Tu usuario se encuentra inactivo.' });
    }

    // Todavía no ha creado contraseña: el frontend muestra el paso de primer ingreso.
    if (!persona.password) {
      return res.status(200).json({
        primerIngreso: true,
        mensaje: 'Es tu primer ingreso. Debes crear una contraseña.'
      });
    }

    if (!password) {
      return res.status(400).json({ mensaje: 'Ingresa tu contraseña.' });
    }

    const coincide = await bcrypt.compare(password, persona.password);

    if (!coincide) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    return res.status(200).json({
      mensaje: 'Inicio de sesión correcto.',
      token: generarToken(persona),
      usuario: datosUsuario(persona)
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al iniciar sesión.' });
  }
};

// ==========================================
// PRIMER INGRESO (CREAR CONTRASEÑA)
// POST /api/auth/primer-ingreso  { correo, numero_documento, password }
// Se pide el documento para confirmar que quien crea la contraseña es la persona.
// ==========================================

const crearPasswordPrimerIngreso = async (req, res) => {
  try {
    const correo = normalizarCorreo(req.body.correo);
    const numeroDocumento = String(req.body.numero_documento || '').trim();
    const { password } = req.body;

    if (!correo || !numeroDocumento) {
      return res.status(400).json({
        mensaje: 'Debes ingresar tu correo y tu número de documento.'
      });
    }

    const errorPassword = validarPassword(password);
    if (errorPassword) {
      return res.status(400).json({ mensaje: errorPassword });
    }

    const persona = await Persona.findOne({ correo }).select('+password');

    if (!persona || persona.numero_documento !== numeroDocumento) {
      return res.status(400).json({
        mensaje: 'El correo y el documento no coinciden con una persona registrada.'
      });
    }

    if (persona.estado !== 'activo') {
      return res.status(403).json({ mensaje: 'Tu usuario se encuentra inactivo.' });
    }

    if (persona.password) {
      return res.status(409).json({
        mensaje: 'Ya tienes una contraseña. Inicia sesión o pide a recepción que la restablezca.'
      });
    }

    const hash = await bcrypt.hash(password, RONDAS_BCRYPT);
    await Persona.updateOne({ _id: persona._id }, { $set: { password: hash } });

    return res.status(201).json({
      mensaje: 'Contraseña creada correctamente. Ahora puedes iniciar sesión.'
    });

  } catch (error) {
    console.error('Error al crear la contraseña:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al crear la contraseña.' });
  }
};

// ==========================================
// CAMBIAR CONTRASEÑA (USUARIO CON SESIÓN)
// PUT /api/auth/cambiar-password  { password_actual, password_nueva }
// ==========================================

const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual) {
      return res.status(400).json({ mensaje: 'Ingresa tu contraseña actual.' });
    }

    const errorPassword = validarPassword(password_nueva);
    if (errorPassword) {
      return res.status(400).json({ mensaje: errorPassword });
    }

    const persona = await Persona.findById(req.usuario.id).select('+password');

    if (!persona?.password || !(await bcrypt.compare(password_actual, persona.password))) {
      return res.status(400).json({ mensaje: 'La contraseña actual no es correcta.' });
    }

    if (await bcrypt.compare(password_nueva, persona.password)) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe ser diferente a la actual.' });
    }

    const hash = await bcrypt.hash(password_nueva, RONDAS_BCRYPT);
    await Persona.updateOne({ _id: persona._id }, { $set: { password: hash } });

    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente.' });

  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al cambiar la contraseña.' });
  }
};

// ==========================================
// RESTABLECER CONTRASEÑA (SOLO RECEPCIÓN)
// PATCH /api/auth/restablecer-password/:id
// Borra la contraseña; la persona vuelve a hacer el primer ingreso.
// ==========================================

const restablecerPassword = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: 'El identificador no es válido.' });
    }

    const persona = await Persona.findById(id);

    if (!persona) {
      return res.status(404).json({ mensaje: 'Persona no encontrada.' });
    }

    if (persona._id.toString() === req.usuario.id) {
      return res.status(400).json({
        mensaje: 'No puedes restablecer tu propia contraseña; usa cambiar contraseña.'
      });
    }

    await Persona.updateOne({ _id: persona._id }, { $unset: { password: '' } });

    return res.status(200).json({
      mensaje: `Contraseña restablecida. ${persona.nombre_completo} deberá crear una nueva en su próximo ingreso.`
    });

  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al restablecer la contraseña.' });
  }
};

// ==========================================
// PERFIL DEL USUARIO
// GET /api/auth/perfil
// ==========================================

const obtenerPerfil = async (req, res) => {
  return res.status(200).json({ usuario: datosUsuario(req.usuario.persona) });
};

// ==========================================
// MI MEMBRESÍA
// GET /api/auth/mi-membresia
// ==========================================

const obtenerMiMembresia = async (req, res) => {
  try {
    const { persona } = req.usuario;

    if (persona.tipo_persona === 'administrativo') {
      return res.status(200).json({
        aplica: false,
        mensaje: 'Tu tipo de acceso es administrativo; no requiere membresía.'
      });
    }

    if (persona.tipo_persona === 'recepcionista') {
      return res.status(200).json({
        aplica: false,
        mensaje: 'El personal de recepción no requiere membresía.'
      });
    }

    if (persona.tipo_persona === 'profesor') {
      const profesor = await Profesor.findOne({ personaId: persona._id });

      if (profesor?.tipo_profesor === 'vinculado' && profesor.beneficio_activo) {
        return res.status(200).json({
          aplica: true,
          tipo: 'beneficio',
          estado: 'activa',
          tipo_beneficio: 'profesor',
          minutos_acumulados: profesor.minutos_acumulados,
          limite_minutos_semana: LIMITE_MINUTOS_PROFESOR
        });
      }
    }

    const membresia =
      await Membresia.findOne({ personaId: persona._id, estado: 'activa' }).sort({ createdAt: -1 }) ||
      await Membresia.findOne({ personaId: persona._id }).sort({ createdAt: -1 });

    if (!membresia) {
      return res.status(200).json({
        aplica: true,
        mensaje: 'No tienes una membresía registrada. Acércate a recepción.'
      });
    }

    return res.status(200).json({
      aplica: true,
      tipo: membresia.tipo,
      estado: membresia.estado,
      fecha_inicio: membresia.fecha_inicio,
      fecha_fin: membresia.fecha_fin,
      dias_restantes: membresia.dias_restantes
    });

  } catch (error) {
    console.error('Error al consultar la membresía del usuario:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al consultar tu membresía.' });
  }
};

// ==========================================
// MIS INGRESOS
// GET /api/auth/mis-ingresos
// ==========================================

const obtenerMisIngresos = async (req, res) => {
  try {
    const registros = await RegistroIngreso.find({ personaId: req.usuario.id })
      .sort({ fecha_hora: -1 })
      .limit(50);

    return res.status(200).json({ total: registros.length, registros });

  } catch (error) {
    console.error('Error al consultar los ingresos del usuario:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al consultar tus ingresos.' });
  }
};

// ==========================================
// AFORO PARA USUARIOS (solo la cantidad, sin nombres)
// GET /api/auth/aforo
// ==========================================

const obtenerAforoUsuario = async (req, res) => {
  try {
    const total = await RegistroIngreso.countDocuments({ estado: 'dentro' });
    const capacidad = Number(process.env.AFORO_MAXIMO) || 30;

    return res.status(200).json({ total, capacidad });

  } catch (error) {
    console.error('Error al consultar el aforo:', error);
    return res.status(500).json({ mensaje: 'Ocurrió un error al consultar el aforo.' });
  }
};

// ==========================================
// REGISTRAR MI SALIDA
// POST /api/auth/mi-salida
// Reutiliza la lógica de recepción, pero solo para la persona de la sesión.
// ==========================================

const registrarMiSalida = (req, res) => {
  req.body = { personaId: req.usuario.id };
  return registrarSalida(req, res);
};

module.exports = {
  iniciarSesion,
  crearPasswordPrimerIngreso,
  cambiarPassword,
  restablecerPassword,
  obtenerPerfil,
  obtenerMiMembresia,
  obtenerMisIngresos,
  obtenerAforoUsuario,
  registrarMiSalida
};
