# Secure Multicloud Platform

Plataforma web segura para el aprovisionamiento y la gestión de infraestructura multicloud en Microsoft Azure y Amazon Web Services mediante Terraform, IAM y control de acceso basado en roles.

## Integrantes

- Santiago Arango
- Simón
- Daniel

## Objetivo general

Diseñar e implementar una plataforma web segura que permita administrar el ciclo de vida básico de instancias virtuales en Azure y AWS, aplicando autenticación, autorización basada en roles, validación de entradas y auditoría antes de ejecutar operaciones de infraestructura mediante Terraform.

## Alcance funcional inicial

La plataforma contempla inicialmente las siguientes operaciones:

- Listar instancias.
- Crear instancias.
- Encender instancias.
- Apagar instancias.
- Eliminar instancias.
- Consultar registros de auditoría cuando corresponda.

Los cambios de alcance deberán ser acordados y documentados por el equipo.

## Estado del proyecto

El proyecto se encuentra en fase inicial de definición y diseño.

Antes de completar la implementación, el equipo debe acordar:

- Alcance.
- Actores.
- Activos.
- Requisitos funcionales.
- Requisitos de seguridad.
- Arquitectura.
- Modelo de amenazas.
- Matriz de riesgos.
- Matriz RBAC.
- Estrategia de integración con Terraform.
- Estrategia de pruebas y evidencias.

## Tecnologías propuestas

Estas tecnologías están sujetas a validación durante el diseño:

| Componente | Tecnología propuesta |
| --- | --- |
| Frontend | React + TypeScript + Vite |
| Backend | Python + FastAPI |
| Base de datos | PostgreSQL |
| Infraestructura como código | Terraform |
| Proveedores cloud | Microsoft Azure y AWS |
| Contenedores | Docker |

## Estructura del repositorio

```text
secure-multicloud-platform/
├── frontend/
├── backend/
├── terraform/
│   ├── azure/
│   └── aws/
├── infrastructure/
├── security/
│   ├── threat-model/
│   ├── rbac/
│   ├── risks/
│   └── tests/
├── docs/
├── .github/
│   └── pull_request_template.md
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

## Responsabilidades

### Santiago

Responsable principal de:

- `frontend/`
- `backend/`

Santiago implementará en el backend los controles de autenticación, autorización y RBAC que hayan sido aprobados por el equipo.

### Simón y Daniel

Responsables principales de:

- `terraform/`
- `infrastructure/`

Las decisiones relacionadas con Terraform, proveedores cloud, remote state, networking, hosting e infraestructura de secretos deben coordinarse con Simón y Daniel.

### Responsabilidad conjunta

Los tres integrantes participan en:

- `security/`
- `docs/`

Esto incluye:

- Modelo de amenazas.
- Diseño de RBAC.
- Análisis de riesgos.
- Requisitos de seguridad.
- Pruebas de seguridad.
- Documentación y evidencias.

## Diseño e implementación del RBAC

La distribución de responsabilidades es la siguiente:

```text
Diseño de la matriz RBAC
→ Santiago + Simón + Daniel

Implementación del RBAC en el backend
→ Santiago

IAM y RBAC cloud necesarios
→ Simón + Daniel, de acuerdo con el diseño aprobado

Pruebas de RBAC
→ Santiago + Simón + Daniel
```

La matriz definitiva de roles y permisos no debe modificarse unilateralmente para resolver problemas de implementación.

## Principios de seguridad

El proyecto seguirá los siguientes principios:

- Mínimo privilegio.
- Separación de funciones.
- Defensa en profundidad.
- Zero Trust.
- Secure by Design.
- Secure by Default.
- Autorización server-side.
- Validación de entradas.
- Protección de secretos.
- Trazabilidad y auditoría.

Como referencias técnicas se utilizarán, cuando corresponda:

- OWASP ASVS.
- OWASP Top 10.
- NIST.
- Documentación oficial de las tecnologías utilizadas.

## Regla de autorización

Terraform no determina si un usuario está autorizado.

El flujo esperado es:

1. El backend recibe la solicitud.
2. Autentica al usuario.
3. Identifica al usuario y consulta sus permisos.
4. Autoriza o rechaza la operación.
5. Valida los parámetros.
6. Registra la solicitud.
7. Invoca el componente de Terraform.
8. Registra el resultado.
9. Responde al frontend.

Ocultar una función en el frontend no constituye un control de autorización. El backend siempre debe comprobar los permisos antes de ejecutar una operación.

## Integración con Terraform

La estrategia definitiva de integración entre el backend y Terraform aún no está diseñada.

No se deben construir comandos del sistema mediante concatenación directa de datos suministrados por usuarios.

**DEPENDENCIA TERRAFORM/INFRASTRUCTURE — consultar con Simón y Daniel.**

## Auditoría

La plataforma registrará las operaciones relevantes. El diseño exacto deberá ser acordado por los tres integrantes.

Los registros podrán incluir, cuando corresponda:

- Identificador del usuario.
- Rol o contexto de autorización.
- Acción solicitada.
- Proveedor cloud.
- Recurso afectado.
- Fecha y hora.
- Resultado.
- Decisión de permitido o denegado.
- Identificador de correlación.

No se deben registrar contraseñas, tokens completos, secretos cloud ni información sensible innecesaria.

## Información sensible

Nunca deben subirse al repositorio:

- Archivos `.env` reales.
- Contraseñas.
- Tokens.
- Claves privadas.
- Credenciales de Azure o AWS.
- Archivos `terraform.tfstate`.
- Archivos reales `.tfvars`.
- Secretos de aplicación.
- Evidencias sin sanitizar que contengan información sensible.

Los archivos `.env.example` y `.tfvars.example` solo deben contener nombres de variables y valores ficticios.

## Ejecución local

Las instrucciones de instalación y ejecución se agregarán cuando el frontend, el backend y los demás componentes hayan sido inicializados.

## Contribución

Las reglas de ramas, commits, revisiones y Pull Requests están definidas en [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentación y evidencia

Los documentos de arquitectura, requisitos, decisiones y evidencias estarán ubicados en `docs/` y `security/`, según corresponda.

Para cada control importante se buscará mantener trazabilidad entre:

```text
Requisito
→ Amenaza
→ Control
→ Implementación
→ Prueba
→ Resultado
→ Evidencia
```
