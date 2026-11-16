# Módulo de Autenticación (Darien)

Inicio de sesión contra MongoDB, contraseñas cifradas, roles y permisos, y perfil del usuario.
El login simulado con `localStorage` se reemplazó por el backend real.

## 1. Preparar la rama

```bash
git clone URL_DEL_REPOSITORIO
cd gym-assistant-lab-III
git switch -c feature/autenticacion
```

Copia encima del repositorio los archivos de este paquete (respetando las carpetas).

## 2. Configurar el backend

```bash
cd backend
npm install          # instala también bcryptjs y jsonwebtoken
```

Crea `backend/.env` copiando `.env.example` y completa:

```
PORT=3000
MONGODB_URI=<la URI que compartió Natalia, terminada en /GymAssistant>
JWT_SECRET=<una frase larga y secreta, la misma para todo el equipo>
JWT_EXPIRA=8h
AFORO_MAXIMO=30
```

> `.env` ya está en `.gitignore`. No lo subas a GitHub.

En MongoDB Atlas: **Security → Database & Network Access → IP Access List → Add IP Address** y agrega tu IP actual.

## 3. Crear la cuenta de recepción (una sola vez)

La recepción ahora es una persona real en la colección `personas` con `tipo_persona: recepcionista`.

```bash
npm run crear-recepcionista -- --correo recepcion@gymassistant.com --documento 900000001 --nombre "Recepción GymAssistant" --password CambiaEsta123
```

Si el correo ya existe como recepcionista, el script solo le cambia la contraseña.

## 4. Ejecutar

```bash
# Terminal 1
cd backend && npm run dev     # debe decir "Conectado correctamente a MongoDB Atlas"

# Terminal 2
cd frontend && npm install && npm run dev
```

## 5. Cómo funciona

**Primer ingreso:** las personas que registra Gestión de personas no tienen contraseña.
Al escribir su correo en el login, el sistema pide su **número de documento** y una contraseña nueva (mínimo 6 caracteres).
La contraseña se guarda cifrada con bcrypt en el campo `password` del modelo `Persona` (no se modificó ningún modelo).

**Roles y permisos (JWT):**

| Rol en MongoDB | Rol en el frontend | Puede usar |
|---|---|---|
| `recepcionista` | `admin` → `/recepcion` | Todo: personas, membresías, profesores, registros, horarios |
| `usuario` | `usuario` → `/usuario` | Solo sus datos: perfil, membresía, ingresos, aforo, su salida |

Las personas inactivas no pueden iniciar sesión, y si se desactivan con la sesión abierta, el siguiente request se rechaza.

## 6. Endpoints nuevos (`/api/auth`)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/login` | Público | `{ correo, password }` → `token` + `usuario`, o `primerIngreso: true` |
| POST | `/primer-ingreso` | Público | `{ correo, numero_documento, password }` crea la contraseña |
| GET | `/perfil` | Con sesión | Datos de la persona |
| PUT | `/cambiar-password` | Con sesión | `{ password_actual, password_nueva }` |
| GET | `/mi-membresia` | Con sesión | Membresía activa, chequera o beneficio de profesor |
| GET | `/mis-ingresos` | Con sesión | Últimas 50 visitas propias |
| GET | `/aforo` | Con sesión | `{ total, capacidad }` sin nombres |
| POST | `/mi-salida` | Con sesión | Registra la salida propia (reutiliza el controlador de recepción) |
| PATCH | `/restablecer-password/:id` | Solo recepción | Borra la contraseña; la persona vuelve a hacer primer ingreso |

## 7. Importante para Natalia y María Camila

Las rutas `/api/personas`, `/api/membresias`, `/api/profesores`, `/api/registros` y `/api/horarios-administrativos`
ahora exigen sesión de **recepción**. Esto se agregó en `server.js` sin tocar sus archivos de rutas ni controladores.

- En el frontend no tienen que hacer nada: `recepcionService.js` y `usuariosService.js` ya envían el token (se agregaron 4 líneas a cada uno).
- En Postman/Thunder Client: hagan `POST /api/auth/login` con la cuenta de recepción y envíen el header
  `Authorization: Bearer <token>`.
- Si la sesión vence (8 h) o el token no es válido, el frontend vuelve al login automáticamente.

## 8. Pruebas sugeridas

1. Login con la cuenta de recepción → entra a `/recepcion` y Gestión de personas carga desde MongoDB.
2. Registrar una persona con correo → cerrar sesión → entrar con ese correo → primer ingreso con documento → crear contraseña.
3. Entrar como esa persona → revisar Mi Membresía, Aforo, Mis Ingresos y Mi Perfil → cambiar contraseña.
4. Intentar `GET /api/personas` con el token de un usuario → debe responder **403**.
5. Desactivar la persona desde recepción → ya no puede iniciar sesión.
6. Restablecer su contraseña (`PATCH /api/auth/restablecer-password/:id`) → vuelve a pedir primer ingreso.

## 9. Subir los cambios

```bash
git add .
git commit -m "feat: autenticacion con JWT, roles, contraseñas y perfil"
git push -u origin feature/autenticacion
```

## Archivos

**Nuevos**
- `backend/src/controllers/authController.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/middlewares/authMiddleware.js`
- `backend/scripts/crearRecepcionista.js`
- `frontend/src/modules/acceso/sesion.js`
- `frontend/src/modules/acceso/MiPerfil.jsx`
- `frontend/src/modules/acceso/CambiarPassword.jsx`

**Modificados**
- `backend/server.js`, `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/.env-example`
- `frontend/src/modules/acceso/authService.js`, `AuthContext.jsx`, `LoginPage.jsx`, `UsuarioPage.jsx`, `MiMembresia.jsx`, `MisIngresos.jsx`, `acceso.css`
- `frontend/src/services/recepcionService.js`, `frontend/src/services/usuariosService.js` (solo el envío del token)
