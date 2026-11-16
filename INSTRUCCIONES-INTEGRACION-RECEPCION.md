# Gym Assistant — paquete de integración

Esta versión conecta la pantalla **Gestión de personas** del frontend con los endpoints existentes del backend y conserva la integración del módulo de recepción.

## Antes de iniciar

- Necesitas Node.js y MongoDB Atlas configurados.
- Conserva tu archivo `backend/.env` original. Este paquete no contiene credenciales.
- Si todavía no tienes el archivo, crea `backend/.env` tomando como referencia `.env.example` y completa `MONGODB_URI`.

## Instalar dependencias

Abre una terminal en `backend/`:

```bash
npm install
```

Abre otra terminal en `frontend/`:

```bash
npm install
```

## Ejecutar

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Abre la dirección local que indique Vite (normalmente `http://localhost:5173`).

## Qué quedó conectado

- Gestión de personas: consulta, creación, edición y cambio de estado mediante `/api/personas`.
- Membresías: consulta, creación y actualización mediante `/api/membresias`.
- El frontend convierte el campo `correo_institucional` del formulario al campo `correo` que espera MongoDB.
- Las membresías mensuales y el beneficio de profesor se adaptan a los valores admitidos por el modelo actual.
- La pantalla muestra estados de carga y errores de conexión.
- La integración de recepción se conserva: entradas, salidas, aforo, historial y horarios siguen usando sus servicios existentes.

## Pruebas sugeridas

1. Inicia MongoDB/backend y confirma que `http://localhost:3000/` responde.
2. Inicia el frontend e ingresa al panel de recepción.
3. Abre **Gestión de personas** y confirma que la lista carga desde MongoDB.
4. Registra una persona estudiante con membresía mensual y fecha de vencimiento.
5. Edita su nombre o correo y guarda.
6. Desactiva y vuelve a activar la persona.
7. Registra una persona administrativa y confirma que la membresía aparezca como “No aplica”.
8. Registra un profesor con beneficio, si tu flujo de negocio ya tiene creado su perfil de profesor.
9. Comprueba que los registros aparecen en MongoDB y que el módulo de recepción puede buscar por documento.

## Límites importantes que siguen pendientes

- **Autenticación:** el login de este proyecto sigue siendo simulado y consulta datos locales. Esta integración no crea contraseñas en MongoDB ni habilita el inicio de sesión de las personas nuevas. No se debe interpretar el registro de una persona como creación de sus credenciales.
- **Perfil de profesor:** el formulario de Gestión de personas no captura `tipo_profesor`, horas semanales ni los demás datos del modelo `Profesor`. El beneficio de profesor requiere que exista su perfil correspondiente; no se crea automáticamente desde este formulario.
- **Membresía chequera:** no se ofrece en el formulario porque requiere `dias_restantes`, dato que la pantalla actual no solicita.
- **Prueba real:** la compilación de producción y las operaciones contra MongoDB deben ejecutarse en tu equipo con dependencias instaladas y tu `.env` configurado. No se incluyen datos de conexión ni contraseñas.

## Archivos principales modificados

- `frontend/src/services/usuariosService.js`
- `frontend/src/pages/GestionPersonas.jsx`
- `frontend/src/components/FormularioUsuario.jsx`
- `backend/.env.example`


## Ajustes del formulario de Gestión de personas

- Las membresías ordinarias disponibles son **mensual** y **por días** (tipo interno `chequera`).
- La membresía mensual requiere fecha de vencimiento.
- La membresía por días guarda la cantidad de días comprados en `dias_restantes`, no solicita fecha de finalización y descuenta un día por cada ingreso válido.
- Al registrar un profesor se debe seleccionar si es **vinculado** o **externo**.
- Los profesores vinculados se registran en la colección `profesores` con `tipo_profesor: vinculado` y `beneficio_activo: true`; su acceso usa el límite semanal de 120 minutos ya implementado en el backend. No requieren una membresía ordinaria.
- Los profesores externos no reciben ese beneficio y deben tener una membresía mensual o por días para ingresar.
- Al editar un profesor vinculado como externo, se actualiza su perfil y se desactiva el beneficio.

Nota: los profesores que ya existían antes de este ajuste deben abrirse y guardarse desde Gestión de personas para crear o completar su perfil de profesor y seleccionar su vinculación.
