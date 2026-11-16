import { useEffect, useState } from 'react';
import { obtenerMembresia } from './authService';

const formatearFecha = (fecha) => fecha
  ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  : 'No registrada';

export default function MiMembresia({ usuarioId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerMembresia().then((datos) => {
      if (activo) setData(datos);
    });
    return () => { activo = false; };
  }, [usuarioId]);

  if (!data) return <div className="acc-card">Cargando información...</div>;
  if (data.mensaje) return <div className="acc-card">{data.mensaje}</div>;

  const esBeneficio = data.tipo === 'beneficio';
  const activa = esBeneficio || data.estado?.toLowerCase() === 'activa';
  const color = activa ? '#22c55e' : '#ef4444';

  return (
    <div className="acc-card" style={{ borderLeft: `6px solid ${color}` }}>
      <h3>Estado: <span style={{ color }}>{esBeneficio ? 'Beneficio activo' : data.estado}</span></h3>
      <p><strong>Tipo:</strong> {data.tipo}</p>
      {!esBeneficio && <p><strong>Inicio:</strong> {formatearFecha(data.fecha_inicio)}</p>}
      {data.tipo === 'chequera'
        ? <p><strong>Días restantes:</strong> {data.dias_restantes ?? 0}</p>
        : <p><strong>Vencimiento:</strong> {esBeneficio ? 'Sin vencimiento' : formatearFecha(data.fecha_fin)}</p>}
      {esBeneficio && (
        <p>
          Beneficio de profesor vinculado: {data.minutos_acumulados ?? 0} de {data.limite_minutos_semana ?? 120} minutos usados esta semana.
        </p>
      )}
    </div>
  );
}
