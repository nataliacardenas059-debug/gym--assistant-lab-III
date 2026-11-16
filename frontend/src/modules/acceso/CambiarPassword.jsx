import { useState } from 'react';
import { cambiarPassword, LONGITUD_MINIMA_PASSWORD } from './authService';

export default function CambiarPassword() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setOk('');

    if (!actual) return setError('Ingresa tu contraseña actual.');
    if (nueva.length < LONGITUD_MINIMA_PASSWORD) {
      return setError(`La nueva contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
    }
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden.');

    setCargando(true);
    try {
      const res = await cambiarPassword(actual, nueva);
      setOk(res.mensaje || 'Contraseña actualizada.');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <form className="acc-form" onSubmit={enviar}>
      <label htmlFor="pass-actual">Contraseña actual</label>
      <input id="pass-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} />

      <label htmlFor="pass-nueva">Nueva contraseña</label>
      <input id="pass-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />

      <label htmlFor="pass-confirmar">Confirmar nueva contraseña</label>
      <input id="pass-confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />

      <button className="acc-btn-primary" disabled={cargando}>
        {cargando ? 'Guardando...' : 'Cambiar contraseña'}
      </button>

      {error && <p className="acc-error">{error}</p>}
      {ok && <p className="acc-ok">{ok}</p>}
    </form>
  );
}
