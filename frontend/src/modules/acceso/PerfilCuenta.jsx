import { useState } from 'react';
import { useAuth } from './AuthContext';
import { actualizarPerfil, cambiarPassword } from './authService';

export default function PerfilCuenta() {
  const { usuario, entrar } = useAuth();
  const [nombre, setNombre] = useState(usuario.nombre || '');
  const [correo, setCorreo] = useState(usuario.correo || '');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function guardarDatos(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');
    setCargando(true);
    try {
      const resultado = await actualizarPerfil({ nombre_completo: nombre, correo });
      entrar({ ...usuario, nombre: resultado.usuario.nombre, correo: resultado.usuario.correo });
      setMensaje('Perfil actualizado correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function guardarClave(evento) {
    evento.preventDefault();
    setMensaje('');
    setError('');
    if (nueva.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.');
    setCargando(true);
    try {
      const resultado = await cambiarPassword(actual, nueva);
      setMensaje(resultado.mensaje);
      setActual('');
      setNueva('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="container-fluid px-0">
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Mi perfil y seguridad</h4>
        <p className="text-secondary mb-0">Administra tus datos personales y tu contraseña.</p>
      </div>
      {mensaje && <div className="alert alert-success">{mensaje}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3"><i className="bi bi-person-vcard me-2 text-primary" />Datos de la cuenta</h5>
              <form onSubmit={guardarDatos} className="d-grid gap-3">
                <div><label className="form-label">Nombre completo</label><input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
                <div><label className="form-label">Correo institucional</label><input type="email" className="form-control" value={correo} onChange={(e) => setCorreo(e.target.value)} required /></div>
                <div><label className="form-label">Tipo de cuenta</label><input className="form-control" value={usuario.tipoPersona || 'Usuario'} disabled /></div>
                <button className="btn btn-primary" disabled={cargando}>Guardar cambios</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3"><i className="bi bi-shield-lock me-2 text-primary" />Cambiar contraseña</h5>
              <form onSubmit={guardarClave} className="d-grid gap-3">
                <div><label className="form-label">Contraseña actual</label><input type="password" className="form-control" value={actual} onChange={(e) => setActual(e.target.value)} required /></div>
                <div><label className="form-label">Nueva contraseña</label><input type="password" className="form-control" minLength="8" value={nueva} onChange={(e) => setNueva(e.target.value)} required /><div className="form-text">Mínimo 8 caracteres.</div></div>
                <button className="btn btn-outline-primary" disabled={cargando}>Actualizar contraseña</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
