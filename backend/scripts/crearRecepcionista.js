// Crea (o actualiza) la cuenta de recepción con una contraseña cifrada.
//
// Uso (desde la carpeta backend):
//   npm run crear-recepcionista -- --correo recepcion@gym.com --documento 900000001 --nombre "Recepción GymAssistant" --password MiClave123
//
// Si ya existe una persona con ese correo y es recepcionista, solo se le cambia la contraseña.

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Persona = require('../src/models/persona');

function leerArgumentos() {
  const args = {};
  const lista = process.argv.slice(2);
  for (let i = 0; i < lista.length; i += 1) {
    if (lista[i].startsWith('--')) {
      args[lista[i].slice(2)] = lista[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const { correo, documento, nombre = 'Recepción GymAssistant', password, tipo_documento = 'CC' } = leerArgumentos();

  if (!correo || !documento || !password) {
    console.log('Faltan datos. Ejemplo:');
    console.log('npm run crear-recepcionista -- --correo recepcion@gym.com --documento 900000001 --nombre "Recepción" --password MiClave123');
    process.exit(1);
  }

  if (password.length < 6) {
    console.log('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Conectado a la base: ${mongoose.connection.name}`);

  const hash = await bcrypt.hash(password, 10);
  const correoNormalizado = correo.trim().toLowerCase();

  const existente = await Persona.findOne({ correo: correoNormalizado });

  if (existente) {
    if (existente.tipo_persona !== 'recepcionista') {
      console.log('Ya existe una persona con ese correo y no es recepcionista. No se modificó nada.');
    } else {
      await Persona.updateOne({ _id: existente._id }, { $set: { password: hash, estado: 'activo' } });
      console.log(`Contraseña actualizada para ${existente.nombre_completo}.`);
    }
  } else {
    const persona = await Persona.create({
      nombre_completo: nombre,
      numero_documento: String(documento),
      tipo_documento,
      tipo_persona: 'recepcionista',
      rol: 'recepcionista',
      correo: correoNormalizado,
      password: hash
    });
    console.log(`Recepcionista creada: ${persona.nombre_completo} (${persona.correo}).`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Error:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
