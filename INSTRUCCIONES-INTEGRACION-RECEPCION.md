# Integración del módulo de recepción

Este paquete contiene los archivos modificados para conectar el frontend de recepción con el backend de MongoDB.

## Aplicar los cambios
1. Descomprime este paquete en la raíz de tu repositorio `gym-assistant-lab-III`, conservando las carpetas `frontend/` y `backend/`. Acepta reemplazar los archivos cuando Windows lo pregunte.
2. No reemplaces tu archivo `.env`; este paquete no lo incluye.
3. En una terminal, inicia el backend desde `backend/` con `npm run dev`.
4. En otra terminal, inicia el frontend desde `frontend/` con `npm run dev`.
5. Abre el panel de recepción y prueba búsqueda por documento, entrada, salida, aforo, historial y horarios.

## Endpoint nuevo
Se agregó `GET /api/registros/persona/:documento` para que recepción consulte una persona sin depender de `localStorage`. También se amplió `GET /api/registros/aforo` para devolver el conteo y la lista de personas que están dentro.

## Importante
- El endpoint de búsqueda solo consulta personas ya existentes en MongoDB. El ZIP actual todavía no contiene las rutas CRUD del módulo de personas.
- El login del frontend sigue siendo simulado y la gestión de personas todavía usa `localStorage`; esta entrega integra el módulo de recepción, no reemplaza el módulo de autenticación ni el CRUD del equipo.
- Los horarios se leen de MongoDB. Si la colección está vacía, crea las franjas `07:00–08:00` y `17:00–18:00` desde la pantalla de horarios.
- La capacidad máxima de 30 sigue siendo un valor de presentación del frontend; el backend actual no bloquea entradas al llegar a 30.
- La consulta del historial muestra hasta 100 visitas recientes.
- El backend usa `VITE_API_URL` si está definido; de lo contrario consulta `http://localhost:3000`.

## Archivos incluidos
- `frontend/src/services/recepcionService.js` (nuevo)
- `frontend/src/components/RegistroAccesos.jsx`
- `frontend/src/components/AforoActual.jsx`
- `frontend/src/components/HistorialIngresos.jsx`
- `frontend/src/components/HorariosAdministrativos.jsx`
- `frontend/src/App.jsx`
- `backend/src/controllers/registroIngresoController.js`
- `backend/src/routes/registroIngresoRoutes.js`
