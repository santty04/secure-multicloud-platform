# Backend — Secure Multicloud Platform

API REST de Secure Multicloud Platform, desarrollada con Python y FastAPI.

Este documento explica cómo preparar y ejecutar el backend desde cero en macOS y Windows.

## Estado actual

La primera versión del backend incluye:

- Aplicación FastAPI.
- Endpoint público `GET /health`.
- Documentación OpenAPI.
- Pruebas automatizadas con pytest.
- Análisis y formato con Ruff.

Todavía no incluye PostgreSQL, autenticación, RBAC ni integración con Terraform.

## Requisitos

- Git.
- `uv` como administrador de Python, entorno virtual y dependencias.
- Acceso al repositorio del proyecto.

El proyecto utiliza Python 3.13. La versión exacta de las dependencias está registrada en `uv.lock`.

No es necesario crear ni activar manualmente un entorno virtual. `uv` crea `.venv` y ejecuta los comandos dentro de ese entorno.

## Estructura actual

```text
backend/
├── app/
│   ├── __init__.py
│   └── main.py
├── tests/
│   ├── __init__.py
│   └── test_health.py
├── .python-version
├── pyproject.toml
├── uv.lock
└── README.md
```

## 1. Obtener el repositorio

Si todavía no tienes una copia local:

```bash
git clone <URL_DEL_REPOSITORIO>
cd secure-multicloud-platform/backend
```

Si ya tienes el repositorio:

```bash
cd secure-multicloud-platform
git switch main
git pull
cd backend
```

Reemplaza `<URL_DEL_REPOSITORIO>` por la dirección HTTPS o SSH real del repositorio.

## 2. Instalación en macOS

### 2.1 Instalar Homebrew

Comprueba si Homebrew está instalado:

```bash
brew --version
```

Si no está instalado, utiliza las instrucciones oficiales disponibles en:

<https://brew.sh/>

Después de instalarlo, cierra y abre nuevamente la terminal.

### 2.2 Instalar Git y uv

```bash
brew install git uv
```

Comprueba la instalación:

```bash
git --version
uv --version
```

### 2.3 Instalar Python y dependencias

Desde `backend/`:

```bash
uv python install 3.13
uv sync --locked
```

Comprueba el intérprete utilizado:

```bash
uv run python --version
```

El resultado debe indicar Python 3.13.x.

## 3. Instalación en Windows

Los siguientes comandos deben ejecutarse en PowerShell.

### 3.1 Instalar Git

```powershell
winget install --id Git.Git -e
```

### 3.2 Instalar uv

```powershell
winget install --id astral-sh.uv -e
```

Cierra y abre nuevamente PowerShell y verifica:

```powershell
git --version
uv --version
```

### 3.3 Instalar Python y dependencias

Desde `backend/`:

```powershell
uv python install 3.13
uv sync --locked
```

Comprueba el intérprete utilizado:

```powershell
uv run python --version
```

El resultado debe indicar Python 3.13.x.

`uv` puede administrar Python para el proyecto, por lo que no es obligatorio instalarlo separadamente desde Microsoft Store o python.org.

## 4. Ejecutar el backend en desarrollo

Los comandos son iguales en macOS, Windows PowerShell y Linux.

Desde `backend/`:

```bash
uv run fastapi dev app/main.py
```

La terminal debe mostrar direcciones similares a:

```text
API:           http://127.0.0.1:8000
Documentación: http://127.0.0.1:8000/docs
```

Comprueba el endpoint de salud:

```text
http://127.0.0.1:8000/health
```

Respuesta esperada:

```json
{
  "status": "ok"
}
```

Para detener el servidor, utiliza `Control + C` en la terminal donde está ejecutándose.

El modo `fastapi dev` es únicamente para desarrollo local. No constituye la configuración definitiva de producción.

## 5. Documentación de la API

Con el backend en ejecución, abre:

```text
http://127.0.0.1:8000/docs
```

FastAPI genera esta interfaz a partir del esquema OpenAPI de la aplicación.

También está disponible el documento OpenAPI en:

```text
http://127.0.0.1:8000/openapi.json
```

La documentación no reemplaza los controles de autenticación y autorización que se implementarán en el backend.

## 6. Ejecutar las pruebas

Desde `backend/`:

```bash
uv run pytest
```

Resultado mínimo esperado:

```text
1 passed
```

Puede aparecer una advertencia de deprecación procedente de `FastAPI/Starlette` relacionada con el cliente HTTP. Mientras la prueba finalice correctamente, esta advertencia se documentará y se revisará antes de actualizar las dependencias; no debe ocultarse ni resolverse cambiando paquetes sin validar compatibilidad.

## 7. Verificar calidad y formato

Ejecuta:

```bash
uv run ruff check .
uv run ruff format --check .
```

Resultados esperados:

```text
All checks passed!
```

Si Ruff encuentra problemas corregibles automáticamente:

```bash
uv run ruff check . --fix
uv run ruff format .
```

Después vuelve a validar:

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

## 8. Instalar o actualizar dependencias

Después de clonar el proyecto o recibir cambios en `uv.lock`:

```bash
uv sync --locked
```

Para agregar una dependencia de producción:

```bash
uv add nombre-del-paquete
```

Para agregar una dependencia utilizada únicamente en desarrollo o pruebas:

```bash
uv add --dev nombre-del-paquete
```

No deben editarse manualmente las versiones internas de `uv.lock`.

No se recomienda usar `pip install` directamente dentro de este proyecto, porque la dependencia podría no quedar registrada correctamente en `pyproject.toml` y `uv.lock`.

Las actualizaciones deliberadas deben realizarse en una rama independiente, ejecutar todas las pruebas y revisar los cambios del lockfile.

## 9. Archivos que sí se versionan

Los siguientes archivos deben mantenerse en Git:

```text
.python-version
pyproject.toml
uv.lock
app/
tests/
README.md
```

`uv.lock` es importante porque permite que los integrantes instalen el mismo conjunto de dependencias.

## 10. Archivos que no se versionan

No deben subirse:

```text
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
.env
```

Comprueba que el entorno esté ignorado desde la raíz del repositorio:

```bash
git check-ignore -v backend/.venv
```

Nunca deben incluirse en Git:

- Contraseñas.
- Tokens.
- Claves privadas.
- Credenciales de Azure o AWS.
- Secretos de aplicación.
- Terraform State.

## 11. Flujo recomendado antes de un commit

Desde `backend/`:

```bash
uv sync --locked
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Desde la raíz del repositorio:

```bash
git status
git diff
git diff --staged
```

Antes de confirmar cambios, verifica que las pruebas pasen y que no aparezcan archivos sensibles o generados localmente.

## 12. Solución de problemas

### `uv: command not found`

Cierra y abre la terminal después de instalar `uv`.

En macOS también puedes comprobar:

```bash
which uv
```

En Windows PowerShell:

```powershell
Get-Command uv
```

### `python`, `python3` o `py` no existe

No es necesario depender de esos comandos globales. Instala el intérprete administrado por el proyecto:

```bash
uv python install 3.13
uv run python --version
```

### El puerto 8000 está ocupado

Ejecuta temporalmente en otro puerto:

```bash
uv run fastapi dev app/main.py --port 8001
```

Después abre:

```text
http://127.0.0.1:8001/health
```

### `ModuleNotFoundError: No module named 'app'`

Comprueba que estás dentro de la carpeta `backend/`:

```bash
pwd
```

En Windows PowerShell:

```powershell
Get-Location
```

Después ejecuta:

```bash
uv sync --locked
uv run pytest
```

### PowerShell bloquea scripts

La ejecución normal mediante `uv run` no requiere activar `.venv`. Evita depender de `.venv\Scripts\Activate.ps1` y ejecuta directamente:

```powershell
uv run fastapi dev app/main.py
```

### El navegador solicita `/favicon.ico` y recibe 404

Es normal. El navegador intenta obtener un ícono que el backend todavía no proporciona. No afecta el endpoint `/health` ni la documentación.

### Las dependencias no coinciden después de actualizar el repositorio

Ejecuta desde `backend/`:

```bash
uv sync --locked
```

Si el archivo `uv.lock` fue modificado de forma deliberada en la rama, revisa primero el cambio antes de instalar o confirmar dependencias nuevas.

## 13. Endpoints actuales

| Método | Ruta | Autenticación | Descripción |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Comprueba el estado básico de la API sin exponer información interna |

## 14. Seguridad

- El endpoint `/health` debe mantener una respuesta mínima.
- No se deben agregar secretos al código o al README.
- Ocultar funciones en el frontend no reemplaza la autorización server-side.
- Terraform no se invocará hasta definir y aprobar la integración correspondiente.
- Los endpoints protegidos se incorporarán cuando estén aprobados el mecanismo de autenticación y la matriz RBAC.

## 15. Comando rápido

Para un equipo que ya tiene Git y `uv` instalados:

```bash
git pull
cd backend
uv sync --locked
uv run pytest
uv run fastapi dev app/main.py
```
