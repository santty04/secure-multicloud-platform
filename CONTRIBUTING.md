# Guía de contribución

Este documento define las reglas básicas de colaboración para Secure Multicloud Platform.

## Responsabilidades principales

| Ruta | Responsables principales |
| --- | --- |
| `frontend/` | Santiago |
| `backend/` | Santiago |
| `terraform/` | Simón y Daniel |
| `infrastructure/` | Simón y Daniel |
| `security/` | Santiago, Simón y Daniel |
| `docs/` | Santiago, Simón y Daniel |

La responsabilidad principal indica quién implementa o revisa normalmente los cambios. No elimina la responsabilidad conjunta sobre la seguridad general del proyecto.

## Rama principal

La rama principal será:

```text
main
```

No se desarrollará directamente sobre `main`. Cada cambio debe realizarse en una rama independiente creada desde una versión actualizada de `main`.

Para un equipo de tres integrantes no se utilizará inicialmente una rama permanente `develop`. Las ramas serán pequeñas, de corta duración y se integrarán mediante Pull Request.

## Convención de ramas

```text
feature/<componente>-<descripcion>
fix/<componente>-<descripcion>
docs/<descripcion>
security/<descripcion>
chore/<descripcion>
```

Ejemplos:

```text
feature/backend-health-endpoint
feature/frontend-login
feature/terraform-azure-vm
fix/backend-input-validation
security/rbac-matrix
docs/functional-requirements
chore/project-configuration
```

No se deben utilizar nombres personales o ambiguos como:

```text
santiago
simon
daniel
mi-rama
prueba
cambios
```

El nombre de la rama debe describir el propósito del cambio.

## Flujo de trabajo

Antes de comenzar un cambio:

```bash
git switch main
git pull
git switch -c tipo/descripcion
```

Después de realizar y probar los cambios:

```bash
git status
git diff
git add <archivos-especificos>
git diff --staged
git commit -m "tipo(componente): descripcion"
git push -u origin tipo/descripcion
```

Después se debe crear un Pull Request hacia `main`.

Se recomienda agregar archivos específicos con `git add` en lugar de usar `git add .` sin revisar previamente los cambios.

## Convención de commits

Formato recomendado:

```text
tipo(componente): descripción breve
```

Tipos permitidos:

- `feat`: nueva funcionalidad.
- `fix`: corrección de un error.
- `docs`: documentación.
- `test`: pruebas.
- `security`: controles o documentación de seguridad.
- `refactor`: reorganización sin cambiar el comportamiento esperado.
- `chore`: configuración o mantenimiento.

Ejemplos:

```text
feat(backend): add health endpoint
feat(frontend): add login interface
security(rbac): define initial permission matrix
docs(architecture): document request flow
fix(terraform): correct Azure variable validation
test(backend): verify unauthenticated access denial
```

Cada commit debe representar un cambio coherente y revisable.

## Pull Requests

Todo Pull Request debe indicar:

- Qué problema resuelve.
- Qué archivos o componentes modifica.
- Cómo se probó.
- Qué resultado se obtuvo.
- Qué riesgos o controles de seguridad están relacionados.
- Qué evidencia se guardó.
- Si introduce dependencias entre componentes.

El Pull Request no debe aprobarse si las pruebas relevantes fallan o si contiene información sensible.

## Revisión requerida

### Cambios en `frontend/` o `backend/`

- Revisión principal de Santiago.
- Revisión conjunta cuando afecten autenticación, autorización, auditoría o controles de seguridad compartidos.

### Cambios en `terraform/` o `infrastructure/`

- Revisión de Simón o Daniel.
- Revisión conjunta cuando afecten IAM, secretos, permisos, exposición de red o controles de seguridad compartidos.

### Cambios en `security/`

- Revisión de los tres integrantes.

### Cambios en `docs/`

- Revisión de los integrantes relacionados con la decisión documentada.

## Reglas de seguridad

Está prohibido incluir en Git:

- Archivos `.env` reales.
- Contraseñas.
- Tokens.
- Claves privadas.
- Credenciales de Azure o AWS.
- Archivos `terraform.tfstate`.
- Archivos reales `.tfvars`.
- Datos personales o sensibles innecesarios.
- Evidencias con secretos visibles.

Antes de confirmar un cambio se debe revisar:

```bash
git status
git diff --staged
```

Si un secreto fue agregado a un commit, eliminarlo en un commit posterior no es suficiente, porque puede continuar en el historial. El equipo debe detener la integración, revocar o rotar el secreto y definir la limpieza segura del historial.

## Decisiones compartidas

Ningún integrante debe cambiar unilateralmente:

- La matriz RBAC.
- Los requisitos de seguridad.
- El modelo de amenazas.
- La matriz de riesgos.
- La arquitectura general.
- La estrategia de integración con Terraform.
- La infraestructura de secretos.
- Los controles IAM de Azure o AWS.

Las decisiones aprobadas deben documentarse antes o junto con su implementación.

## Dependencias entre componentes

Cuando el backend necesite una definición relacionada con Terraform, infraestructura, cloud, remote state, networking, hosting o secretos, se debe registrar expresamente:

```text
DEPENDENCIA TERRAFORM/INFRASTRUCTURE — consultar con Simón y Daniel.
```

No se deben asumir interfaces o mecanismos de integración que todavía no hayan sido acordados.

## Evidencia

Por cada control importante se debe conservar, cuando corresponda:

- Requisito relacionado.
- Amenaza o riesgo tratado.
- Descripción del control.
- Archivos modificados.
- Procedimiento de prueba.
- Resultado esperado.
- Resultado obtenido.
- Evidencia sanitizada.

Las evidencias no deben contener contraseñas, tokens completos, claves cloud ni información sensible innecesaria.

## Lista de verificación antes del Pull Request

- [ ] La rama fue creada desde una versión actualizada de `main`.
- [ ] El cambio respeta las responsabilidades del equipo.
- [ ] No se incluyeron secretos ni archivos sensibles.
- [ ] Se revisó `git diff --staged`.
- [ ] Se ejecutaron las pruebas aplicables.
- [ ] Se documentaron los cambios relevantes.
- [ ] Se guardó evidencia sanitizada cuando corresponde.
- [ ] Las decisiones compartidas fueron aprobadas por el equipo.
- [ ] Las dependencias con otros componentes están identificadas.
