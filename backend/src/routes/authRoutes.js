const express = require('express');
const router = express.Router();
const c = require('../controllers/authController');
const { autenticar } = require('../middlewares/autenticacion');

router.post('/login', c.iniciarSesion);
router.post('/primer-ingreso', c.establecerPrimerPassword);
router.get('/perfil', autenticar, c.obtenerPerfil);
router.put('/perfil', autenticar, c.actualizarPerfil);
router.put('/cambiar-password', autenticar, c.cambiarPassword);
router.get('/mi-membresia', autenticar, c.obtenerMiMembresia);
router.get('/mis-ingresos', autenticar, c.obtenerMisIngresos);
router.post('/mi-salida', autenticar, c.registrarMiSalida);

module.exports = router;
