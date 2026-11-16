require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Persona = require('./src/models/persona');
const { hashPassword } = require('./src/utils/seguridad');
const { autenticar, permitirRoles } = require('./src/middlewares/autenticacion');
const conectarBaseDeDatos = require('./src/configurations/database');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({
  mensaje: 'Bienvenido a Gym Assistant API',
  estado: 'Servidor funcionando'
}));

// Autenticación y cuenta personal.
app.use('/api/auth', require('./src/routes/authRoutes'));

// Gestión de datos: solo el recepcionista puede administrar personas y membresías.
const soloRecepcion = [autenticar, permitirRoles('recepcionista')];
app.use('/api/personas', ...soloRecepcion, require('./src/routes/personaRoutes'));
app.use('/api/membresias', ...soloRecepcion, require('./src/routes/membresiaRoutes'));
app.use('/api/profesores', ...soloRecepcion, require('./src/routes/profesorRoutes'));
app.use('/api/horarios-administrativos', ...soloRecepcion, require('./src/routes/horarioAdministrativoRoutes'));

// Recepción: operaciones de entrada, salida y consulta de historial.
const registroIngresoRoutes = require('./src/routes/registroIngresoRoutes');
app.use('/api/registros', autenticar, (req, res, next) => {
  if (req.path === '/aforo' && ['usuario', 'recepcionista'].includes(req.usuario.rol)) return next();
  if (req.usuario.rol !== 'recepcionista') {
    return res.status(403).json({ mensaje: 'Esta operación está reservada para recepción.' });
  }
  next();
}, registroIngresoRoutes);

async function prepararCuentaRecepcion() {
  const correo = String(process.env.RECEPCION_CORREO || '').trim().toLowerCase();
  const password = process.env.RECEPCION_PASSWORD || '';
  if (!correo || !password) {
    throw new Error('Configura RECEPCION_CORREO y RECEPCION_PASSWORD en backend/.env para crear la cuenta de recepción.');
  }
  if (password.length < 8) throw new Error('RECEPCION_PASSWORD debe tener al menos 8 caracteres.');

  let persona = await Persona.findOne({ correo }).select('+password');
  if (!persona) persona = await Persona.findOne({ tipo_persona: 'recepcionista' }).select('+password');
  if (!persona) {
    persona = await Persona.create({
      nombre_completo: process.env.RECEPCION_NOMBRE || 'Personal de recepción',
      correo,
      numero_documento: process.env.RECEPCION_DOCUMENTO || 'RECEPCION-001',
      tipo_documento: 'OT',
      tipo_persona: 'recepcionista',
      rol: 'recepcionista',
      estado: 'activo',
      password: await hashPassword(password)
    });
    console.log(`Cuenta inicial de recepción creada para ${correo}`);
  } else {
    let cambios = false;
    if (persona.tipo_persona !== 'recepcionista') { persona.tipo_persona = 'recepcionista'; cambios = true; }
    if (persona.rol !== 'recepcionista') { persona.rol = 'recepcionista'; cambios = true; }
    if (!persona.password) { persona.password = await hashPassword(password); cambios = true; }
    if (cambios) await persona.save();
  }
}

async function iniciar() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('Configura JWT_SECRET en backend/.env con al menos 32 caracteres.');
    }
    await conectarBaseDeDatos();
    await prepararCuentaRecepcion();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciar();
