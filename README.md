# Secure Multicloud Platform

Plataforma web segura para el aprovisionamiento y gestión de infraestructura
multicloud en Microsoft Azure y Amazon Web Services mediante Terraform, IAM
y control de acceso basado en roles.

## Integrantes

- Santiago Arango
- Simón
- Daniel

## Objetivo

Diseñar e implementar una plataforma web segura que permita administrar el
ciclo de vida básico de instancias virtuales en Azure y AWS.

Operaciones inicialmente contempladas:

- Listar instancias.
- Crear instancias.
- Encender instancias.
- Apagar instancias.
- Eliminar instancias.
- Consultar registros de auditoría cuando corresponda.

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
- Pruebas y evidencias.

## Tecnologías propuestas

Estas tecnologías están sujetas a validación durante el diseño:

| Componente | Tecnología propuesta |
|---|---|
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
├── .env.example
├── .gitignore
└── README.md