import { useEffect, useState } from 'react';
import { crearHorarioAdministrativo, desactivarHorarioAdministrativo, obtenerHorariosAdministrativos } from '../services/recepcionService';

function HorariosAdministrativos() {
  const [horarios, setHorarios] = useState([]);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('info');
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      const datos = await obtenerHorariosAdministrativos();
      setHorarios(datos.horarios || []);
      setMensaje('');
    } catch (error) {
      setMensaje(error.message);
      setTipoMensaje('danger');
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    try {
      const datos = await crearHorarioAdministrativo(inicio, fin);
      setMensaje(datos.mensaje);
      setTipoMensaje('success');
      setInicio(''); setFin('');
      await cargar();
    } catch (error) {
      setMensaje(error.message);
      setTipoMensaje('danger');
    }
  };

  const desactivar = async (id) => {
    try {
      const datos = await desactivarHorarioAdministrativo(id);
      setMensaje(datos.mensaje);
      setTipoMensaje('success');
      await cargar();
    } catch (error) {
      setMensaje(error.message);
      setTipoMensaje('danger');
    }
  };

  return (
    <div className="horarios-container">
      <div className="horarios-intro"><h5>Horarios administrativos</h5><p>Franjas especiales consultadas y administradas desde el backend.</p></div>
      <div className="horarios-aviso"><i className="bi bi-info-circle-fill"></i><div><strong>Regla de acceso</strong><p>Durante estas franjas, estudiantes y profesores no pueden ingresar. El personal administrativo sí puede ingresar si tiene su beneficio vigente.</p></div></div>
      {mensaje && <div className={`alert alert-${tipoMensaje}`} role="alert">{mensaje}</div>}
      <h6 className="horarios-subtitulo">Franjas horarias registradas</h6>
      {cargando ? <p>Cargando horarios...</p> : horarios.length === 0 ? <p>No hay horarios configurados en la base de datos.</p> :
        <div className="row g-3 mb-4">
          {horarios.map((h) => <div className="col-12 col-md-6" key={h._id}><div className="horario-card">
            <div className="horario-icono"><i className="bi bi-clock"></i></div>
            <div className="flex-grow-1"><small>{h.activo ? 'Horario activo' : 'Horario inactivo'}</small><h4>{h.hora_inicio} - {h.hora_fin}</h4><span className={`badge ${h.activo ? 'bg-success' : 'bg-secondary'}`}>{h.activo ? 'Activo' : 'Inactivo'}</span></div>
            {h.activo && <button className="btn btn-sm btn-outline-danger" onClick={() => desactivar(h._id)}>Desactivar</button>}
          </div></div>)}
        </div>}
      <div className="horarios-card">
        <h6>Agregar una franja horaria</h6>
        <form className="row g-3 align-items-end" onSubmit={crear}>
          <div className="col-12 col-md-4"><label className="form-label" htmlFor="horaInicio">Hora de inicio</label><input id="horaInicio" className="form-control" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></div>
          <div className="col-12 col-md-4"><label className="form-label" htmlFor="horaFin">Hora de finalización</label><input id="horaFin" className="form-control" type="time" value={fin} onChange={(e) => setFin(e.target.value)} required /></div>
          <div className="col-12 col-md-4"><button className="btn btn-primary w-100" type="submit">Agregar horario</button></div>
        </form>
      </div>
      <div className="horarios-nota mt-3"><i className="bi bi-shield-check"></i><p>Los horarios activos son los que utiliza el backend para validar los accesos. Para la configuración inicial, registra 07:00–08:00 y 17:00–18:00.</p></div>
    </div>
  );
}
export default HorariosAdministrativos;
