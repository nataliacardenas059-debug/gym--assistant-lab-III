const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ITERACIONES = 16384;
const LONGITUD = 64;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, LONGITUD, { N: ITERACIONES }, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

function verificarPassword(password, almacenada) {
  return new Promise((resolve, reject) => {
    if (typeof almacenada !== 'string') {
      return resolve(false);
    }

    // Compatibilidad con contraseñas antiguas cifradas con bcrypt.
    if (/^\$2[aby]\$/.test(almacenada)) {
      return bcrypt.compare(password, almacenada)
        .then(resolve)
        .catch(reject);
    }

    // Validación de contraseñas cifradas con scrypt.
    if (!almacenada.startsWith('scrypt$')) {
      return resolve(almacenada === password);
    }

    const [, salt, hash] = almacenada.split('$');

    if (!salt || !hash) return resolve(false);

    crypto.scrypt(password, salt, LONGITUD, { N: ITERACIONES }, (error, derivedKey) => {
      if (error) return reject(error);

      const esperado = Buffer.from(hash, 'hex');
      const recibido = derivedKey;

      resolve(
        esperado.length === recibido.length &&
        crypto.timingSafeEqual(esperado, recibido)
      );
    });
  });
}

function crearToken(persona) {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error('Configura JWT_SECRET en backend/.env (mínimo 32 caracteres).');
  }
  const ahora = Math.floor(Date.now() / 1000);
  const encode = (valor) => Buffer.from(JSON.stringify(valor)).toString('base64url');
  const encabezado = encode({ alg: 'HS256', typ: 'JWT' });
  const carga = encode({
    sub: String(persona._id),
    rol: persona.rol,
    iat: ahora,
    exp: ahora + 60 * 60 * 8
  });
  const firma = crypto.createHmac('sha256', secreto).update(`${encabezado}.${carga}`).digest('base64url');
  return `${encabezado}.${carga}.${firma}`;
}

function verificarToken(token) {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || !token) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [encabezado, carga, firma] = partes;
  const firmaEsperada = crypto.createHmac('sha256', secreto).update(`${encabezado}.${carga}`).digest();
  let firmaRecibida;
  try { firmaRecibida = Buffer.from(firma, 'base64url'); } catch { return null; }
  if (firmaEsperada.length !== firmaRecibida.length || !crypto.timingSafeEqual(firmaEsperada, firmaRecibida)) return null;
  try {
    const payload = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8'));
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verificarPassword, crearToken, verificarToken };
