import { useEffect, useState } from 'react';
import { obtenerMembresia } from './authService';

const formatearFecha = (fecha) => {
  if (!fecha) return 'No registrada';
  const valor = /^\\d{4}-\\d{2}-\\d{2}$/.test(fecha)
    ? new Date(`${fecha}T00:00:00`)
    : new Date(fecha);
  return Number.isNaN(valor.getTime())
    ? 'No registrada'
    : valor.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function MiMembresia({ usuarioId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerMembresia(usuarioId).then((datos) => {
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
      <p><strong>Inicio / última asistencia:</strong> {formatearFecha(data.fecha_inicio)}</p>
      <p><strong>Vencimiento:</strong> {esBeneficio ? 'Sin vencimiento' : data.tipo === 'chequera' ? 'Por días de uso' : formatearFecha(data.fecha_fin)}</p>
      {data.tipo === 'chequera' && <p><strong>Días disponibles:</strong> {data.dias_restantes ?? 0}</p>}
      {esBeneficio && data.limite_semanal && <p><strong>Minutos usados esta semana:</strong> {data.minutos_acumulados || 0} de {data.limite_semanal}</p>}
      {esBeneficio && <p>Beneficio institucional.</p>}
    </div>
  );
}
