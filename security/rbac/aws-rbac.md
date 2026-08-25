# Implementación de RBAC en AWS

## Secure Multicloud Platform

## 1. Objetivo

Este documento describe el modelo de Control de Acceso Basado en Roles (RBAC) implementado en AWS para la plataforma **Secure Multicloud Platform**.

El objetivo principal es aplicar los siguientes principios de seguridad:

- Mínimo privilegio.
- Separación de funciones.
- Denegación por defecto.
- Acceso controlado a recursos EC2.
- Separación entre los roles funcionales de la aplicación y la administración de la cuenta AWS.
- Uso de credenciales temporales mediante AWS STS.
- Aplicación de controles de seguridad directamente en la capa cloud.
- Reducción del radio de impacto mediante separación de estados de Terraform.

El modelo RBAC de AWS refleja los roles funcionales definidos en la aplicación:

- Viewer.
- Operator.
- Administrator.

---

## 2. Arquitectura de autorización

El flujo de autorización diseñado para la plataforma es el siguiente:

```text
Usuario
  |
  v
Autenticación en la aplicación
  |
  v
Rol de aplicación
  |
  v
Autorización en Backend
  |
  v
AWS STS AssumeRole
  |
  v
Rol IAM de AWS
  |
  v
Recursos AWS
```

El frontend no se considera una barrera de autorización.

La autorización debe ser validada siempre por:

1. El backend de la aplicación.
2. AWS IAM en la capa cloud.

Los usuarios finales de la plataforma no recibirán Access Keys de AWS.

El backend será el encargado de asumir el rol correspondiente mediante AWS STS y utilizar credenciales temporales.

---

## 3. Roles IAM implementados

Se implementaron los siguientes roles en AWS:

```text
SMPViewerRole
SMPOperatorRole
SMPAdministratorRole
```

Cada rol posee una política IAM independiente basada en el principio de mínimo privilegio.

---

## 4. Matriz de permisos RBAC

| Capacidad | Viewer | Operator | Administrator |
|---|---:|---:|---:|
| Consultar instancias EC2 | Sí | Sí | Sí |
| Consultar estado de instancias | Sí | Sí | Sí |
| Crear instancias EC2 | No | No | Sí |
| Iniciar instancias EC2 | No | Sí | Sí |
| Detener instancias EC2 | No | Sí | Sí |
| Eliminar instancias EC2 | No | No | Sí |
| Administrar IAM | No | No | No |
| Crear VPC | No | No | No |
| Crear Security Groups | No | No | No |
| Administrar S3 | No | No | No |

El rol **Administrator** es administrador de las máquinas virtuales gestionadas por la plataforma.

No es un administrador de la cuenta AWS.

---

## 5. Rol Viewer

### SMPViewerRole

#### Propósito

Proporcionar acceso de solo lectura a las instancias EC2 administradas por la plataforma.

#### Acciones permitidas

```text
ec2:DescribeInstances
ec2:DescribeInstanceStatus
```

#### Acciones no permitidas

Entre otras:

```text
ec2:RunInstances
ec2:StartInstances
ec2:StopInstances
ec2:TerminateInstances
```

Tampoco tiene permisos para:

- Administrar IAM.
- Administrar S3.
- Crear infraestructura de red.
- Modificar recursos EC2.

Este rol sigue el principio de **denegación por defecto**.

Cualquier acción que no se encuentre explícitamente permitida será rechazada por AWS IAM.

---

## 6. Rol Operator

### SMPOperatorRole

#### Propósito

Permitir la operación diaria de máquinas virtuales existentes sin otorgar permisos para crear o eliminar infraestructura.

#### Acciones de lectura permitidas

```text
ec2:DescribeInstances
ec2:DescribeInstanceStatus
```

#### Acciones operativas permitidas

```text
ec2:StartInstances
ec2:StopInstances
```

Las operaciones de inicio y detención se encuentran restringidas a instancias EC2 que posean simultáneamente los siguientes tags:

```text
project = secure-multicloud
environment = dev
```

Esto impide que el rol Operator pueda iniciar o detener instancias EC2 ajenas al proyecto.

#### Acciones no permitidas

El Operator no puede:

```text
Crear instancias
Eliminar instancias
Modificar IAM
Crear VPC
Crear Security Groups
Administrar S3
```

---

## 7. Rol Administrator

### SMPAdministratorRole

#### Propósito

Administrar el ciclo de vida de las máquinas virtuales gestionadas por la Secure Multicloud Platform.

#### Operaciones permitidas

```text
ec2:RunInstances
ec2:StartInstances
ec2:StopInstances
ec2:TerminateInstances
```

El rol también dispone de los permisos de lectura EC2 necesarios para el funcionamiento de la plataforma.

#### Permisos que no recibe

El Administrator no tiene permisos equivalentes a:

```text
iam:*
s3:*
ec2:CreateVpc
ec2:CreateSecurityGroup
```

Por lo tanto, comprometer una cuenta con rol Administrator dentro de la aplicación no implica obtener automáticamente administración completa de la cuenta AWS.

---

## 8. Controles de seguridad aplicados a la creación de EC2

El rol Administrator no posee un permiso irrestricto sobre `ec2:RunInstances`.

La política IAM establece restricciones adicionales sobre las instancias que pueden ser creadas.

### 8.1 Tipo de instancia

Actualmente la plataforma permite únicamente:

```text
t3.micro
```

Esto ayuda a reducir:

- Costos inesperados.
- Uso excesivo de recursos.
- Despliegues accidentales de instancias de gran capacidad.
- Abuso de recursos cloud.

### 8.2 Propietario autorizado de la AMI

La creación de EC2 está restringida a AMIs pertenecientes a Canonical:

```text
099720109477
```

Esto reduce el riesgo de desplegar máquinas virtuales desde imágenes no confiables.

### 8.3 Red del proyecto

Las instancias deben utilizar recursos de red pertenecientes a Secure Multicloud Platform.

Los recursos utilizados deben estar asociados al proyecto mediante:

```text
project = secure-multicloud
environment = dev
```

Estas restricciones se aplican a:

- Subnets.
- Security Groups.

El objetivo es evitar que la plataforma pueda desplegar máquinas dentro de redes que no correspondan al proyecto.

### 8.4 Prohibición de IPv4 pública

La creación de instancias está diseñada para impedir la asociación de una dirección IPv4 pública:

```text
AssociatePublicIpAddress = false
```

Esto soporta el enfoque de arquitectura:

```text
Private by Default
```

Las máquinas administradas por la plataforma no deben exponerse directamente a Internet de manera predeterminada.

### 8.5 Cifrado de volúmenes EBS

Los volúmenes utilizados durante la creación de las instancias deben estar cifrados.

Condición requerida:

```text
ec2:Encrypted = true
```

Esto protege la información almacenada en disco y establece cifrado de datos en reposo.

### 8.6 Uso obligatorio de IMDSv2

La política del Administrator exige:

```text
ec2:MetadataHttpTokens = required
```

Por lo tanto:

```text
IMDSv1 = No permitido
IMDSv2 = Obligatorio
```

Esto ayuda a reducir riesgos relacionados con ataques contra el servicio de metadatos de instancias EC2.

### 8.7 Tenancy

Actualmente la plataforma exige:

```text
ec2:Tenancy = default
```

No se permite tenancy dedicada desde el rol de aplicación.

Esto evita:

- Costos adicionales no previstos.
- Cambios innecesarios en el modelo de despliegue.
- Uso de configuraciones que no son requeridas para el entorno académico.

### 8.8 Tags obligatorios

Las instancias y los volúmenes creados por la plataforma deben contener:

```text
project = secure-multicloud
environment = dev
```

Estos tags se utilizan para:

- Autorización.
- Identificación de recursos.
- Trazabilidad.
- Auditoría.
- Gestión del ciclo de vida.
- Control de costos.

---

## 9. Uso de AWS STS

Los roles son asumidos mediante:

```text
sts:AssumeRole
```

AWS STS permite utilizar credenciales temporales en lugar de entregar credenciales permanentes a los usuarios de la aplicación.

La arquitectura objetivo es:

```text
Backend FastAPI
      |
      | sts:AssumeRole
      v
+--------------------------+
| SMPViewerRole            |
| SMPOperatorRole          |
| SMPAdministratorRole     |
+--------------------------+
      |
      v
AWS EC2
```

Las credenciales temporales generadas por AWS STS deben permanecer exclusivamente en el backend.

Los usuarios finales nunca deben recibir:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_SESSION_TOKEN
```

---

## 10. Trust Policy actual

Durante la fase de desarrollo y validación, los roles IAM confían temporalmente en la identidad utilizada para Terraform:

```text
secure-multicloud-terraform
```

Esto permite ejecutar pruebas controladas de `sts:AssumeRole`.

Esta configuración es temporal.

Antes de considerar finalizada la arquitectura de producción, la relación de confianza debe ser reemplazada o restringida a la identidad utilizada por el backend de la aplicación.

Este punto queda registrado como una tarea de hardening.

---

## 11. Separación del estado de Terraform

La configuración de AWS Terraform fue reorganizada en componentes independientes:

```text
terraform/aws/
|
+-- bootstrap/
|
+-- infrastructure/
|
+-- iam/
```

Esta separación reduce el radio de impacto de los cambios realizados mediante Terraform.

Anteriormente, IAM e infraestructura compartían el mismo root de Terraform. Esto provocaba que un `terraform plan` realizado para crear roles IAM también detectara los recursos EC2, VPC, subnet y Security Group definidos en el mismo root.

La separación permite administrar IAM sin que Terraform intente crear o modificar infraestructura EC2.

### 11.1 Estado de infraestructura

El componente:

```text
terraform/aws/infrastructure/
```

utiliza el Remote State:

```text
dev/aws/infrastructure/terraform.tfstate
```

Este estado contiene o contendrá recursos como:

```text
VPC
Subnet
Security Group
EC2
```

cuando la infraestructura se encuentre desplegada.

### 11.2 Estado de IAM

El componente:

```text
terraform/aws/iam/
```

utiliza el Remote State:

```text
dev/aws/iam/terraform.tfstate
```

Este state contiene:

```text
SMPViewerRole
SMPOperatorRole
SMPAdministratorRole
```

y sus correspondientes políticas IAM.

### 11.3 Backend de Terraform

El backend remoto se encuentra alojado en Amazon S3.

La configuración incluye:

```text
Cifrado del state
Versionado del bucket
Bloqueo de acceso público
State locking de Terraform
```

El bucket utilizado para almacenar los estados es administrado mediante un componente independiente:

```text
terraform/aws/bootstrap/
```

El bootstrap mantiene su propio estado separado.

---

## 12. Validación funcional

Los roles no fueron únicamente definidos mediante Terraform.

También se realizaron pruebas utilizando sesiones reales de AWS STS para verificar el comportamiento de las políticas IAM.

### 12.1 Validación del Viewer

Se asumió correctamente una sesión de:

```text
SMPViewerRole
```

La identidad fue confirmada mediante:

```text
aws sts get-caller-identity
```

La sesión devolvió un ARN con el formato:

```text
assumed-role/SMPViewerRole/smp-viewer-test
```

#### Prueba permitida

Se ejecutó:

```text
ec2:DescribeInstances
```

Resultado:

```text
ALLOWED
```

La consulta se ejecutó correctamente.

Como en ese momento no existían instancias EC2 desplegadas, no se mostraron registros.

#### Prueba denegada

Se intentó ejecutar:

```text
ec2:DescribeSecurityGroups
```

Resultado:

```text
DENIED
```

AWS devolvió:

```text
UnauthorizedOperation
```

debido a que ninguna policy del Viewer permite `ec2:DescribeSecurityGroups`.

Esto demuestra:

- Mínimo privilegio.
- Denegación por defecto.
- Funcionamiento real de AWS IAM.

### 12.2 Validación del Operator

Se asumió correctamente:

```text
SMPOperatorRole
```

La sesión temporal permitió validar las capacidades del rol.

#### Resultado

```text
Lectura de EC2            ALLOWED
TerminateInstances        DENIED
```

El Operator posee permisos para:

```text
StartInstances
StopInstances
```

pero únicamente cuando las instancias poseen:

```text
project = secure-multicloud
environment = dev
```

La prueba positiva real de START y STOP queda pendiente hasta disponer nuevamente de una instancia EC2 desplegada perteneciente al proyecto.

### 12.3 Validación del Administrator

Se asumió correctamente:

```text
SMPAdministratorRole
```

#### Prueba permitida

Las operaciones de lectura necesarias sobre EC2 fueron permitidas.

Por ejemplo, la consulta de Security Groups funcionó correctamente.

Resultado:

```text
EC2 READ = ALLOWED
```

#### Prueba de separación de privilegios

Se intentó:

```text
iam:ListUsers
```

Resultado:

```text
DENIED
```

Esto demuestra que:

```text
SMPAdministratorRole
        |
        +-- Administrador de VM de la plataforma     SI
        |
        +-- Administrador de la cuenta AWS           NO
```

Esta separación es uno de los controles principales del diseño RBAC.

---

## 13. Pruebas pendientes

Debido a que la infraestructura principal fue destruida temporalmente para evitar consumo innecesario de créditos AWS, todavía se encuentran pendientes algunas pruebas end-to-end.

Estas pruebas serán realizadas cuando se vuelva a desplegar la infraestructura del proyecto.

### Administrator

Validar de manera real:

```text
CREATE
START
STOP
DELETE
```

sobre una instancia del proyecto.

### Operator

Validar de manera real:

```text
START
STOP
```

sobre una instancia autorizada.

### Restricciones por tags

Se debe probar:

```text
Instancia con tags autorizados       -> ALLOW
Instancia sin tags autorizados       -> DENY
```

Tags requeridos:

```text
project = secure-multicloud
environment = dev
```

### Controles de creación

También se deberán realizar pruebas negativas para confirmar que Administrator no pueda desplegar:

```text
Instancia diferente de t3.micro
Instancia con IMDSv1
Instancia con IPv4 pública
Instancia con EBS sin cifrar
Instancia sin tags obligatorios
AMI fuera del propietario autorizado
Subnet externa al proyecto
Security Group externo al proyecto
```

---

## 14. Principios de seguridad demostrados

### 14.1 Mínimo privilegio

Cada rol recibe únicamente los permisos necesarios para cumplir su función.

```text
Viewer
  -> Lectura

Operator
  -> Lectura + operación

Administrator
  -> Gestión completa del ciclo de vida de VM
```

Ninguno obtiene administración general de AWS.

### 14.2 Separación de funciones

Los roles poseen responsabilidades diferentes.

```text
Viewer
  |
  +-- Consulta

Operator
  |
  +-- Consulta
  +-- Inicio
  +-- Detención

Administrator
  |
  +-- Consulta
  +-- Creación
  +-- Inicio
  +-- Detención
  +-- Eliminación
```

### 14.3 Denegación por defecto

AWS IAM deniega cualquier acción que no haya sido permitida explícitamente.

Esto fue comprobado mediante pruebas reales en Viewer, Operator y Administrator.

### 14.4 Defensa en profundidad

La arquitectura utiliza dos capas independientes de autorización:

```text
RBAC de la aplicación
+
IAM de AWS
```

Flujo:

```text
Usuario
   |
   v
Backend
   |
   | ¿Tiene permiso el rol de aplicación?
   |
   v
AWS STS
   |
   | ¿Tiene permiso el rol IAM?
   |
   v
AWS EC2
```

Esto evita depender exclusivamente de una única capa de seguridad.

### 14.5 Credenciales temporales

El acceso cloud está diseñado alrededor de:

```text
AWS STS AssumeRole
```

en lugar de proporcionar Access Keys permanentes a los usuarios finales.

### 14.6 Private by Default

La creación de instancias está diseñada para impedir la asignación de IPv4 pública.

### 14.7 Encryption by Default

Los volúmenes EBS creados mediante la plataforma deben encontrarse cifrados.

### 14.8 IMDSv2 obligatorio

Las nuevas instancias deben utilizar IMDSv2 mediante:

```text
http_tokens = required
```

### 14.9 Control mediante tags

Los tags cumplen una función de seguridad y no solamente organizativa.

```text
project = secure-multicloud
environment = dev
```

se utilizan como condiciones dentro de IAM para determinar sobre qué recursos se pueden ejecutar determinadas operaciones.

---

## 15. Seguridad del estado de Terraform

Los archivos Terraform State pueden contener información sensible sobre la infraestructura.

Por esta razón:

```text
terraform.tfstate
terraform.tfstate.backup
.terraform/
```

se encuentran excluidos del repositorio Git.

Los archivos:

```text
.terraform.lock.hcl
```

sí se versionan para mantener consistencia en las versiones de proveedores utilizadas por Terraform.

Los estados principales se almacenan en S3 y no en el repositorio.

---

## 16. Estado actual del RBAC AWS

Actualmente se encuentran desplegados:

```text
SMPViewerRole
SMPViewerPolicy

SMPOperatorRole
SMPOperatorPolicy

SMPAdministratorRole
SMPAdministratorPolicy
```

El Remote State de IAM contiene:

```text
data.aws_caller_identity.current
aws_iam_role.smp_administrator
aws_iam_role.smp_operator
aws_iam_role.smp_viewer
aws_iam_role_policy.smp_administrator
aws_iam_role_policy.smp_operator
aws_iam_role_policy.smp_viewer
```

---

## 17. Mejoras de seguridad pendientes

Antes de considerar finalizada la arquitectura del proyecto se deben completar las siguientes actividades:

- Reemplazar la identidad temporal `secure-multicloud-terraform` en las Trust Policies por la identidad de ejecución del backend.
- Reducir los permisos administrativos actualmente asignados a la identidad utilizada para desarrollo con Terraform.
- Integrar AWS STS AssumeRole dentro del backend FastAPI.
- Implementar la relación entre los roles de aplicación y los roles IAM.
- Completar las pruebas end-to-end de CREATE, START, STOP y DELETE.
- Validar restricciones mediante tags sobre recursos autorizados y no autorizados.
- Registrar operaciones cloud dentro del sistema de auditoría de la plataforma.
- Revisar las políticas IAM con AWS IAM Access Analyzer.
- Revisar todos los Terraform Plans antes de desplegar infraestructura.
- Mantener separadas las identidades utilizadas por cada integrante del equipo.
- Evitar compartir Access Keys entre usuarios.
- Continuar utilizando credenciales temporales para operaciones de aplicación.

---

## 18. Modelo RBAC final

```text
                    SECURE MULTICLOUD PLATFORM
                              |
                 +------------+------------+
                 |                         |
          RBAC Aplicación              RBAC Cloud
                 |                         |
       +---------+---------+      +--------+---------+
       |         |         |      |        |         |
     Viewer   Operator   Admin  Viewer  Operator  Administrator
                                Role     Role        Role
                                   \       |        /
                                    \      |       /
                                       AWS EC2
```

La combinación de autorización a nivel de aplicación y autorización nativa de AWS proporciona un modelo de defensa en profundidad.

El backend será responsable de traducir el rol funcional del usuario a la identidad cloud correspondiente sin exponer credenciales AWS al usuario final.

---

## 19. Conclusión

La implementación RBAC de AWS para Secure Multicloud Platform establece una separación clara entre las capacidades de lectura, operación y administración de máquinas virtuales.

Los roles fueron implementados utilizando Terraform y almacenados en un Remote State independiente del estado utilizado por la infraestructura EC2.

La arquitectura aplica controles de:

- Mínimo privilegio.
- Denegación por defecto.
- Separación de funciones.
- Defensa en profundidad.
- Credenciales temporales.
- Cifrado de almacenamiento.
- IMDSv2.
- Redes privadas por defecto.
- Restricción por tags.
- Control del tipo de instancia.
- Restricción de imágenes.
- Reducción del radio de impacto de Terraform.

Las pruebas realizadas mediante AWS STS demostraron que los permisos permitidos y denegados se comportan de acuerdo con el modelo definido.

Las pruebas completas del ciclo de vida de las máquinas virtuales serán realizadas cuando la infraestructura de desarrollo vuelva a ser desplegada.
