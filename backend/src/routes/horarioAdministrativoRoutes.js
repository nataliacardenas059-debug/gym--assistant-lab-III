
const express = require('express');
const router = express.Router();

const {
  obtenerHorarios,
  crearHorario,
  actualizarHorario,
  desactivarHorario
} = require('../controllers/horarioAdministrativoController');

// Consultar todos los horarios.
router.get('/', obtenerHorarios);

// Crear un horario.
router.post('/', crearHorario);

// Actualizar un horario.
router.put('/:id', actualizarHorario);

// Desactivar un horario.
router.patch('/:id/desactivar', desactivarHorario);

module.exports = router;
