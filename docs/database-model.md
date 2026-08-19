# Modelo inicial de datos

## 1. Identificación

**Proyecto:** Secure Multicloud Platform  
**Versión:** 0.1  
**Estado:** Borrador para revisión y aprobación  
**Responsables:** Santiago, Simón y Daniel

## 2. Propósito

Este documento define las entidades y relaciones iniciales de PostgreSQL para Secure Multicloud Platform.


El modelo deberá soportar:

- Identidades de usuario.
- Roles y permisos.
- Asignaciones de roles.
- Recursos cloud administrados.
- Operaciones solicitadas.
- Registros de auditoría.

Este documento no define todavía qué permisos pertenecen a cada rol. Esa decisión corresponde a la matriz RBAC aprobada por Santiago, Simón y Daniel.

## 3. Principios de diseño

- Las claves primarias utilizarán UUID.
- Las fechas se almacenarán con zona horaria.
- Los nombres técnicos de tablas y campos estarán en inglés.
- Las contraseñas nunca se almacenarán en texto claro.
- Los secretos cloud y tokens completos no se almacenarán en estas tablas.
- Terraform State no se almacenará en la base de datos de la aplicación.
- Los valores controlados se validarán en el backend y, cuando corresponda, mediante restricciones de base de datos.
- Las relaciones aplicarán integridad referencial.
- Las consultas utilizarán mecanismos parametrizados del ORM o del controlador de base de datos.
- Las operaciones relevantes deberán conservar trazabilidad.
- Se aplicará mínimo privilegio a la identidad de base de datos utilizada por la aplicación.

## 4. Entidades

### 4.1 `users`

Representa las identidades de usuario de la plataforma.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `id` | UUID | PK | Identificador del usuario |
| `email` | VARCHAR(254) | UNIQUE, NOT NULL | Correo normalizado |
| `password_hash` | VARCHAR | NULL/NOT NULL por confirmar | Hash de contraseña, nunca contraseña original |
| `full_name` | VARCHAR(150) | NOT NULL | Nombre visible |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Habilita o impide la autenticación |
| `created_at` | TIMESTAMPTZ | NOT NULL | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Última modificación |

La necesidad de `password_hash` depende del mecanismo de autenticación aprobado. Si la plataforma utiliza un proveedor de identidad externo, este campo puede no ser necesario.

No se almacenarán:

- Contraseñas originales.
- Preguntas o respuestas de seguridad.
- Tokens completos.
- Secretos de recuperación sin protección.

### 4.2 `roles`

Representa los roles aprobados por el equipo.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `id` | UUID | PK | Identificador del rol |
| `name` | VARCHAR(50) | UNIQUE, NOT NULL | Nombre técnico del rol |
| `description` | VARCHAR(255) | NOT NULL | Propósito del rol |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Estado del rol |
| `created_at` | TIMESTAMPTZ | NOT NULL | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Última modificación |

Los roles inicialmente contemplados son:

- Auditor.
- Operador.
- Desplegador.
- Administrador.

Su inclusión definitiva y sus permisos requieren aprobación conjunta mediante la matriz RBAC.

### 4.3 `permissions`

Representa acciones autorizables de forma individual.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `id` | UUID | PK | Identificador del permiso |
| `code` | VARCHAR(100) | UNIQUE, NOT NULL | Código técnico estable |
| `description` | VARCHAR(255) | NOT NULL | Acción protegida |
| `created_at` | TIMESTAMPTZ | NOT NULL | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Última modificación |

Ejemplos provisionales:

```text
profile.read
vm.read
vm.create
vm.start
vm.stop
vm.delete
audit.read
```

Estos ejemplos no constituyen la matriz RBAC definitiva.

### 4.4 `user_roles`

Relaciona usuarios con roles.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `user_id` | UUID | PK parcial, FK `users.id` | Usuario |
| `role_id` | UUID | PK parcial, FK `roles.id` | Rol asignado |
| `assigned_at` | TIMESTAMPTZ | NOT NULL | Fecha de asignación |
| `assigned_by` | UUID | FK `users.id`, NULL permitido | Usuario que realizó la asignación |

La combinación `user_id + role_id` debe ser única.

Si el equipo decide permitir un único rol activo por usuario, podrá aplicarse una restricción adicional o simplificarse el modelo durante la implementación.

### 4.5 `role_permissions`

Relaciona roles con permisos.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `role_id` | UUID | PK parcial, FK `roles.id` | Rol |
| `permission_id` | UUID | PK parcial, FK `permissions.id` | Permiso |

La combinación `role_id + permission_id` debe ser única.

Esta tabla permite representar la matriz aprobada sin codificar permisos como decisiones provenientes del frontend.

### 4.6 `managed_resources`

Representa recursos cloud bajo administración de la plataforma.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `id` | UUID | PK | Identificador interno |
| `provider` | VARCHAR(10) | NOT NULL | `azure` o `aws` |
| `external_id` | VARCHAR(255) | NOT NULL | Identificador asignado por el proveedor cloud |
| `name` | VARCHAR(100) | NOT NULL | Nombre del recurso |
| `resource_type` | VARCHAR(50) | NOT NULL | Tipo controlado de recurso |
| `region` | VARCHAR(50) | NOT NULL | Región cloud |
| `size` | VARCHAR(100) | NOT NULL | Tamaño o tipo de instancia |
| `status` | VARCHAR(50) | NOT NULL | Último estado conocido |
| `created_by` | UUID | FK `users.id`, NOT NULL | Usuario que solicitó la creación |
| `created_at` | TIMESTAMPTZ | NOT NULL | Registro inicial |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Última actualización |

Debe existir una restricción única sobre:

```text
provider + external_id
```

No se almacenarán credenciales cloud ni Terraform State en esta tabla.

La relación exacta entre usuario, proyecto, equipo, entorno y recurso sigue pendiente de definición. Esa decisión es necesaria para prevenir IDOR y accesos horizontales.

### 4.7 `operations`

Representa solicitudes de operaciones sobre infraestructura.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `id` | UUID | PK | Identificador de la operación |
| `correlation_id` | UUID | UNIQUE, NOT NULL | Correlación de la solicitud |
| `user_id` | UUID | FK `users.id`, NOT NULL | Usuario solicitante |
| `resource_id` | UUID | FK `managed_resources.id`, NULL permitido | Recurso relacionado, si existe |
| `provider` | VARCHAR(10) | NOT NULL | Azure o AWS |
| `action` | VARCHAR(20) | NOT NULL | `LIST`, `CREATE`, `START`, `STOP` o `DELETE` |
| `status` | VARCHAR(20) | NOT NULL | Estado de procesamiento |
| `requested_at` | TIMESTAMPTZ | NOT NULL | Fecha de solicitud |
| `completed_at` | TIMESTAMPTZ | NULL permitido | Fecha de terminación |
| `error_code` | VARCHAR(100) | NULL permitido | Código controlado de error |

Los estados definitivos de operación deberán aprobarse cuando se diseñe la integración backend–Terraform.

No se almacenarán comandos de sistema construidos desde la entrada del usuario.

### 4.8 `audit_logs`

Registra eventos relevantes de seguridad y negocio.

| Campo | Tipo conceptual | Restricciones iniciales | Descripción |
| --- | --- | --- | --- |
| `id` | UUID | PK | Identificador del evento |
| `correlation_id` | UUID | NOT NULL | Relación con una solicitud |
| `user_id` | UUID | FK `users.id`, NULL permitido | Usuario, si pudo identificarse |
| `action` | VARCHAR(100) | NOT NULL | Acción evaluada |
| `resource_id` | UUID | FK `managed_resources.id`, NULL permitido | Recurso relacionado |
| `decision` | VARCHAR(20) | NOT NULL | `ALLOWED`, `DENIED` o `SYSTEM` |
| `result` | VARCHAR(20) | NOT NULL | Resultado del evento |
| `ip_address` | INET | NULL permitido | IP de origen cuando corresponda |
| `created_at` | TIMESTAMPTZ | NOT NULL | Fecha del evento |
| `metadata` | JSONB | NOT NULL, DEFAULT `{}` | Contexto mínimo y sanitizado |

Nunca se almacenarán en `metadata`:

- Contraseñas.
- Hashes de contraseña.
- Tokens completos.
- Credenciales cloud.
- Secretos.
- Claves privadas.
- Terraform State.
- Cuerpos completos de solicitudes sin sanitizar.

## 5. Relaciones

```text
users
  ├── user_roles ── roles
  │                   └── role_permissions ── permissions
  ├── managed_resources
  ├── operations
  └── audit_logs

managed_resources
  ├── operations
  └── audit_logs
```

## 6. Reglas iniciales de integridad

| Regla | Propósito |
| --- | --- |
| `users.email` único | Evitar identidades duplicadas |
| `roles.name` único | Mantener nombres de rol inequívocos |
| `permissions.code` único | Mantener permisos técnicos estables |
| `user_id + role_id` único | Evitar asignaciones duplicadas |
| `role_id + permission_id` único | Evitar permisos duplicados por rol |
| `provider + external_id` único | Evitar registrar dos veces el mismo recurso cloud |
| `operations.correlation_id` único | Relacionar una solicitud con una sola operación |
| Claves foráneas | Evitar referencias a entidades inexistentes |

Las reglas de eliminación en cascada o restricción deberán decidirse antes de crear las migraciones. No se asumirán unilateralmente.

## 7. Índices iniciales por evaluar

Además de los índices generados por claves primarias y restricciones únicas, se evaluarán:

- `managed_resources(provider, status)`.
- `managed_resources(created_by)`.
- `operations(user_id, requested_at)`.
- `operations(resource_id, requested_at)`.
- `audit_logs(correlation_id)`.
- `audit_logs(user_id, created_at)`.
- `audit_logs(action, created_at)`.

Los índices definitivos se elegirán según las consultas reales y no por anticipación indiscriminada.

## 8. Decisiones pendientes

| ID | Decisión | Responsables | Impacto |
| --- | --- | --- | --- |
| DB-01 | Autenticación local o proveedor externo | Los tres | Campo `password_hash` y flujo de identidad |
| DB-02 | Un usuario puede tener uno o varios roles | Los tres | `user_roles` y acumulación de permisos |
| DB-03 | Roles definitivos | Los tres | Datos iniciales y pruebas |
| DB-04 | Matriz rol-permiso | Los tres | `permissions` y `role_permissions` |
| DB-05 | Administración de usuarios dentro de la plataforma | Los tres | Endpoints, permisos y auditoría |
| DB-06 | Alcance de recursos por usuario, proyecto, equipo o entorno | Los tres | IDOR y autorización por objeto |
| DB-07 | Administrar solo recursos creados por la plataforma | Los tres | Inventario y sincronización cloud |
| DB-08 | Estados definitivos de operaciones | Los tres | `operations.status` |
| DB-09 | Retención de auditoría | Los tres | Almacenamiento y cumplimiento |
| DB-10 | Campos permitidos en `metadata` | Los tres | Privacidad y seguridad de logs |
| DB-11 | Borrado lógico o físico de usuarios | Los tres | Trazabilidad e integridad referencial |
| DB-12 | Reglas `ON DELETE` de las relaciones | Los tres | Conservación y consistencia de evidencia |

## 9. Reglas de seguridad

1. El frontend nunca decidirá los roles o permisos efectivos.
2. La autorización se consultará y aplicará en el backend.
3. Las asignaciones y retiros de roles deberán quedar auditados.
4. Los registros de auditoría no expondrán secretos.
5. Las consultas deberán ser parametrizadas.
6. La identidad de PostgreSQL utilizada por la aplicación aplicará mínimo privilegio.
7. Las migraciones deberán versionarse mediante Alembic.
8. La base de datos no almacenará Terraform State.
9. La base de datos no almacenará credenciales cloud en texto claro.
10. Las relaciones deberán aplicar integridad referencial.
11. Los permisos de administración de base de datos no se otorgarán a la identidad normal de la aplicación.
12. Los errores de base de datos no se devolverán directamente al frontend.
13. Las copias de seguridad deberán protegerse según su sensibilidad.

## 10. Secuencia de implementación propuesta

Después de aprobar la matriz RBAC y este modelo:

```text
Instalar SQLAlchemy y controlador PostgreSQL
→ Configurar conexión mediante variables de entorno
→ Instalar y configurar Alembic
→ Implementar modelos ORM
→ Generar y revisar la primera migración
→ Ejecutar migración en PostgreSQL local
→ Probar integridad y restricciones
→ Conservar evidencia sanitizada
```

No se cargarán roles y permisos definitivos hasta aprobar la matriz RBAC.

## 11. Aprobación

| Integrante | Estado | Fecha | Observaciones |
| --- | --- | --- | --- |
| Santiago | Pendiente |  |  |
| Simón | Pendiente |  |  |
| Daniel | Pendiente |  |  |

## 12. Historial de cambios

| Versión | Fecha | Autor(es) | Descripción |
| --- | --- | --- | --- |
| 0.1 | 2026-08-13 | Equipo del proyecto | Propuesta inicial del modelo de datos |
