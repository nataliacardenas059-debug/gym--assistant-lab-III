require('dotenv').config();

const express = require('express');
const cors = require('cors');

const conectarBaseDeDatos = require('./src/configurations/database');
const registroIngresoRoutes = require('./src/routes/registroIngresoRoutes');
const horarioAdministrativoRoutes = require('./src/routes/horarioAdministrativoRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/api/horarios-administrativos', horarioAdministrativoRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Bienvenido a Gym Assistant API',
    estado: 'Servidor funcionando'
  });
});

// Rutas de la aplicación
app.use('/api/registros', registroIngresoRoutes);

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

