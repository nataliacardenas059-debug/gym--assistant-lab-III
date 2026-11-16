import { useEffect, useState } from 'react';
import { obtenerAforoActual } from '../services/recepcionService';

function AforoActual() {
  const CAPACIDAD_MAXIMA = 30;
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const respuesta = await obtenerAforoActual();
        if (activo) { setDatos(respuesta); setError(''); }
      } catch (e) {
        if (activo) setError(e.message);
      }
    };
    cargar();
    const intervalo = setInterval(cargar, 10000);
    return () => { activo = false; clearInterval(intervalo); };
  }, []);

  const cantidad = datos?.aforo_actual ?? 0;
  const personas = datos?.personas_dentro ?? [];
  const disponibles = Math.max(0, CAPACIDAD_MAXIMA - cantidad);
  const porcentaje = Math.min(100, cantidad / CAPACIDAD_MAXIMA * 100);

  return (
    <div className="aforo-container">
      <div className="aforo-intro">
        <h5>Control de aforo</h5>
        <p>Ocupación actual consultada directamente desde los registros del gimnasio.</p>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {!datos && !error && <p>Cargando aforo...</p>}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4"><div className="summary-card"><div className="summary-icon icon-blue"><i className="bi bi-people-fill"></i></div><div><p>Personas dentro</p><h3>{cantidad}</h3><small>Ocupación actual</small></div></div></div>
        <div className="col-12 col-md-4"><div className="summary-card"><div className="summary-icon icon-green"><i className="bi bi-door-open-fill"></i></div><div><p>Espacios disponibles</p><h3>{disponibles}</h3><small>De {CAPACIDAD_MAXIMA}</small></div></div></div>
        <div className="col-12 col-md-4"><div className="summary-card"><div className="summary-icon icon-orange"><i className="bi bi-building"></i></div><div><p>Capacidad máxima</p><h3>{CAPACIDAD_MAXIMA}</h3><small>Capacidad configurada</small></div></div></div>
      </div>
      <div className="aforo-card mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3"><h6 className="mb-0">Nivel de ocupación</h6><strong>{porcentaje.toFixed(1)}%</strong></div>
        <div className="progress" role="progressbar" aria-label="Porcentaje de ocupación" aria-valuenow={porcentaje} aria-valuemin="0" aria-valuemax="100" style={{ height: '14px' }}>
          <div className="progress-bar" style={{ width: `${porcentaje}%` }}></div>
        </div>
        <small className="text-muted d-block mt-2">{cantidad} de {CAPACIDAD_MAXIMA} espacios ocupados.</small>
      </div>
      <div className="aforo-card">
        <h6 className="mb-3">Personas actualmente en el gimnasio</h6>
        {personas.length === 0 ? <div className="text-center py-4"><i className="bi bi-people display-5 text-secondary"></i><p className="mt-2 mb-0">Actualmente no hay personas dentro.</p></div> :
          <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Nombre</th><th>Documento</th><th>Tipo</th><th>Entrada</th><th>Estado</th></tr></thead><tbody>
            {personas.map((p) => <tr key={p._id}><td>{p.nombre_completo}</td><td>{p.tipo_documento} - {p.numero_documento}</td><td>{p.tipo_persona}</td><td>{new Date(p.fecha_hora_entrada).toLocaleString('es-CO')}</td><td><span className="badge bg-success">Dentro</span></td></tr>)}
          </tbody></table></div>}
      </div>
    </div>
  );
}
export default AforoActual;
