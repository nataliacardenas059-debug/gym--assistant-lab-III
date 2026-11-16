const Persona = require('../models/persona');
const { verificarToken } = require('../utils/seguridad');

async function autenticar(req, res, next) {
  try {
    const autorizacion = req.headers.authorization || '';
    const token = autorizacion.startsWith('Bearer ') ? autorizacion.slice(7) : null;
    const payload = verificarToken(token);
    if (!payload) return res.status(401).json({ mensaje: 'Sesión inválida o vencida. Inicia sesión nuevamente.' });

    const persona = await Persona.findById(payload.sub);
    if (!persona || persona.estado !== 'activo') {
      return res.status(401).json({ mensaje: 'La cuenta no existe o está inactiva.' });
    }
    req.usuario = persona;
    next();
  } catch (error) {
    next(error);
  }
}

function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta operación.' });
    }
    next();
  };
}

module.exports = { autenticar, permitirRoles };
