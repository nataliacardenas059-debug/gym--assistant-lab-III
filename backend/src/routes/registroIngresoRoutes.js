

const express = require('express');
const router = express.Router();

const {
  obtenerPersonaPorDocumento,
  registrarEntrada,
  registrarSalida,
  obtenerAforoActual,
  obtenerHistorialIngresos
} = require('../controllers/registroIngresoController');

// Registrar una entrada.
router.get('/persona/:documento', obtenerPersonaPorDocumento);
router.post('/entrada', registrarEntrada);

// Registrar una salida.
router.post('/salida', registrarSalida);

// Consultar el aforo actual.
router.get('/aforo', obtenerAforoActual);

// Consultar el historial de ingresos.
router.get('/historial', obtenerHistorialIngresos);

module.exports = router;
