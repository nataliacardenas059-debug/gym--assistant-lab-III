const express = require('express');
const router = express.Router();
const c = require('../controllers/membresiaController');

router.post('/', c.crearMembresia);
router.get('/', c.obtenerMembresias);
router.get('/:id', c.obtenerMembresia);
router.put('/:id', c.actualizarMembresia);
router.delete('/:id', c.eliminarMembresia);

module.exports = router;
