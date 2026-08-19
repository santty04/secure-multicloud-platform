# Matriz de control de acceso basado en roles (RBAC)

## 1. Identificación

**Proyecto:** Secure Multicloud Platform  
**Versión:** 1.0  
**Fecha:** 2026-08-18  
**Estado:** Aprobado por el equipo  
**Responsables:** Santiago, Simón y Daniel

## 2. Propósito

Definir los roles y permisos aplicables a los usuarios de Secure Multicloud Platform. Esta matriz es la fuente de verdad para la autorización server-side, los controles de interfaz, las pruebas de acceso, la auditoría y el modelo de datos.

Ocultar o deshabilitar una función en el frontend no constituye autorización. El backend deberá comprobar el permiso requerido antes de ejecutar cada operación.

## 3. Alcance multicloud aprobado

Todos los usuarios autenticados con una cuenta activa y un rol válido tendrán acceso, mediante la plataforma web, a los módulos de Microsoft Azure y Amazon Web Services.

El acceso a ambos proveedores no significa que todos los roles puedan modificar infraestructura. Las operaciones autorizadas dependerán del rol.

Los usuarios de la plataforma no recibirán credenciales cloud, no accederán automáticamente a las consolas de Azure o AWS, no ejecutarán Terraform directamente y no podrán enviar comandos Terraform desde el frontend.

## 4. Roles aprobados

### 4.1 Administrador

Administra usuarios y el ciclo de vida de las instancias en Azure y AWS.

Puede ver, crear, iniciar, detener, eliminar y editar instancias; consultar el historial de operaciones; gestionar usuarios; y asignar roles existentes.

No puede modificar la matriz RBAC desde el frontend, crear permisos arbitrarios, obtener credenciales cloud, enviar comandos Terraform ni acceder directamente a Terraform State.

### 4.2 Operador

Supervisa recursos y ejecuta operaciones reversibles sobre instancias existentes en Azure y AWS.

Puede ver instancias, consultar detalles, iniciarlas, detenerlas y consultar el historial permitido.

No puede crear, eliminar o editar instancias; gestionar usuarios o roles; ni ejecutar Terraform directamente.

### 4.3 Viewer

Consulta información de la plataforma sin modificar infraestructura.

Puede ver instancias, consultar detalles y consultar el historial permitido.

No puede crear, iniciar, detener, eliminar o editar instancias; gestionar usuarios o roles; ni ejecutar Terraform directamente.

## 5. Catálogo de permisos

| Código | Descripción | Criticidad |
| --- | --- | --- |
| `profile.read` | Consultar el perfil propio | Baja |
| `vm.read` | Listar y consultar detalles de VM y EC2 | Media |
| `vm.create` | Crear una VM o instancia EC2 | Alta |
| `vm.start` | Encender una VM o instancia EC2 | Media |
| `vm.stop` | Detener una VM o instancia EC2 | Alta |
| `vm.delete` | Eliminar una VM o instancia EC2 | Crítica |
| `vm.update` | Editar atributos expresamente permitidos | Alta |
| `operation.read` | Consultar historial de operaciones autorizado | Media |
| `user.read` | Consultar usuarios | Alta |
| `user.create` | Crear usuarios | Alta |
| `user.update` | Actualizar o desactivar usuarios | Alta |
| `role.read` | Consultar roles y permisos existentes | Media |
| `role.assign` | Asignar o retirar roles existentes | Crítica |

## 6. Matriz rol-permiso

| Permiso | Administrador | Operador | Viewer |
| --- | :---: | :---: | :---: |
| `profile.read` | Sí | Sí | Sí |
| `vm.read` | Sí | Sí | Sí |
| `vm.create` | Sí | No | No |
| `vm.start` | Sí | Sí | No |
| `vm.stop` | Sí | Sí | No |
| `vm.delete` | Sí | No | No |
| `vm.update` | Sí | No | No |
| `operation.read` | Sí | Sí | Sí |
| `user.read` | Sí | No | No |
| `user.create` | Sí | No | No |
| `user.update` | Sí | No | No |
| `role.read` | Sí | No | No |
| `role.assign` | Sí | No | No |

Toda operación no concedida explícitamente se considera denegada.

## 7. Matriz funcional y proveedores

| Operación | Administrador | Operador | Viewer | Azure | AWS |
| --- | :---: | :---: | :---: | :---: | :---: |
| Acceder a la plataforma web | Sí | Sí | Sí | N/A | N/A |
| Acceder al módulo del proveedor | Sí | Sí | Sí | Sí | Sí |
| Ver/listar instancias | Sí | Sí | Sí | Sí | Sí |
| Ver detalles de instancias | Sí | Sí | Sí | Sí | Sí |
| Crear instancias | Sí | No | No | Sí | Sí |
| Iniciar instancias | Sí | Sí | No | Sí | Sí |
| Detener instancias | Sí | Sí | No | Sí | Sí |
| Eliminar instancias | Sí | No | No | Sí | Sí |
| Editar instancias | Sí | No | No | Sí | Sí |
| Consultar historial de operaciones | Sí | Sí | Sí | Ambos | Ambos |
| Gestionar usuarios | Sí | No | No | N/A | N/A |

## 8. Reglas de autorización

Antes de ejecutar una operación, el backend deberá comprobar:

1. Que la cuenta existe y está activa.
2. Que la autenticación es válida.
3. Que el usuario tiene un rol válido.
4. Que el rol contiene el permiso requerido.
5. Que el proveedor es `azure` o `aws`.
6. Que el recurso está registrado y administrado por la plataforma.
7. Que el estado del recurso permite la operación solicitada.
8. Que los parámetros cumplen las listas y restricciones aprobadas.

El rol y los permisos efectivos deberán obtenerse desde el backend. Los campos `role`, `permissions` o equivalentes enviados por el frontend no serán confiables.

## 9. Operación de eliminación

`vm.delete` requerirá autenticación válida, permiso explícito, recurso registrado, confirmación explícita, validación del identificador y nombre, identificador de correlación, auditoría y protección frente a solicitudes duplicadas.

La aprobación de una segunda persona queda fuera del alcance mínimo y podrá documentarse como mejora futura.

## 10. Gestión de usuarios

Para el alcance inicial, gestionar usuarios comprende listar, crear, actualizar, activar o desactivar cuentas, consultar roles existentes y asignar o retirar un rol existente.

No se permitirá eliminar físicamente usuarios con actividad auditada, crear permisos arbitrarios desde la interfaz, modificar la matriz RBAC desde la interfaz ni exponer hashes, contraseñas, tokens o secretos.

## 11. Historial de operaciones

“Ver logs” se implementará inicialmente como consulta de un historial sanitizado de operaciones. Podrá incluir usuario, acción, proveedor, recurso, fecha, decisión, resultado y correlation ID.

No mostrará stack traces, consultas SQL, tokens completos, contraseñas, credenciales cloud, Terraform State ni secretos.

## 12. Edición de instancias

`vm.update` solo podrá utilizarse para atributos incluidos expresamente en una lista autorizada. Los atributos definitivos deben acordarse con Simón y Daniel según las capacidades y riesgos de Terraform en Azure y AWS.

**DEPENDENCIA TERRAFORM/INFRASTRUCTURE — consultar con Simón y Daniel.**

No se aceptarán campos arbitrarios, código Terraform ni comandos del sistema.

## 13. Respuestas esperadas

| Situación | Respuesta esperada |
| --- | --- |
| Sin autenticación válida | `401 Unauthorized` |
| Autenticado sin permiso | `403 Forbidden` |
| Recurso inexistente o no administrado | `404 Not Found` |
| Parámetros inválidos | `422 Unprocessable Content` |
| Conflicto con el estado del recurso | `409 Conflict` |
| Operación aceptada | Código `2xx` correspondiente |

## 14. Casos mínimos de prueba

| ID | Rol | Operación | Resultado esperado |
| --- | --- | --- | --- |
| RBAC-001 | Administrador | Crear instancia Azure | Permitido |
| RBAC-002 | Administrador | Crear instancia AWS | Permitido |
| RBAC-003 | Administrador | Eliminar instancia | Permitido con controles adicionales |
| RBAC-004 | Administrador | Gestionar usuario | Permitido |
| RBAC-005 | Operador | Listar Azure y AWS | Permitido |
| RBAC-006 | Operador | Iniciar instancia | Permitido |
| RBAC-007 | Operador | Detener instancia | Permitido |
| RBAC-008 | Operador | Crear instancia | Denegado con `403` |
| RBAC-009 | Operador | Eliminar instancia | Denegado con `403` |
| RBAC-010 | Viewer | Listar Azure y AWS | Permitido |
| RBAC-011 | Viewer | Consultar historial permitido | Permitido |
| RBAC-012 | Viewer | Iniciar instancia | Denegado con `403` |
| RBAC-013 | Viewer | Crear instancia | Denegado con `403` |
| RBAC-014 | Cualquier rol | Manipular `role` en la solicitud | Sin cambio de privilegios |
| RBAC-015 | Sin autenticar | Usar endpoint protegido | Denegado con `401` |

## 15. Relación con IAM cloud

El RBAC de aplicación determina qué puede solicitar el usuario. El IAM cloud limita qué puede ejecutar técnicamente la plataforma. Las identidades técnicas de Azure y AWS deberán aplicar mínimo privilegio y no se entregarán a los usuarios.

**DEPENDENCIA TERRAFORM/INFRASTRUCTURE — consultar con Simón y Daniel.**

## 16. Decisiones pendientes

- Definir los atributos exactos permitidos por `vm.update`.
- Definir el mecanismo definitivo de autenticación.
- Confirmar si cada usuario tendrá un único rol activo o si se permitirán varios.
- Definir la retención del historial de operaciones.
- Definir regiones, tamaños e imágenes permitidas por proveedor.

## 17. Aprobación

| Integrante | Estado | Fecha | Observaciones |
| --- | --- | --- | --- |
| Santiago | Aprobado | 2026-08-18 | Roles y operaciones acordados |
| Simón | Aprobado | 2026-08-18 | Roles y operaciones acordados |
| Daniel | Aprobado | 2026-08-18 | Roles y operaciones acordados |

## 18. Historial de cambios

| Versión | Fecha | Autor(es) | Descripción |
| --- | --- | --- | --- |
| 1.0 | 2026-08-18 | Santiago, Simón y Daniel | Matriz inicial aprobada para Administrador, Operador y Viewer |
