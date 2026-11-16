import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { rutaInicio, useAuth } from './AuthContext';
import { crearPassword, iniciarSesion, LONGITUD_MINIMA_PASSWORD } from './authService';
import './acceso.css';

export default function LoginPage() {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Paso 2: primer ingreso. Se pide el documento para confirmar la identidad.
  const [correoPrimerIngreso, setCorreoPrimerIngreso] = useState(null);
  const [documento, setDocumento] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');

  if (usuario) return <Navigate to={rutaInicio(usuario.rol)} replace />;

  async function enviarLogin(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      const res = await iniciarSesion(correo, password);
      if (res.primerIngreso) {
        setCorreoPrimerIngreso(res.correo);
        return;
      }
      entrar(res.usuario);
      navigate(rutaInicio(res.usuario.rol), { replace: true });
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  }

  async function enviarNuevaPassword(e) {
    e.preventDefault();
    setError('');
    if (!documento.trim()) return setError('Ingresa tu número de documento');
    if (nueva.length < LONGITUD_MINIMA_PASSWORD) {
      return setError(`La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres`);
    }
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden');

    setCargando(true);
    try {
      await crearPassword(correoPrimerIngreso, documento, nueva);
      setCorreoPrimerIngreso(null);
      setPassword('');
      setDocumento('');
      setNueva('');
      setConfirmar('');
      setError('');
      setMensaje('Contraseña creada. Ahora inicia sesión.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="acc-login-body">
      <div className="acc-login-card">
        <h2>🏋️ GymAssistant</h2>

        {correoPrimerIngreso === null ? (
          <form onSubmit={enviarLogin}>
            <p>Acceso al sistema</p>
            <input
              type="email"
              placeholder="Correo institucional"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="acc-btn-primary" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={enviarNuevaPassword}>
            <p>Es tu primer ingreso. Confirma tu documento y crea una contraseña.</p>
            <input
              type="text"
              placeholder="Número de documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
            <button className="acc-btn-primary" disabled={cargando}>
              {cargando ? 'Guardando...' : 'Crear contraseña'}
            </button>
            <button
              type="button"
              className="acc-btn-link"
              onClick={() => { setCorreoPrimerIngreso(null); setError(''); }}
            >
              Volver
            </button>
          </form>
        )}

        {error && <p className="acc-error">{error}</p>}
        {mensaje && <p className="acc-demo">{mensaje}</p>}
      </div>
    </div>
  );
}
