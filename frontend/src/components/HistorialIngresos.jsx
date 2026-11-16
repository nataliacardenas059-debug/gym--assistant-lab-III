import { useEffect, useMemo, useState } from 'react';
import { obtenerHistorialIngresos } from '../services/recepcionService';

function HistorialIngresos() {
  const [registros, setRegistros] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const datos = await obtenerHistorialIngresos({ limite: '100' });
      setRegistros(datos.registros || []);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => registros.filter((r) => {
    const persona = r.personaId || {};
    const coincideFiltro = filtro === 'todos' || r.estado === filtro;
    const termino = busqueda.toLowerCase();
    const coincideTexto = (persona.nombre_completo || '').toLowerCase().includes(termino) ||
      (persona.numero_documento || '').toLowerCase().includes(termino);
    return coincideFiltro && coincideTexto;
  }), [registros, filtro, busqueda]);

  const fecha = (valor) => valor ? new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pendiente';
  const finalizados = registros.filter((r) => r.estado === 'finalizado').length;
  const activos = registros.filter((r) => r.estado === 'dentro').length;

  return (
    <div className="historial-container">
      <div className="historial-intro"><h5>Historial de ingresos</h5><p>Consulta las visitas registradas en el gimnasio.</p></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4"><div className="summary-card"><div className="summary-icon icon-blue"><i className="bi bi-list-ul"></i></div><div><p>Total de visitas</p><h3>{registros.length}</h3></div></div></div>
        <div className="col-12 col-md-4"><div className="summary-card"><div className="summary-icon icon-green"><i className="bi bi-box-arrow-in-right"></i></div><div><p>Visitas finalizadas</p><h3>{finalizados}</h3></div></div></div>
        <div className="col-12 col-md-4"><div className="summary-card"><div className="summary-icon icon-orange"><i className="bi bi-person-walking"></i></div><div><p>Personas dentro</p><h3>{activos}</h3></div></div></div>
      </div>
      <div className="historial-card">
        <div className="historial-filtros"><div><h6>Visitas registradas</h6><small className="text-muted">{filtrados.length} resultado(s)</small></div>
          <div className="historial-controles">
            <input className="form-control" placeholder="Buscar por nombre o documento" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <select className="form-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todos">Todas las visitas</option><option value="dentro">Dentro actualmente</option><option value="finalizado">Finalizadas</option>
            </select>
            <button className="btn btn-outline-primary" onClick={cargar}>Actualizar</button>
          </div>
        </div>
        {cargando ? <p className="p-4">Cargando historial...</p> : filtrados.length === 0 ? <div className="historial-vacio"><i className="bi bi-inbox"></i><h6>No hay visitas para mostrar</h6><p>Cuando se registren entradas, aparecerán aquí.</p></div> :
          <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th>Persona</th><th>Documento</th><th>Entrada</th><th>Salida</th><th>Duración</th><th>Estado</th><th>Acceso</th></tr></thead><tbody>
            {filtrados.map((r) => <tr key={r._id}><td className="fw-semibold">{r.personaId?.nombre_completo || 'Persona no disponible'}</td><td>{r.personaId?.numero_documento || '—'}</td><td>{fecha(r.fecha_hora)}</td><td>{fecha(r.hora_salida)}</td><td>{r.estado === 'finalizado' ? `${r.tiempo_total} min` : 'En curso'}</td><td><span className={`badge ${r.estado === 'dentro' ? 'bg-success' : 'bg-secondary'}`}>{r.estado === 'dentro' ? 'Dentro' : 'Finalizado'}</span></td><td>{r.modalidad_acceso || '—'}</td></tr>)}
          </tbody></table></div>}
      </div>
    </div>
  );
}
export default HistorialIngresos;
