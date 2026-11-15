const express = require('express');
const router = express.Router();
const c = require('../controllers/personaController');

router.post('/', c.crearPersona);
router.get('/', c.obtenerPersonas);
router.get('/:id', c.obtenerPersona);
router.put('/:id', c.actualizarPersona);
router.delete('/:id', c.eliminarPersona);

module.exports = router;