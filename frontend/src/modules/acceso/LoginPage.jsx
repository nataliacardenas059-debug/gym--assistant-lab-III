import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { rutaInicio, useAuth } from './AuthContext';
import { crearPassword, iniciarSesion } from './authService';
import './acceso.css';

export default function LoginPage() {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [documento, setDocumento] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [primerIngreso, setPrimerIngreso] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  if (usuario) return <Navigate to={rutaInicio(usuario.rol)} replace />;

  async function enviarLogin(evento) {
    evento.preventDefault();
    setError('');
    setCargando(true);
    try {
      const resultado = await iniciarSesion(correo, password);
      if (resultado.primerIngreso) {
        setPrimerIngreso(true);
        setPassword('');
        return;
      }
      entrar(resultado.usuario);
      navigate(rutaInicio(resultado.usuario.rol), { replace: true });
    } catch (err) {
      setError(err.message || 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  async function crearClaveInicial(evento) {
    evento.preventDefault();
    setError('');
    if (nueva.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden.');
    setCargando(true);
    try {
      const resultado = await crearPassword(correo, documento, nueva);
      entrar(resultado.usuario);
      navigate(rutaInicio(resultado.usuario.rol), { replace: true });
    } catch (err) {
      setError(err.message || 'No fue posible crear la contraseña.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login-page container-fluid">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <div className="row min-vh-100 align-items-center justify-content-center py-4">
        <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">
          <section className="login-card card border-0 shadow-lg">
            <div className="login-brand-icon"><i className="bi bi-heart-pulse-fill" /></div>
            <div className="text-center mb-4">
              <span className="login-eyebrow">PLATAFORMA INSTITUCIONAL</span>
              <h1 className="h3 fw-bold mt-2 mb-2">Gym Assistant</h1>
              <p className="text-secondary mb-0">
                {primerIngreso ? 'Configura tu contraseña para continuar' : 'Ingresa a tu cuenta'}
              </p>
            </div>

            {!primerIngreso ? (
              <form onSubmit={enviarLogin} className="d-grid gap-3">
                <div>
                  <label className="form-label fw-semibold" htmlFor="correo">Correo institucional</label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text"><i className="bi bi-envelope" /></span>
                    <input id="correo" type="email" className="form-control" placeholder="nombre@institucion.edu.co"
                      value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" required />
                  </div>
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="password">Contraseña</label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text"><i className="bi bi-lock" /></span>
                    <input id="password" type={mostrarPassword ? 'text' : 'password'} className="form-control"
                      placeholder="Ingresa tu contraseña" value={password}
                      onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setMostrarPassword((v) => !v)}
                      aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      <i className={`bi ${mostrarPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                    </button>
                  </div>
                </div>
                {error && <div className="alert alert-danger mb-0" role="alert">{error}</div>}
                <button className="btn btn-login btn-lg mt-2" disabled={cargando}>
                  {cargando ? <><span className="spinner-border spinner-border-sm me-2" />Validando...</> : 'Iniciar sesión'}
                </button>
                <button type="button" className="btn btn-link text-decoration-none small" onClick={() => { setPrimerIngreso(true); setError(''); }}>
                  ¿Es tu primer ingreso? Crear contraseña
                </button>
              </form>
            ) : (
              <form onSubmit={crearClaveInicial} className="d-grid gap-3">
                <div>
                  <label className="form-label fw-semibold" htmlFor="correo-inicial">Correo institucional</label>
                  <input id="correo-inicial" type="email" className="form-control form-control-lg"
                    value={correo} onChange={(e) => setCorreo(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="documento">Número de documento</label>
                  <input id="documento" className="form-control form-control-lg" value={documento}
                    onChange={(e) => setDocumento(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="nueva">Crear contraseña</label>
                  <input id="nueva" type="password" className="form-control form-control-lg"
                    value={nueva} onChange={(e) => setNueva(e.target.value)} minLength={8} autoComplete="new-password" required />
                  <div className="form-text">Mínimo 8 caracteres.</div>
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="confirmar">Confirmar contraseña</label>
                  <input id="confirmar" type="password" className="form-control form-control-lg"
                    value={confirmar} onChange={(e) => setConfirmar(e.target.value)} minLength={8} autoComplete="new-password" required />
                </div>
                {error && <div className="alert alert-danger mb-0" role="alert">{error}</div>}
                <button className="btn btn-login btn-lg" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Crear contraseña'}
                </button>
                <button type="button" className="btn btn-link text-decoration-none" onClick={() => { setPrimerIngreso(false); setError(''); }}>
                  Volver al inicio de sesión
                </button>
              </form>
            )}
            <div className="login-footer mt-4 pt-3 text-center">
              <i className="bi bi-shield-lock me-1" /> Acceso seguro · Gym Assistant
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
