# Definición inicial del proyecto

## 1. Identificación

**Nombre:** Secure Multicloud Platform  
**Proyecto:** Diseño e implementación de una plataforma web segura para el aprovisionamiento y gestión de infraestructura multicloud mediante Terraform, IAM y control de acceso basado en roles.  
**Integrantes:** Santiago, Simón y Daniel.  
**Estado del documento:** Borrador para revisión y aprobación del equipo.

## 2. Propósito

El proyecto busca diseñar e implementar una plataforma web segura que centralice el aprovisionamiento y la administración del ciclo de vida básico de instancias virtuales en Microsoft Azure y Amazon Web Services.

La plataforma proporcionará una interfaz web para que usuarios autenticados soliciten operaciones sobre infraestructura. Antes de invocar Terraform, el backend deberá autenticar al usuario, comprobar sus permisos, validar los parámetros y registrar la operación para fines de trazabilidad y auditoría.

El proyecto pretende demostrar que el aprovisionamiento multicloud puede realizarse aplicando controles de seguridad desde la capa de aplicación hasta la infraestructura, con énfasis en mínimo privilegio, separación de funciones, protección de secretos, validación server-side y generación de evidencia verificable.

## 3. Objetivo general

Diseñar e implementar una plataforma web segura para aprovisionar y gestionar el ciclo de vida básico de instancias virtuales en Azure y AWS mediante Terraform, incorporando autenticación, control de acceso basado en roles, validación de entradas, auditoría y controles de seguridad acordes con los riesgos identificados.

## 4. Objetivos específicos iniciales

1. Diseñar una arquitectura que separe la interfaz web, la API backend, la persistencia, la automatización con Terraform y los proveedores cloud.
2. Implementar una interfaz web para consultar y solicitar operaciones autorizadas sobre instancias virtuales.
3. Implementar una API REST que centralice autenticación, autorización, validación, manejo de errores y auditoría.
4. Integrar el backend con los componentes Terraform de Azure y AWS mediante un mecanismo seguro definido por el equipo.
5. Diseñar e implementar un esquema RBAC que aplique mínimo privilegio y separación de funciones.
6. Identificar amenazas y riesgos relacionados con la aplicación, Terraform, las credenciales cloud, el estado de infraestructura y los proveedores Azure y AWS.
7. Ejecutar pruebas funcionales y de seguridad que produzcan evidencia sobre la efectividad de los controles implementados.

## 5. Alcance incluido

### 5.1 Plataforma web

- Interfaz de inicio de sesión.
- Dashboard de la plataforma.
- Visualización de recursos administrados.
- Visualización diferenciada de recursos de Azure y AWS.
- Formularios para solicitar operaciones permitidas.
- Manejo comprensible de estados de carga, errores y resultados.
- Adaptación de la interfaz según los permisos como control de experiencia de usuario.

La interfaz no será considerada un mecanismo suficiente de autorización. Toda autorización deberá comprobarse nuevamente en el backend.

### 5.2 Backend y API

- API REST desarrollada con Python y FastAPI.
- Modelos explícitos de entrada y salida.
- Validación server-side de los datos recibidos.
- Autenticación de usuarios.
- Aplicación técnica del RBAC aprobado por el equipo.
- Protección de endpoints y operaciones.
- Persistencia en PostgreSQL.
- Manejo seguro y uniforme de errores.
- Registro de eventos de auditoría.
- Integración posterior con los componentes Terraform.

### 5.3 Infraestructura multicloud

El alcance funcional inicial comprende instancias virtuales en:

- Microsoft Azure Virtual Machines.
- Amazon Web Services EC2.

Las operaciones iniciales son:

- `LIST`: listar instancias administradas por la plataforma.
- `CREATE`: crear una instancia.
- `START`: encender una instancia existente.
- `STOP`: apagar una instancia existente.
- `DELETE`: eliminar una instancia existente.

Los tipos exactos de recursos auxiliares necesarios para una instancia —por ejemplo, red, interfaz, disco, grupo de seguridad o equivalentes— deberán ser definidos por Simón y Daniel como parte de Terraform e infraestructura.

**DEPENDENCIA TERRAFORM/INFRASTRUCTURE — consultar con Simón y Daniel.**

### 5.4 Seguridad

- Definición conjunta de actores y activos.
- Requisitos de seguridad.
- Modelo de amenazas.
- Matriz de riesgos.
- Diseño conjunto de la matriz RBAC.
- Autenticación y autorización server-side.
- Validación de entradas y parámetros.
- Protección de secretos.
- Auditoría de operaciones relevantes, permitidas y denegadas.
- Pruebas de seguridad y conservación de evidencias sanitizadas.
- Consideración de OWASP ASVS, OWASP Top 10, NIST y documentación oficial cuando corresponda.

## 6. Fuera de alcance inicial

Salvo que el equipo apruebe y documente un cambio de alcance, no se contempla:

- Kubernetes.
- Arquitectura de microservicios.
- Aplicación móvil nativa.
- Administración completa de todos los servicios disponibles en Azure y AWS.
- Aprovisionamiento de servicios cloud diferentes de los necesarios para soportar Azure Virtual Machines y AWS EC2.
- Gestión financiera, presupuestal o de facturación cloud.
- Optimización automática de costos.
- Migración automática de cargas entre proveedores.
- Orquestación multicloud avanzada o recuperación ante desastres entre proveedores.
- Ejecución arbitraria de comandos Terraform suministrados por usuarios.
- Recepción de código Terraform libre enviado desde el frontend.
- Construcción de comandos del sistema mediante concatenación directa de entradas de usuario.
- Integración con Kubernetes, Ansible u otras plataformas de orquestación no requeridas por el objetivo.
- Sustitución de las consolas administrativas completas de Azure o AWS.

## 7. Límites del sistema

La plataforma estará compuesta conceptualmente por:

```text
Usuario
  → Frontend web
  → Backend/API
  → Autenticación
  → Autorización RBAC
  → Validación
  → Mecanismo de integración por definir
  → Terraform
  → Azure o AWS
```

PostgreSQL almacenará la información de aplicación que se defina, como usuarios, referencias de recursos, permisos y registros de auditoría. No deberá utilizarse para almacenar secretos cloud en texto claro ni el contenido completo de Terraform State.

La integración definitiva entre el backend y Terraform aún no forma parte de las decisiones aprobadas. No se debe asumir si será síncrona, asíncrona, mediante una cola, un proceso controlado, un servicio separado u otro mecanismo hasta realizar el análisis correspondiente.

## 8. Actores humanos

| ID | Actor | Descripción | Necesidad principal | Estado |
| --- | --- | --- | --- | --- |
| AH-01 | Usuario autenticado | Persona con una cuenta válida y activa | Acceder a las funciones autorizadas | Confirmado |
| AH-02 | Auditor | Rol inicialmente contemplado para actividades de consulta y verificación | Consultar información autorizada y evidencias | Provisional |
| AH-03 | Operador | Rol inicialmente contemplado para operaciones de ciclo de vida | Ejecutar únicamente las operaciones asignadas | Provisional |
| AH-04 | Desplegador | Rol inicialmente contemplado para el aprovisionamiento | Crear recursos dentro de parámetros permitidos | Provisional |
| AH-05 | Administrador | Rol inicialmente contemplado para funciones administrativas | Administrar funciones expresamente aprobadas | Provisional |
| AH-06 | Equipo del proyecto | Santiago, Simón y Daniel | Diseñar, implementar, probar y documentar | Confirmado |

Los nombres Auditor, Operador, Desplegador y Administrador no otorgan por sí mismos ningún permiso. Sus permisos deberán establecerse únicamente en la matriz RBAC aprobada por los tres integrantes.

## 9. Sistemas y servicios externos

| ID | Sistema o servicio | Función dentro del proyecto | Límite de confianza |
| --- | --- | --- | --- |
| SE-01 | Microsoft Azure | Proveedor de infraestructura para máquinas virtuales | Externo |
| SE-02 | Amazon Web Services | Proveedor de infraestructura para instancias EC2 | Externo |
| SE-03 | Terraform | Motor de infraestructura como código | Componente privilegiado |
| SE-04 | PostgreSQL | Persistencia de datos de aplicación y auditoría | Interno |
| SE-05 | Navegador web | Cliente utilizado para acceder a la plataforma | No confiable por defecto |
| SE-06 | Repositorio GitHub | Versionamiento del código y documentación | Externo controlado |

El navegador y cualquier dato procedente del cliente deben considerarse no confiables. Terraform y las identidades cloud deben considerarse componentes privilegiados debido a su capacidad de crear, modificar o eliminar infraestructura.

## 10. Activos iniciales

| ID | Activo | Descripción | Propiedad prioritaria | Criticidad inicial |
| --- | --- | --- | --- | --- |
| ACT-01 | Cuentas de usuario | Identidades autorizadas para acceder a la plataforma | Integridad y disponibilidad | Alta |
| ACT-02 | Credenciales de autenticación | Elementos utilizados para verificar la identidad | Confidencialidad e integridad | Crítica |
| ACT-03 | Sesiones o tokens | Evidencia temporal de una autenticación válida | Confidencialidad e integridad | Crítica |
| ACT-04 | Roles y permisos | Reglas que determinan las acciones autorizadas | Integridad | Crítica |
| ACT-05 | API backend | Componente que aplica reglas y coordina operaciones | Integridad y disponibilidad | Crítica |
| ACT-06 | Base de datos | Usuarios, autorizaciones, recursos y auditoría | Confidencialidad, integridad y disponibilidad | Crítica |
| ACT-07 | Credenciales e identidades cloud | Acceso programático autorizado a Azure y AWS | Confidencialidad e integridad | Crítica |
| ACT-08 | Terraform State | Estado y metadatos de la infraestructura administrada | Confidencialidad, integridad y disponibilidad | Crítica |
| ACT-09 | Código Terraform | Definición reproducible de infraestructura | Integridad y disponibilidad | Alta |
| ACT-10 | Instancias virtuales | Recursos administrados en Azure y AWS | Integridad y disponibilidad | Alta |
| ACT-11 | Registros de auditoría | Evidencia de solicitudes, decisiones y resultados | Integridad y disponibilidad | Alta |
| ACT-12 | Código fuente | Implementación de frontend, backend, Terraform y controles | Integridad y disponibilidad | Alta |
| ACT-13 | Secretos de aplicación | Claves y valores sensibles usados por los componentes | Confidencialidad e integridad | Crítica |
| ACT-14 | Configuración de infraestructura | Parámetros de redes, IAM, almacenamiento y despliegue | Confidencialidad e integridad | Alta |
| ACT-15 | Evidencias del proyecto | Pruebas, capturas y resultados para evaluación académica | Integridad y confidencialidad | Media/Alta |

La criticidad presentada es una clasificación inicial y deberá revisarse durante el análisis formal de riesgos.

## 11. Operaciones iniciales

| ID | Operación | Recurso | Proveedor o componente | Efecto | Criticidad inicial |
| --- | --- | --- | --- | --- | --- |
| OP-01 | Iniciar sesión | Cuenta/sesión | Plataforma | Crea acceso autenticado | Alta |
| OP-02 | Cerrar sesión | Sesión | Plataforma | Finaliza o invalida acceso | Media |
| OP-03 | Consultar perfil y permisos propios | Usuario | Plataforma | Solo lectura | Media |
| OP-04 | Listar instancias | VM/EC2 | Azure/AWS | Solo lectura | Media |
| OP-05 | Consultar una instancia | VM/EC2 | Azure/AWS | Solo lectura | Media |
| OP-06 | Crear instancia | VM/EC2 | Azure/AWS | Crea infraestructura y puede generar costos | Alta |
| OP-07 | Encender instancia | VM/EC2 | Azure/AWS | Modifica estado y puede generar costos | Alta |
| OP-08 | Apagar instancia | VM/EC2 | Azure/AWS | Interrumpe disponibilidad | Alta |
| OP-09 | Eliminar instancia | VM/EC2 | Azure/AWS | Acción destructiva potencialmente irreversible | Crítica |
| OP-10 | Consultar auditoría | Registro | Plataforma | Expone información de trazabilidad | Alta |
| OP-11 | Registrar decisión autorizada | Registro | Backend | Genera evidencia | Alta |
| OP-12 | Registrar decisión denegada | Registro | Backend | Genera evidencia de intento rechazado | Alta |

Las operaciones de administración de usuarios, asignación de roles y gestión de permisos no se incluyen como definitivas hasta que el equipo decida quién y cómo las realizará.

## 12. Reglas generales de seguridad

1. Ninguna operación sobre infraestructura podrá ejecutarse antes de autenticar y autorizar al usuario en el backend.
2. La interfaz podrá ocultar o deshabilitar funciones, pero esas medidas serán únicamente controles de experiencia de usuario.
3. El backend deberá validar el permiso correspondiente en cada solicitud.
4. Los identificadores y parámetros recibidos desde el cliente deberán tratarse como datos no confiables.
5. Terraform no decidirá los permisos del usuario de la plataforma.
6. No se aceptarán comandos del sistema ni fragmentos Terraform arbitrarios provenientes del frontend.
7. Las credenciales cloud, contraseñas, tokens completos y secretos no deberán aparecer en el repositorio, frontend, respuestas de API, logs o evidencias.
8. Las acciones críticas y sus resultados deberán generar auditoría.
9. Las denegaciones por falta de permiso deberán registrarse cuando el diseño de auditoría así lo establezca, evitando almacenar datos sensibles innecesarios.
10. Ante ausencia de un permiso explícito, la operación deberá denegarse por defecto.

## 13. Restricciones y supuestos

### 13.1 Restricciones

- El proyecto dispone aproximadamente de cuatro meses.
- El equipo está compuesto por tres integrantes.
- Se priorizarán seguridad, simplicidad, evidencia y funcionalidad.
- No se adoptarán tecnologías adicionales sin justificar el problema que resuelven, su necesidad, el riesgo introducido y una alternativa más sencilla.
- El diseño deberá ser viable para una implementación y demostración académica.

### 13.2 Supuestos por validar

- La plataforma administrará principalmente recursos creados o incorporados explícitamente bajo su control.
- Se utilizará una lista controlada de regiones, tamaños e imágenes, en lugar de aceptar valores arbitrarios.
- La eliminación requerirá una confirmación explícita y autorización reforzada según la matriz RBAC.
- Las operaciones de infraestructura podrán tardar más que una solicitud HTTP convencional.
- Las credenciales utilizadas por Terraform tendrán permisos mínimos y estarán separadas por proveedor o entorno cuando sea viable.

Estos supuestos no constituyen decisiones aprobadas.

## 14. Decisiones pendientes

| ID | Decisión | Responsables | Impacto |
| --- | --- | --- | --- |
| DP-01 | Confirmar los roles necesarios | Los tres | RBAC, interfaz y pruebas |
| DP-02 | Definir la matriz rol-permiso | Los tres | Autorización server-side e IAM |
| DP-03 | Definir quién crea usuarios y asigna roles | Los tres | Alcance, administración y seguridad |
| DP-04 | Elegir el mecanismo de autenticación | Los tres; implementación backend por Santiago | Sesiones, tokens y modelo de datos |
| DP-05 | Definir regiones, imágenes y tamaños permitidos | Los tres; viabilidad cloud con Simón y Daniel | Validación, costos y seguridad |
| DP-06 | Determinar si se administrarán solo recursos creados por la plataforma | Los tres | Inventario, IDOR y Terraform State |
| DP-07 | Diseñar la integración backend–Terraform | Los tres; énfasis técnico de Simón y Daniel | Arquitectura, ejecución y aislamiento |
| DP-08 | Definir almacenamiento y protección de Terraform State | Simón y Daniel con revisión de seguridad conjunta | Confidencialidad e integridad |
| DP-09 | Definir infraestructura y ciclo de vida de secretos | Simón y Daniel con revisión de seguridad conjunta | Credenciales y despliegue |
| DP-10 | Definir campos y retención de auditoría | Los tres | Trazabilidad, privacidad y almacenamiento |
| DP-11 | Definir si las operaciones serán síncronas o asíncronas | Los tres | Experiencia de usuario y arquitectura |
| DP-12 | Definir controles adicionales para eliminación | Los tres | Prevención de acciones destructivas |

## 15. Criterios iniciales de éxito

El alcance mínimo se considerará demostrado cuando:

1. Un usuario pueda autenticarse de forma segura.
2. El backend permita o deniegue operaciones conforme a una matriz RBAC aprobada.
3. La plataforma pueda listar y administrar el ciclo de vida básico de al menos una instancia en Azure y una instancia EC2 en AWS, dentro del alcance aprobado.
4. Terraform solo sea invocado después de superar autenticación, autorización y validación.
5. Las operaciones críticas produzcan registros de auditoría verificables y sanitizados.
6. Las pruebas demuestren denegación ante acceso sin autenticación, tokens o sesiones inválidas, permisos insuficientes, manipulación de identificadores y parámetros no permitidos.
7. Las credenciales cloud, secretos y Terraform State no sean expuestos en el repositorio, frontend, API, logs ni evidencias.
8. Exista trazabilidad entre requisitos, amenazas, riesgos, controles, implementación, pruebas y evidencias.

## 16. Preguntas para aprobación del equipo

Antes de aprobar este documento, Santiago, Simón y Daniel deben responder:

1. ¿La plataforma administrará únicamente recursos creados por ella?
2. ¿Quién podrá crear, desactivar y modificar usuarios?
3. ¿Quién podrá asignar o retirar roles?
4. ¿Son necesarios los cuatro roles iniciales: Auditor, Operador, Desplegador y Administrador?
5. ¿Cuáles regiones, tamaños e imágenes estarán permitidos en cada proveedor?
6. ¿Qué recursos auxiliares creará Terraform junto con cada instancia?
7. ¿Eliminar una instancia requerirá confirmación adicional o algún control de doble validación?
8. ¿Qué información podrá consultar cada rol en los registros de auditoría?
9. ¿Cuánto tiempo se conservarán los registros de auditoría?
10. ¿Cómo se identificará que un recurso pertenece al usuario, proyecto o entorno correcto?
11. ¿Se utilizarán ambientes separados de desarrollo, pruebas y demostración?
12. ¿Cuál será el límite aceptable de costos para las pruebas en Azure y AWS?

## 17. Control de aprobación

| Integrante | Estado | Fecha | Observaciones |
| --- | --- | --- | --- |
| Santiago | Pendiente |  |  |
| Simón | Pendiente |  |  |
| Daniel | Pendiente |  |  |

## 18. Historial de cambios

| Versión | Fecha | Autor(es) | Descripción |
| --- | --- | --- | --- |
| 0.1 | Por definir | Equipo del proyecto | Borrador inicial de alcance, actores, activos y operaciones |
