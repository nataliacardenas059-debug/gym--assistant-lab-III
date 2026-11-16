const express = require('express');
const router = express.Router();

const {
  iniciarSesion,
  crearPasswordPrimerIngreso,
  cambiarPassword,
  restablecerPassword,
  obtenerPerfil,
  obtenerMiMembresia,
  obtenerMisIngresos,
  obtenerAforoUsuario,
  registrarMiSalida
} = require('../controllers/authController');

const { verificarToken, soloRecepcion } = require('../middlewares/authMiddleware');

// Públicas
router.post('/login', iniciarSesion);
router.post('/primer-ingreso', crearPasswordPrimerIngreso);

// Cualquier persona con sesión
router.get('/perfil', verificarToken, obtenerPerfil);
router.put('/cambiar-password', verificarToken, cambiarPassword);
router.get('/mi-membresia', verificarToken, obtenerMiMembresia);
router.get('/mis-ingresos', verificarToken, obtenerMisIngresos);
router.get('/aforo', verificarToken, obtenerAforoUsuario);
router.post('/mi-salida', verificarToken, registrarMiSalida);

// Solo recepción
router.patch('/restablecer-password/:id', ...soloRecepcion, restablecerPassword);

module.exports = router;
