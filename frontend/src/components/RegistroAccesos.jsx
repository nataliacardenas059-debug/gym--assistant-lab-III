import { useState } from 'react';
import { buscarPersonaPorDocumento, registrarEntrada, registrarSalida } from '../services/recepcionService';

function RegistroAccesos() {
  const [documento, setDocumento] = useState('');
  const [resultado, setResultado] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('info');
  const [cargando, setCargando] = useState(false);

  const buscarUsuario = async () => {
    if (!documento.trim()) {
      setMensaje('Ingresa el número de documento.');
      setTipoMensaje('warning');
      setResultado(null);
      return;
    }
    setCargando(true);
    setMensaje('');
    setResultado(null);
    try {
      const datos = await buscarPersonaPorDocumento(documento.trim());
      setResultado(datos);
    } catch (error) {
      setMensaje(error.message);
      setTipoMensaje('danger');
    } finally {
      setCargando(false);
    }
  };

  const registrar = async (tipo) => {
    if (!resultado?.persona?._id) return;
    setCargando(true);
    setMensaje('');
    try {
      const respuesta = tipo === 'entrada'
        ? await registrarEntrada(resultado.persona._id)
        : await registrarSalida(resultado.persona._id);
      setMensaje(respuesta.mensaje);
      setTipoMensaje('success');
      const actualizado = await buscarPersonaPorDocumento(documento.trim());
      setResultado(actualizado);
    } catch (error) {
      setMensaje(error.message);
      setTipoMensaje('danger');
      try {
        setResultado(await buscarPersonaPorDocumento(documento.trim()));
      } catch { /* conserva el resultado anterior */ }
    } finally {
      setCargando(false);
    }
  };

  const persona = resultado?.persona;

  return (
    <div className="registro-container">
      <div className="registro-intro">
        <h5>Control de acceso</h5>
        <p>Busca a la persona por su documento y registra su entrada o salida.</p>
      </div>
      <div className="registro-card">
        <label htmlFor="documento" className="form-label">Número de documento</label>
        <div className="input-group mb-3">
          <input id="documento" className="form-control" value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarUsuario()}
            placeholder="Ej. 1001234567" />
          <button className="btn btn-primary" onClick={buscarUsuario} disabled={cargando}>
            <i className="bi bi-search me-2"></i>{cargando ? 'Consultando...' : 'Buscar persona'}
          </button>
        </div>

        {mensaje && <div className={`alert alert-${tipoMensaje}`} role="alert">{mensaje}</div>}

        {persona && (
          <div className="usuario-resultado">
            <h6>Información de la persona</h6>
            <div className="usuario-datos">
              <p><strong>Nombre:</strong> {persona.nombre_completo}</p>
              <p><strong>Documento:</strong> {persona.tipo_documento} - {persona.numero_documento}</p>
              <p><strong>Tipo:</strong> {persona.tipo_persona}</p>
              <p><strong>Estado:</strong> {persona.estado}</p>
              <p><strong>Situación:</strong> {resultado.dentro ? 'Dentro del gimnasio' : 'Fuera del gimnasio'}</p>
            </div>
            <div className="registro-botones">
              <button className="btn btn-success" disabled={cargando || resultado.dentro || persona.estado !== 'activo'}
                onClick={() => registrar('entrada')}>
                <i className="bi bi-box-arrow-in-right me-2"></i>Registrar entrada
              </button>
              <button className="btn btn-outline-primary" disabled={cargando || !resultado.dentro}
                onClick={() => registrar('salida')}>
                <i className="bi bi-box-arrow-right me-2"></i>Registrar salida
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegistroAccesos;
