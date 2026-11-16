import { useEffect, useState } from 'react';

const formularioVacio = {
  nombre_completo: '',
  correo_institucional: '',
  tipo_documento: 'CC',
  numero_documento: '',
  tipo_persona: 'estudiante',
  tipo_profesor: 'externo',
  estado: 'activo',
  membresia_estado: 'activa',
  membresia_tipo: 'mensual',
  membresia_fecha_fin: '',
  membresia_dias_restantes: '',
};

function FormularioUsuario({ usuario, onGuardar, onCancelar, guardando = false }) {
  const [datos, setDatos] = useState(formularioVacio);
  const [error, setError] = useState('');

  useEffect(() => {
    if (usuario) {
      const esAdministrativo = usuario.tipo_persona === 'administrativo';
      const esVinculado = usuario.tipo_persona === 'profesor' && usuario.tipo_profesor === 'vinculado';
      setDatos({
        ...formularioVacio,
        ...usuario,
        tipo_profesor: usuario.tipo_profesor || 'externo',
        membresia_estado: esAdministrativo || esVinculado
          ? 'no_aplica'
          : (usuario.membresia_estado || 'sin_informacion'),
        membresia_tipo: usuario.membresia_tipo === 'chequera' ? 'chequera' : 'mensual',
        membresia_fecha_fin: usuario.membresia_fecha_fin || '',
        membresia_dias_restantes: usuario.membresia_dias_restantes ?? '',
        correo_institucional: usuario.correo_institucional || '',
      });
    } else {
      setDatos(formularioVacio);
    }
    setError('');
  }, [usuario]);

  const cambiar = (evento) => {
    const { name, value } = evento.target;
    setDatos((anterior) => {
      const nuevos = { ...anterior, [name]: value };
      if (name === 'tipo_persona') {
        if (value === 'administrativo') nuevos.membresia_estado = 'no_aplica';
        else if (anterior.tipo_persona === 'administrativo') nuevos.membresia_estado = 'activa';
        if (value !== 'profesor') nuevos.tipo_profesor = 'externo';
      }
      if (name === 'tipo_profesor') {
        nuevos.membresia_estado = value === 'vinculado' ? 'no_aplica' : 'activa';
      }
      if (name === 'membresia_tipo') {
        if (value === 'chequera') nuevos.membresia_fecha_fin = '';
        else nuevos.membresia_dias_restantes = '';
      }
      return nuevos;
    });
  };

  const enviar = (evento) => {
    evento.preventDefault();
    setError('');

    if (!datos.nombre_completo.trim() || !datos.numero_documento.trim() || !datos.correo_institucional.trim()) {
      setError('Completa el nombre, el correo institucional y el número de documento.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo_institucional.trim())) {
      setError('Ingresa un correo institucional válido.');
      return;
    }
    if (!/^\d{5,15}$/.test(datos.numero_documento.trim())) {
      setError('El documento debe contener entre 5 y 15 números.');
      return;
    }
    if (datos.tipo_persona === 'profesor' && !['vinculado', 'externo'].includes(datos.tipo_profesor)) {
      setError('Especifica si el profesor es vinculado o externo.');
      return;
    }

    const requiereMembresia = datos.tipo_persona !== 'administrativo' &&
      !(datos.tipo_persona === 'profesor' && datos.tipo_profesor === 'vinculado');
    if (requiereMembresia && ['activa', 'inactiva'].includes(datos.membresia_estado)) {
      if (datos.membresia_tipo === 'mensual' && !datos.membresia_fecha_fin) {
        setError('Selecciona la fecha de vencimiento de la membresía mensual.');
        return;
      }
      if (datos.membresia_tipo === 'chequera' && (!Number.isInteger(Number(datos.membresia_dias_restantes)) || Number(datos.membresia_dias_restantes) < 1)) {
        setError('Indica la cantidad de días comprados (mínimo 1).');
        return;
      }
    }

    onGuardar(datos);
  };

  const esAdministrativo = datos.tipo_persona === 'administrativo';
  const esProfesorVinculado = datos.tipo_persona === 'profesor' && datos.tipo_profesor === 'vinculado';
  const requiereMembresia = !esAdministrativo && !esProfesorVinculado;

  return (
    <form onSubmit={enviar}>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="alert alert-info py-2" role="note">
        Las credenciales de inicio de sesión se administran desde el módulo de autenticación; este formulario registra los datos personales y la información de acceso.
      </div>

      <div className="row g-3">
        <div className="col-12">
          <label className="form-label" htmlFor="nombre_completo">Nombre completo</label>
          <input id="nombre_completo" name="nombre_completo" className="form-control" value={datos.nombre_completo} onChange={cambiar} placeholder="Ej. María Gómez" maxLength="100" required />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="correo_institucional">Correo institucional</label>
          <input id="correo_institucional" name="correo_institucional" type="email" className="form-control" value={datos.correo_institucional} onChange={cambiar} placeholder="usuario@pascualbravo.edu.co" required />
        </div>

        <div className="col-md-4">
          <label className="form-label" htmlFor="tipo_documento">Tipo de documento</label>
          <select id="tipo_documento" name="tipo_documento" className="form-select" value={datos.tipo_documento} onChange={cambiar}>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PP">Pasaporte</option>
          </select>
        </div>

        <div className="col-md-8">
          <label className="form-label" htmlFor="numero_documento">Número de documento</label>
          <input id="numero_documento" name="numero_documento" className="form-control" value={datos.numero_documento} onChange={cambiar} inputMode="numeric" placeholder="Solo números" maxLength="15" required />
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="tipo_persona">Clasificación</label>
          <select id="tipo_persona" name="tipo_persona" className="form-select" value={datos.tipo_persona} onChange={cambiar}>
            <option value="estudiante">Estudiante</option>
            <option value="profesor">Profesor</option>
            <option value="administrativo">Administrativo</option>
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label" htmlFor="estado">Estado del usuario</label>
          <select id="estado" name="estado" className="form-select" value={datos.estado} onChange={cambiar}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        {datos.tipo_persona === 'profesor' && (
          <>
            <div className="col-12"><hr className="my-1" /><h6 className="mb-0">Información del profesor</h6></div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="tipo_profesor">Vinculación</label>
              <select id="tipo_profesor" name="tipo_profesor" className="form-select" value={datos.tipo_profesor} onChange={cambiar}>
                <option value="vinculado">Profesor vinculado</option>
                <option value="externo">Profesor externo</option>
              </select>
            </div>
            {esProfesorVinculado && (
              <div className="col-12">
                <div className="alert alert-success mb-0">
                  <strong>Beneficio de profesor vinculado:</strong> puede ingresar utilizando el beneficio de hasta 120 minutos semanales. No requiere membresía.
                </div>
              </div>
            )}
          </>
        )}

        {requiereMembresia && (
          <>
            <div className="col-12"><hr className="my-1" /><h6 className="mb-0">Información de membresía</h6></div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="membresia_estado">Estado de membresía</label>
              <select id="membresia_estado" name="membresia_estado" className="form-select" value={datos.membresia_estado} onChange={cambiar}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
                <option value="sin_informacion">Sin información</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="membresia_tipo">Tipo de membresía</label>
              <select id="membresia_tipo" name="membresia_tipo" className="form-select" value={datos.membresia_tipo} onChange={cambiar} disabled={!['activa', 'inactiva'].includes(datos.membresia_estado)}>
                <option value="mensual">Mensual</option>
                <option value="chequera">Por días</option>
              </select>
            </div>
            {datos.membresia_tipo === 'mensual' ? (
              <div className="col-md-4">
                <label className="form-label" htmlFor="membresia_fecha_fin">Fecha de vencimiento</label>
                <input id="membresia_fecha_fin" name="membresia_fecha_fin" type="date" className="form-control" value={datos.membresia_fecha_fin} onChange={cambiar} disabled={!['activa', 'inactiva'].includes(datos.membresia_estado)} />
              </div>
            ) : (
              <div className="col-md-4">
                <label className="form-label" htmlFor="membresia_dias_restantes">Cantidad de días comprados</label>
                <input id="membresia_dias_restantes" name="membresia_dias_restantes" type="number" min="1" step="1" className="form-control" value={datos.membresia_dias_restantes} onChange={cambiar} placeholder="Ej. 10" disabled={!['activa', 'inactiva'].includes(datos.membresia_estado)} />
                <div className="form-text">No se asigna fecha de finalización. Se descuenta un día por cada ingreso.</div>
              </div>
            )}
          </>
        )}
        {esAdministrativo && <div className="col-12"><div className="alert alert-secondary mb-0">Los administrativos utilizan sus franjas de acceso y no requieren membresía.</div></div>}
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={guardando}><i className="bi bi-check2-circle me-2"></i>{guardando ? 'Guardando...' : (usuario ? 'Guardar cambios' : 'Registrar persona')}</button>
      </div>
    </form>
  );
}

export default FormularioUsuario;
