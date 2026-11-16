
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const conectarBaseDeDatos = require('./src/configurations/database');

// Rutas del módulo de recepción
const registroIngresoRoutes = require('./src/routes/registroIngresoRoutes');
const horarioAdministrativoRoutes = require('./src/routes/horarioAdministrativoRoutes');

// Crear aplicación
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Bienvenido a Gym Assistant API',
    estado: 'Servidor funcionando'
  });
});

// Rutas de gestión de personas
app.use('/api/personas', require('./src/routes/personaRoutes'));
app.use('/api/membresias', require('./src/routes/membresiaRoutes'));
app.use('/api/profesores', require('./src/routes/profesorRoutes'));

// Rutas de recepción
app.use('/api/registros', registroIngresoRoutes);
app.use('/api/horarios-administrativos', horarioAdministrativoRoutes);

// Iniciar servidor
async function iniciar() {
  try {
    await conectarBaseDeDatos();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Servidor listo en http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}
iniciar();