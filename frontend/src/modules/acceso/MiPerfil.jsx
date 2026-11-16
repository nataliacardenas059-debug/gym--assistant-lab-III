import { useEffect, useState } from 'react';
import { obtenerPerfil } from './authService';
import CambiarPassword from './CambiarPassword';

const formatearFecha = (fecha) => (fecha
  ? new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Sin registros');

export default function MiPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerPerfil()
      .then((datos) => { if (activo) setPerfil(datos); })
      .catch((err) => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, []);

  return (
    <>
      <div className="acc-card">
        <h3>Datos personales</h3>
        {error && <p>{error}</p>}
        {!perfil && !error && <p>Cargando perfil...</p>}
        {perfil && (
          <>
            <p><strong>Nombre:</strong> {perfil.nombre_completo}</p>
            <p><strong>Documento:</strong> {perfil.tipo_documento} {perfil.numero_documento}</p>
            <p><strong>Correo:</strong> {perfil.correo || 'No registrado'}</p>
            <p><strong>Clasificación:</strong> {perfil.tipo_persona}</p>
            <p><strong>Estado:</strong> {perfil.estado}</p>
            <p><strong>Última asistencia:</strong> {formatearFecha(perfil.ultima_asistencia)}</p>
          </>
        )}
      </div>

      <div className="acc-card">
        <h3>Cambiar contraseña</h3>
        <CambiarPassword />
      </div>
    </>
  );
}
