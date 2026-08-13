# Requisitos del sistema

## 1. Identificación

**Proyecto:** Secure Multicloud Platform  
**Versión:** 0.1  
**Fecha:** 2026-08-13  
**Estado:** Borrador para revisión y aprobación del equipo  
**Documento fuente:** `docs/project-definition.md`, versión 1.0.

## 2. Propósito

Este documento convierte el alcance aprobado en requisitos verificables para el frontend, el backend, la base de datos, Terraform, la infraestructura y los controles de seguridad.

Los requisitos se clasifican así:

- `RF`: requisito funcional.
- `RS`: requisito de seguridad.
- `RNF`: requisito no funcional.

La matriz RBAC definitiva, el mecanismo de autenticación y la integración backend–Terraform continúan pendientes de decisión conjunta. Este documento no inventa esas decisiones.

## 3. Criterios de redacción

Cada requisito debe:

- Expresar un comportamiento o propiedad comprobable.
- Tener un identificador único.
- Incluir al menos un criterio de aceptación.
- Indicar el componente o responsable principal.
- Relacionarse con una prueba y una evidencia.

Prioridades utilizadas:

- **Must:** indispensable para demostrar el objetivo del proyecto.
- **Should:** importante, pero puede implementarse después del alcance mínimo.
- **Could:** deseable si el tiempo y los recursos lo permiten.

## 4. Requisitos funcionales

| ID | Requisito | Prioridad | Componente principal | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RF-001 | La plataforma deberá permitir que un usuario activo se autentique mediante el mecanismo aprobado por el equipo. | Must | Backend + Frontend | Con credenciales válidas se establece una sesión o contexto autenticado; con datos inválidos se rechaza el acceso. |
| RF-002 | La plataforma deberá permitir que el usuario finalice su sesión. | Must | Backend + Frontend | Después de cerrar sesión, las credenciales de sesión correspondientes no permiten acceder a endpoints protegidos. |
| RF-003 | La plataforma deberá mostrar al usuario su identidad y el contexto de acceso necesario para usar la aplicación. | Should | Backend + Frontend | El usuario autenticado puede consultar su perfil sin visualizar secretos ni información de otros usuarios. |
| RF-004 | La plataforma deberá listar las instancias administradas en Microsoft Azure. | Must | Backend + Terraform Azure + Frontend | Una solicitud autorizada devuelve las instancias Azure dentro del alcance aprobado. |
| RF-005 | La plataforma deberá listar las instancias administradas en AWS. | Must | Backend + Terraform AWS + Frontend | Una solicitud autorizada devuelve las instancias EC2 dentro del alcance aprobado. |
| RF-006 | La plataforma deberá permitir consultar el detalle de una instancia autorizada. | Must | Backend + Frontend | El usuario recibe únicamente la información permitida de una instancia existente y accesible. |
| RF-007 | La plataforma deberá permitir crear una instancia Azure con parámetros pertenecientes a listas autorizadas. | Must | Backend + Terraform Azure + Frontend | Una solicitud válida y autorizada crea la VM y devuelve un identificador o estado rastreable. |
| RF-008 | La plataforma deberá permitir crear una instancia EC2 con parámetros pertenecientes a listas autorizadas. | Must | Backend + Terraform AWS + Frontend | Una solicitud válida y autorizada crea la instancia y devuelve un identificador o estado rastreable. |
| RF-009 | La plataforma deberá permitir encender una instancia autorizada. | Must | Backend + Terraform + Frontend | La instancia cambia al estado esperado o se devuelve un estado de operación rastreable. |
| RF-010 | La plataforma deberá permitir apagar una instancia autorizada. | Must | Backend + Terraform + Frontend | La instancia cambia al estado esperado o se devuelve un estado de operación rastreable. |
| RF-011 | La plataforma deberá permitir eliminar una instancia únicamente después de una confirmación explícita. | Must | Backend + Terraform + Frontend | Sin confirmación válida la operación no se ejecuta; con confirmación y permiso se procesa y audita. |
| RF-012 | La plataforma deberá mostrar el resultado o estado de las operaciones de infraestructura. | Must | Backend + Frontend | El usuario puede distinguir entre operación pendiente, exitosa, fallida o denegada. |
| RF-013 | La plataforma deberá registrar las operaciones relevantes de infraestructura. | Must | Backend | Cada solicitud crítica genera un registro con correlación, decisión y resultado, sin secretos. |
| RF-014 | La plataforma deberá permitir consultar registros de auditoría a quienes tengan el permiso aprobado. | Must | Backend + Frontend | Un usuario autorizado puede consultar auditoría; uno no autorizado recibe `403 Forbidden`. |
| RF-015 | La plataforma deberá distinguir recursos y operaciones por proveedor cloud. | Must | Backend + Frontend | Las respuestas y la interfaz identifican claramente Azure o AWS sin ambigüedad. |
| RF-016 | La API deberá exponer un endpoint de salud que no revele información sensible. | Must | Backend | `GET /health` responde exitosamente con un estado mínimo y sin versiones, secretos ni configuración interna. |

## 5. Requisitos de seguridad

### 5.1 Autenticación y sesiones

| ID | Requisito | Prioridad | Responsable | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RS-001 | El backend deberá exigir autenticación en todos los endpoints protegidos. | Must | Santiago | Una solicitud sin credenciales válidas recibe `401 Unauthorized` y no ejecuta lógica privilegiada. |
| RS-002 | Las contraseñas, si son administradas por la plataforma, deberán almacenarse mediante un algoritmo de derivación resistente aprobado, nunca en texto claro. | Must | Santiago + diseño conjunto | La base de datos contiene hashes con salt y no permite recuperar la contraseña original. |
| RS-003 | Las sesiones o tokens deberán tener expiración y validación de integridad. | Must | Santiago + diseño conjunto | Una credencial alterada o expirada es rechazada con `401 Unauthorized`. |
| RS-004 | El cierre de sesión deberá invalidar o dejar inutilizable el contexto de autenticación según el mecanismo adoptado. | Must | Santiago + diseño conjunto | La credencial afectada no permite continuar accediendo después del cierre conforme al diseño aprobado. |
| RS-005 | Las respuestas, logs y evidencias no deberán exponer contraseñas, tokens completos ni secretos. | Must | Los tres | Las pruebas y revisión de logs no muestran valores sensibles completos. |

### 5.2 Autorización y RBAC

| ID | Requisito | Prioridad | Responsable | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RS-006 | El backend deberá comprobar el permiso correspondiente antes de ejecutar cada operación protegida. | Must | Santiago; diseño RBAC de los tres | Una solicitud autenticada sin permiso recibe `403 Forbidden` y no invoca Terraform. |
| RS-007 | La autorización deberá denegarse por defecto cuando no exista un permiso explícito. | Must | Santiago; diseño RBAC de los tres | Un rol sin asignación expresa no puede ejecutar la operación. |
| RS-008 | El rol o los permisos utilizados para autorizar no deberán aceptarse como decisión confiable enviada por el frontend. | Must | Santiago | Manipular `role`, `permissions` u otros campos del cliente no cambia la autorización efectiva. |
| RS-009 | El backend deberá verificar que el usuario pueda actuar sobre el recurso solicitado, además de validar el permiso general. | Must | Santiago + diseño conjunto | Cambiar el identificador por el de un recurso no autorizado produce `403` o `404`, sin ejecutar la acción. |
| RS-010 | La matriz rol-permiso deberá estar documentada, versionada y aprobada por los tres integrantes antes de implementarse como definitiva. | Must | Los tres | Existe una versión aprobada en `security/rbac/` y las pruebas corresponden a ella. |
| RS-011 | Las decisiones de autorización permitidas y denegadas sobre operaciones críticas deberán quedar auditadas. | Must | Los tres; implementación Santiago | La evidencia muestra registros `ALLOWED` y `DENIED` correlacionados con las solicitudes. |

### 5.3 Validación y protección de la API

| ID | Requisito | Prioridad | Responsable | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RS-012 | El backend deberá validar tipo, formato, longitud, rango y valores permitidos de las entradas. | Must | Santiago | Entradas inválidas reciben una respuesta controlada y no alcanzan Terraform ni la base de datos. |
| RS-013 | Proveedor, región, tamaño e imagen deberán seleccionarse de listas autorizadas definidas por el equipo. | Must | Los tres; implementación Santiago | Un valor no permitido es rechazado antes de iniciar el aprovisionamiento. |
| RS-014 | La plataforma no deberá aceptar comandos del sistema ni código Terraform arbitrario desde el cliente. | Must | Los tres | Los modelos de entrada no contienen campos de comando o código libre ejecutable. |
| RS-015 | La integración con Terraform no deberá construir comandos mediante concatenación directa de datos del usuario. | Must | Los tres | La revisión de implementación demuestra una interfaz controlada y parámetros previamente validados. |
| RS-016 | El acceso a PostgreSQL deberá realizarse mediante consultas parametrizadas u operaciones seguras del ORM. | Must | Santiago | Las pruebas de inyección SQL no alteran la consulta ni permiten acceso indebido. |
| RS-017 | La API deberá responder con códigos HTTP coherentes sin revelar detalles internos. | Must | Santiago | Los errores no muestran stack traces, rutas internas, consultas SQL, secretos ni configuración cloud. |
| RS-018 | CORS deberá permitir únicamente los orígenes requeridos por los entornos aprobados. | Must | Santiago + infraestructura | Un origen no autorizado no recibe permisos CORS y no se usa una configuración abierta con credenciales. |
| RS-019 | Las operaciones destructivas deberán requerir método HTTP, autorización, validación y confirmación adecuados. | Must | Los tres; implementación Santiago | Una eliminación por método incorrecto, sin permiso o sin confirmación es rechazada y auditada. |

### 5.4 Secretos, Terraform y cloud

| ID | Requisito | Prioridad | Responsable | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RS-020 | Los secretos deberán mantenerse fuera del código fuente y del frontend. | Must | Los tres | La revisión del repositorio no encuentra secretos reales; el frontend no contiene credenciales privilegiadas. |
| RS-021 | Terraform State no deberá almacenarse en Git y deberá protegerse mediante el mecanismo remoto aprobado. | Must | Simón + Daniel; revisión conjunta | El state no aparece en el repositorio y el acceso al backend remoto requiere permisos autorizados. |
| RS-022 | Las identidades usadas por Terraform deberán aplicar mínimo privilegio. | Must | Simón + Daniel; diseño conjunto | Los permisos cloud se limitan a los recursos y acciones requeridos por el alcance aprobado. |
| RS-023 | La aplicación no deberá entregar credenciales cloud al navegador. | Must | Santiago + Simón + Daniel | Las respuestas y archivos generados para el frontend no contienen credenciales Azure o AWS. |
| RS-024 | Los componentes deberán usar canales cifrados en tránsito en ambientes desplegados. | Must | Los tres | La aplicación desplegada usa HTTPS y conexiones seguras compatibles con los servicios involucrados. |
| RS-025 | La estrategia de integración backend–Terraform deberá aprobarse antes de implementar la ejecución de Terraform. | Must | Los tres | Existe una decisión de arquitectura documentada con límites de confianza, entradas, salidas y manejo de errores. |

### 5.5 Auditoría y trazabilidad

| ID | Requisito | Prioridad | Responsable | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RS-026 | Cada operación crítica deberá tener un identificador de correlación. | Must | Santiago | Solicitud, resultado y auditoría pueden relacionarse mediante el mismo identificador. |
| RS-027 | Los registros de auditoría deberán protegerse contra modificación no autorizada. | Must | Los tres | Solo los componentes e identidades aprobados pueden escribir o administrar los registros. |
| RS-028 | La consulta de auditoría deberá aplicar autorización y minimizar los datos mostrados. | Must | Los tres; implementación Santiago | Un usuario solo ve los campos y registros permitidos por la matriz aprobada. |
| RS-029 | La fecha y hora de auditoría deberán registrarse de forma consistente. | Must | Los tres | Los eventos utilizan UTC internamente o la convención temporal documentada y pueden ordenarse correctamente. |
| RS-030 | La evidencia del proyecto deberá sanitizarse antes de almacenarse o compartirse. | Must | Los tres | Capturas y logs de evidencia no contienen secretos, tokens completos ni datos sensibles innecesarios. |

## 6. Requisitos no funcionales

| ID | Requisito | Prioridad | Componente | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| RNF-001 | La solución deberá mantener separación clara entre frontend, backend, Terraform, infraestructura, seguridad y documentación. | Must | Repositorio | Los componentes permanecen en las rutas aprobadas y las dependencias están documentadas. |
| RNF-002 | La API deberá documentarse mediante OpenAPI sin depender de esa documentación como control de seguridad. | Must | Backend | Los endpoints y esquemas aparecen documentados; la autorización se aplica aunque la documentación esté oculta. |
| RNF-003 | El código backend deberá utilizar tipado, estructura modular y pruebas automatizadas para los controles críticos. | Must | Backend | El análisis estático y la suite de pruebas se ejecutan sin errores críticos en la línea base aprobada. |
| RNF-004 | El frontend deberá utilizar TypeScript y manejar de forma diferenciada respuestas `401`, `403`, `422` y `5xx`. | Must | Frontend | La interfaz presenta estados controlados sin exponer detalles internos. |
| RNF-005 | La solución deberá poder ejecutarse en un entorno local documentado. | Must | Todos | Un integrante puede seguir el README y levantar los componentes disponibles. |
| RNF-006 | Las operaciones prolongadas no deberán producir estados ambiguos ni ejecuciones duplicadas. | Must | Backend + Terraform | Reintentos o recargas no crean recursos duplicados y existe un estado rastreable de la operación. |
| RNF-007 | La solución deberá priorizar una arquitectura simple compatible con el tiempo académico disponible. | Must | Los tres | No se introducen microservicios, Kubernetes u otros componentes sin una decisión justificada. |
| RNF-008 | Los cambios deberán integrarse mediante ramas y Pull Requests conforme a `CONTRIBUTING.md`. | Should | Los tres | Los cambios relevantes conservan historial, revisión y evidencia de pruebas. |
| RNF-009 | La configuración deberá diferenciar al menos el entorno local del entorno desplegado. | Should | Todos | Los valores de configuración se obtienen del entorno y no están codificados como secretos. |
| RNF-010 | La plataforma deberá proporcionar mensajes comprensibles sin revelar información técnica sensible. | Must | Frontend + Backend | Los usuarios reciben mensajes accionables y los detalles técnicos quedan en registros protegidos. |

## 7. Matriz inicial de trazabilidad

| Elemento aprobado | Requisitos relacionados |
| --- | --- |
| OP-01 Iniciar sesión | RF-001, RS-001 a RS-005 |
| OP-02 Cerrar sesión | RF-002, RS-004 |
| OP-04 y OP-05 Consultar instancias | RF-004 a RF-006, RS-006 a RS-009 |
| OP-06 Crear instancia | RF-007, RF-008, RS-012 a RS-015, RS-020 a RS-025 |
| OP-07 Encender instancia | RF-009, RS-006, RS-009, RS-026 |
| OP-08 Apagar instancia | RF-010, RS-006, RS-009, RS-026 |
| OP-09 Eliminar instancia | RF-011, RS-006, RS-009, RS-019, RS-026 |
| OP-10 Consultar auditoría | RF-014, RS-028 |
| OP-11 y OP-12 Registrar decisiones | RF-013, RS-011, RS-026 a RS-030 |
| ACT-02 y ACT-03 Credenciales y sesiones | RS-002 a RS-005, RS-020, RS-024 |
| ACT-04 Roles y permisos | RS-006 a RS-011 |
| ACT-07 Credenciales cloud | RS-020, RS-022 a RS-024 |
| ACT-08 Terraform State | RS-021, RS-027 |
| ACT-11 Auditoría | RS-011, RS-026 a RS-030 |

Esta matriz se ampliará cuando se aprueben el modelo de amenazas, la matriz de riesgos y el RBAC.

## 8. Pruebas mínimas derivadas

| ID | Caso de prueba | Resultado esperado | Evidencia sugerida |
| --- | --- | --- | --- |
| PT-001 | Solicitar un endpoint protegido sin autenticación | `401 Unauthorized`; no se ejecuta la operación | Request y response sanitizados |
| PT-002 | Usar una sesión o token alterado o expirado | `401 Unauthorized` | Request y response sanitizados |
| PT-003 | Ejecutar una acción sin el permiso requerido | `403 Forbidden`; no se invoca Terraform | Response y auditoría `DENIED` |
| PT-004 | Manipular el rol enviado por el frontend | La autorización real no cambia | Request manipulado y response |
| PT-005 | Cambiar el identificador por un recurso no autorizado | `403` o `404`; sin modificación del recurso | Request, response y auditoría |
| PT-006 | Enviar proveedor, región, tamaño o imagen no permitidos | Solicitud rechazada antes de Terraform | Response de validación |
| PT-007 | Enviar campos adicionales como `role` o `command` | Campos rechazados o ignorados de forma segura según el esquema aprobado | Request y response |
| PT-008 | Intentar inyección SQL en entradas de búsqueda o identificación | La consulta no se altera y no hay acceso indebido | Resultado de prueba sanitizado |
| PT-009 | Provocar un error interno controlado | Respuesta sin stack trace, rutas, consultas ni secretos | Response y log interno sanitizado |
| PT-010 | Eliminar sin confirmación válida | Operación rechazada y recurso intacto | Response, estado del recurso y auditoría |
| PT-011 | Revisar repositorio y artefactos | No se encuentran secretos ni Terraform State | Resultado de escaneo o revisión |
| PT-012 | Ejecutar una operación autorizada | Resultado y auditoría comparten correlación | Request, response y registro de auditoría |

## 9. Decisiones pendientes que afectan requisitos

| ID | Decisión pendiente | Requisitos afectados |
| --- | --- | --- |
| DP-01 | Roles definitivos y matriz rol-permiso | RS-006 a RS-011 |
| DP-02 | Mecanismo de autenticación y cierre de sesión | RF-001 a RF-003, RS-001 a RS-005 |
| DP-03 | Administración de usuarios y asignación de roles | Alcance funcional futuro y RBAC |
| DP-04 | Regiones, tamaños e imágenes permitidas | RF-007, RF-008, RS-012, RS-013 |
| DP-05 | Propiedad y alcance de los recursos administrados | RF-004 a RF-011, RS-009 |
| DP-06 | Integración backend–Terraform | RF-007 a RF-012, RS-014, RS-015, RS-025, RNF-006 |
| DP-07 | Campos, retención y protección de auditoría | RF-013, RF-014, RS-026 a RS-030 |
| DP-08 | Controles adicionales para eliminación | RF-011, RS-019 |

## 10. Requisitos mínimos para comenzar el backend

El desarrollo inicial del backend puede comenzar antes de cerrar todas las decisiones anteriores, siempre que se limite a componentes que no las presupongan:

1. Estructura base de FastAPI.
2. Configuración por variables de entorno.
3. Endpoint público mínimo `GET /health`.
4. Modelos base y manejo uniforme de errores.
5. Configuración de pruebas automatizadas.
6. Conexión a PostgreSQL cuando se apruebe el modelo inicial de datos.

No se implementará todavía como definitiva:

- La autenticación.
- La matriz RBAC.
- La ejecución de Terraform.
- El almacenamiento de secretos cloud.
- El modelo final de auditoría.

## 11. Aprobación

| Integrante | Estado | Fecha | Observaciones |
| --- | --- | --- | --- |
| Santiago | Pendiente |  |  |
| Simón | Pendiente |  |  |
| Daniel | Pendiente |  |  |

## 12. Historial de cambios

| Versión | Fecha | Autor(es) | Descripción |
| --- | --- | --- | --- |
| 0.1 | 2026-08-13 | Equipo del proyecto | Borrador inicial de requisitos funcionales, de seguridad y no funcionales |
