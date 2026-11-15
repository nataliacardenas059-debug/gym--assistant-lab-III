const express = require('express');
const router = express.Router();
const c = require('../controllers/profesorController');

router.post('/', c.crearProfesor);
router.get('/', c.obtenerProfesores);
router.get('/:id', c.obtenerProfesor);
router.put('/:id', c.actualizarProfesor);
router.delete('/:id', c.eliminarProfesor);

module.exports = router;