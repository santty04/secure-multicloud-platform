from sqlalchemy import select

from app.db.models import Permission, Role
from app.db.session import SessionLocal


PERMISSIONS = {
    "vm.read": "Listar y consultar máquinas virtuales.",
    "vm.create": "Crear máquinas virtuales.",
    "vm.start": "Iniciar máquinas virtuales.",
    "vm.stop": "Detener máquinas virtuales.",
    "vm.update": "Editar máquinas virtuales.",
    "vm.delete": "Eliminar máquinas virtuales.",
    "operation.read": "Consultar el historial de operaciones.",
    "user.manage": "Administrar usuarios y roles.",
}


ROLE_PERMISSIONS = {
    "administrator": {
        "name": "Administrador",
        "description": "Control completo de recursos y usuarios.",
        "permissions": set(PERMISSIONS),
    },
    "operator": {
        "name": "Operador",
        "description": "Consulta, inicia y detiene recursos existentes.",
        "permissions": {
            "vm.read",
            "vm.start",
            "vm.stop",
            "operation.read",
        },
    },
    "viewer": {
        "name": "Viewer",
        "description": "Acceso de consulta sobre recursos y operaciones.",
        "permissions": {
            "vm.read",
            "operation.read",
        },
    },
}


def seed_rbac() -> None:
    with SessionLocal() as db:
        permissions_by_code: dict[str, Permission] = {}

        for code, description in PERMISSIONS.items():
            permission = db.scalar(
                select(Permission).where(Permission.code == code)
            )

            if permission is None:
                permission = Permission(
                    code=code,
                    description=description,
                )
                db.add(permission)
                db.flush()
            else:
                permission.description = description

            permissions_by_code[code] = permission

        for role_code, role_data in ROLE_PERMISSIONS.items():
            role = db.scalar(
                select(Role).where(Role.code == role_code)
            )

            if role is None:
                role = Role(
                    code=role_code,
                    name=role_data["name"],
                    description=role_data["description"],
                )
                db.add(role)
                db.flush()
            else:
                role.name = role_data["name"]
                role.description = role_data["description"]

            role.permissions = [
                permissions_by_code[permission_code]
                for permission_code in sorted(role_data["permissions"])
            ]

        db.commit()

    print("Roles and permissions loaded successfully.")


if __name__ == "__main__":
    seed_rbac()