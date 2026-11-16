
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const conectarBaseDeDatos = require('./src/configurations/database');
const { soloRecepcion } = require('./src/middlewares/authMiddleware');
const authRoutes = require('./src/routes/authRoutes');

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

// Rutas de autenticación (login, contraseñas y perfil del usuario)
app.use('/api/auth', authRoutes);

// Rutas de gestión de personas (solo recepción)
app.use('/api/personas', soloRecepcion, require('./src/routes/personaRoutes'));
app.use('/api/membresias', soloRecepcion, require('./src/routes/membresiaRoutes'));
app.use('/api/profesores', soloRecepcion, require('./src/routes/profesorRoutes'));

// Rutas de recepción (solo recepción)
app.use('/api/registros', soloRecepcion, registroIngresoRoutes);
app.use('/api/horarios-administrativos', soloRecepcion, horarioAdministrativoRoutes);

// Iniciar servidor
async function iniciar() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('Falta JWT_SECRET en el archivo .env');
    }

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