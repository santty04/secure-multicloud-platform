# Usuarios y roles

La página `/users` permite crear, consultar, editar, desactivar y reactivar usuarios,
y asignarles uno de los roles existentes. También muestra los permisos de cada rol.
Todas las rutas requieren autenticación y `user.manage`; el menú usa ese permiso.
La API valida el acceso independientemente del frontend.

## API

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/v1/users?q=&offset=0&limit=25` | `{items, total}`, búsqueda por nombre/correo y paginación (máximo 100) |
| GET | `/api/v1/users/{id}` | Usuario sin contraseña ni hash |
| POST | `/api/v1/users` | Crea una cuenta (201) |
| PUT | `/api/v1/users/{id}` | Actualiza nombre, correo, rol y estado |
| DELETE | `/api/v1/users/{id}` | Desactiva conservando el historial (204) |
| GET | `/api/v1/roles` | Roles existentes con sus permisos |

Crear requiere `email`, `full_name`, `role_id` y `password` (12–128 caracteres).
`is_active` es opcional y vale `true` por defecto. Actualizar usa los mismos campos
excepto `password`; no modifica contraseñas. Los correos se normalizan a minúsculas,
el nombre se recorta y los campos desconocidos se rechazan. Duplicados producen 409,
un usuario inexistente 404 y los datos inválidos 422.

Las contraseñas utilizan Argon2 y no se devuelven ni se guardan en el estado de React
o en la caché de consultas. Desactivar bloquea el login y las peticiones con tokens
existentes. Los cambios de rol se aplican en la siguiente petición autenticada.
Al reactivar, un token anterior aún vigente vuelve a ser válido; no se implementa
revocación permanente de JWT.

Un gestor no puede desactivarse ni asignarse un rol sin `user.manage`. Las escrituras
se serializan bloqueando las filas de roles y revalidando al actor después del bloqueo,
para impedir que gestores concurrentes utilicen autorizaciones obsoletas.

## Desarrollo

No hay migraciones ni cambios de infraestructura. Se usan las tablas existentes;
el seed RBAC ya concede `user.manage` al administrador. Esta pantalla asigna roles
configurados en el backend; no crea ni edita sus definiciones.

Desde `backend/`: `uv run ruff check .` y `uv run pytest -q`, con la base local de
pruebas configurada. La suite limpia una base terminada en `_test`; nunca debe usar
producción. Desde `frontend/`: `npm run build` y ESLint sobre los archivos modificados.
El proxy `/api/*` conecta la pantalla con el backend configurado en `API_URL`.
