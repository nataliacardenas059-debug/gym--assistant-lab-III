const Persona = require('../models/persona');
const Membresia = require('../models/membresia');
const Profesor = require('../models/profesor');
const RegistroIngreso = require('../models/registroIngreso');
const { hashPassword, verificarPassword, crearToken } = require('../utils/seguridad');

const datosPublicos = (persona) => ({
  id: String(persona._id),
  nombre: persona.nombre_completo,
  correo: persona.correo,
  numeroDocumento: persona.numero_documento,
  tipoPersona: persona.tipo_persona,
  rol: persona.rol === 'recepcionista' ? 'admin' : 'usuario'
});

function validarPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

exports.iniciarSesion = async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!correo || !password) return res.status(400).json({ mensaje: 'Ingresa tu correo y contraseña.' });

    const persona = await Persona.findOne({ correo }).select('+password');
    if (!persona || persona.estado !== 'activo') {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos, o cuenta inactiva.' });
    }
    if (!persona.password) return res.status(200).json({ primerIngreso: true, correo: persona.correo });

    const valida = await verificarPassword(password, persona.password);
    if (!valida) return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });

    // Migración automática de contraseñas antiguas almacenadas sin hash.
    if (!persona.password.startsWith('scrypt$')) {
      persona.password = await hashPassword(password);
      await persona.save();
    }

    const token = crearToken(persona);
    return res.json({ token, usuario: datosPublicos(persona) });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ mensaje: error.message || 'No fue posible iniciar sesión.' });
  }
};

exports.establecerPrimerPassword = async (req, res) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase();
    const documento = String(req.body.numero_documento || '').trim();
    const password = req.body.password;
    if (!correo || !documento || !validarPassword(password)) {
      return res.status(400).json({ mensaje: 'Ingresa correo, documento y una contraseña de mínimo 8 caracteres.' });
    }
    const persona = await Persona.findOne({ correo }).select('+password');
    if (!persona || persona.estado !== 'activo' || persona.numero_documento !== documento) {
      return res.status(400).json({ mensaje: 'No fue posible validar los datos de la cuenta.' });
    }
    if (persona.password) return res.status(409).json({ mensaje: 'La cuenta ya tiene contraseña. Inicia sesión o solicita un restablecimiento al recepcionista.' });

    persona.password = await hashPassword(password);
    await persona.save();
    const token = crearToken(persona);
    return res.status(201).json({ mensaje: 'Contraseña creada correctamente.', token, usuario: datosPublicos(persona) });
  } catch (error) {
    console.error('Error al crear contraseña inicial:', error);
    return res.status(500).json({ mensaje: 'No fue posible crear la contraseña.' });
  }
};

exports.obtenerPerfil = async (req, res) => res.json({ usuario: datosPublicos(req.usuario) });

exports.actualizarPerfil = async (req, res) => {
  try {
    const nombre = req.body.nombre_completo;
    const correo = req.body.correo;
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length < 3) return res.status(400).json({ mensaje: 'El nombre debe tener al menos 3 caracteres.' });
      req.usuario.nombre_completo = nombre.trim();
    }
    if (correo !== undefined) {
      const normalizado = String(correo).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) return res.status(400).json({ mensaje: 'El correo no es válido.' });
      req.usuario.correo = normalizado;
    }
    await req.usuario.save();
    return res.json({ mensaje: 'Perfil actualizado correctamente.', usuario: datosPublicos(req.usuario) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: 'Ese correo ya está registrado.' });
    return res.status(500).json({ mensaje: 'No fue posible actualizar el perfil.' });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const actual = String(req.body.password_actual || '');
    const nueva = req.body.password_nueva;
    if (!validarPassword(nueva)) return res.status(400).json({ mensaje: 'La nueva contraseña debe tener entre 8 y 128 caracteres.' });
    const persona = await Persona.findById(req.usuario._id).select('+password');
    if (!persona.password || !(await verificarPassword(actual, persona.password))) {
      return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta.' });
    }
    persona.password = await hashPassword(nueva);
    await persona.save();
    return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    return res.status(500).json({ mensaje: 'No fue posible cambiar la contraseña.' });
  }
};

exports.obtenerMiMembresia = async (req, res) => {
  try {
    const personaId = req.usuario._id;
    if (req.usuario.tipo_persona === 'administrativo') {
      return res.json({ mensaje: 'Tu tipo de acceso es administrativo; no requiere membresía.' });
    }
    if (req.usuario.tipo_persona === 'profesor') {
      const profesor = await Profesor.findOne({ personaId });
      if (profesor?.tipo_profesor === 'vinculado' && profesor.beneficio_activo) {
        return res.json({ tipo: 'beneficio', estado: 'activo', minutos_acumulados: profesor.minutos_acumulados, limite_semanal: 120, fecha_inicio: profesor.inicio_semana_control, fecha_fin: null });
      }
    }
    const membresia = await Membresia.findOne({ personaId, estado: 'activa' }).sort({ createdAt: -1 });
    if (!membresia) return res.json({ mensaje: 'No tienes una membresía activa registrada.' });
    return res.json({
      tipo: membresia.tipo,
      estado: membresia.estado,
      fecha_inicio: membresia.fecha_inicio,
      fecha_fin: membresia.fecha_fin,
      dias_restantes: membresia.dias_restantes
    });
  } catch (error) {
    return res.status(500).json({ mensaje: 'No fue posible consultar tu membresía.' });
  }
};

exports.obtenerMisIngresos = async (req, res) => {
  try {
    const registros = await RegistroIngreso.find({ personaId: req.usuario._id }).sort({ fecha_hora: -1 }).limit(100);
    const movimientos = [];
    registros.forEach((registro) => {
      movimientos.push({ id: `${registro._id}-entrada`, tipo: 'entrada', fecha: registro.fecha_hora });
      if (registro.hora_salida) movimientos.push({ id: `${registro._id}-salida`, tipo: 'salida', fecha: registro.hora_salida });
    });
    movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return res.json(movimientos);
  } catch (error) {
    return res.status(500).json({ mensaje: 'No fue posible consultar tus ingresos.' });
  }
};

exports.registrarMiSalida = async (req, res, next) => {
  req.body.personaId = String(req.usuario._id);
  return require('./registroIngresoController').registrarSalida(req, res, next);
};
