const jwt = require('jsonwebtoken');
const Persona = require('../models/persona');

// ==========================================
// VERIFICAR TOKEN
// ==========================================
// Lee el encabezado "Authorization: Bearer <token>", valida el token
// y comprueba que la persona siga existiendo y esté activa.
// Si todo está bien, deja los datos en req.usuario.

const verificarToken = async (req, res, next) => {
  try {
    const encabezado = req.headers.authorization || '';
    const [tipo, token] = encabezado.split(' ');

    if (tipo !== 'Bearer' || !token) {
      return res.status(401).json({
        mensaje: 'Debes iniciar sesión para continuar.'
      });
    }

    let datos;
    try {
      datos = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const mensaje = error.name === 'TokenExpiredError'
        ? 'Tu sesión expiró. Inicia sesión nuevamente.'
        : 'La sesión no es válida. Inicia sesión nuevamente.';

      return res.status(401).json({ mensaje });
    }

    const persona = await Persona.findById(datos.id);

    if (!persona) {
      return res.status(401).json({
        mensaje: 'El usuario de la sesión ya no existe.'
      });
    }

    if (persona.estado !== 'activo') {
      return res.status(403).json({
        mensaje: 'Tu usuario se encuentra inactivo.'
      });
    }

    req.usuario = {
      id: persona._id.toString(),
      rol: persona.rol,
      tipo_persona: persona.tipo_persona,
      persona
    };

    return next();

  } catch (error) {
    console.error('Error al verificar el token:', error);

    return res.status(500).json({
      mensaje: 'Ocurrió un error al verificar la sesión.'
    });
  }
};

// ==========================================
// PERMITIR ROLES
// ==========================================
// Uso: router.get('/', verificarToken, permitirRoles('recepcionista'), controlador)

const permitirRoles = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({
      mensaje: 'Debes iniciar sesión para continuar.'
    });
  }

  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({
      mensaje: 'No tienes permiso para realizar esta acción.'
    });
  }

  return next();
};

// Atajo para las rutas que solo puede usar recepción.
const soloRecepcion = [verificarToken, permitirRoles('recepcionista')];

module.exports = {
  verificarToken,
  permitirRoles,
  soloRecepcion
};
