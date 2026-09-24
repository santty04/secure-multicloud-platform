"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/features/auth/hooks";
import { can } from "@/features/auth/can";
import { authKeys } from "@/features/auth/keys";
import { CLOUD_ROLE_CODES, deactivateUser, listRoles, listUsers, resendInvitation, saveUser, type ManagedUser, type ManagedRole } from "@/lib/api/users";
import { isApiError } from "@/lib/api/errors";

const fieldClass = "w-full rounded-lg border border-smp-line-2 bg-smp-input px-3 py-2 text-sm text-smp-ink";
const message = (error: unknown) => isApiError(error) ? error.message : "No se pudo completar la operación.";
const NO_ACCESS = "";
const cloudRoleId = (value: FormDataEntryValue | null) => (value ? String(value) : null);

function CloudRoleSelect({ name, label, value, roles, locked }: { name: string; label: string; value: string | null | undefined; roles: ManagedRole[]; locked?: boolean }) {
  return <label className="block space-y-1 text-sm">{label}<select name={name} defaultValue={value ?? NO_ACCESS} disabled={locked} className={fieldClass}>
    <option value={NO_ACCESS}>Sin acceso</option>
    {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
  </select></label>;
}

function CloudBadge({ label, roleName }: { label: string; roleName: string | null }) {
  return <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs " + (roleName ? "bg-smp-accent/14 text-smp-accent-soft" : "bg-smp-ink-muted/14 text-smp-ink-dim")}>
    <span className="font-mono font-semibold">{label}</span>{roleName ?? "Sin acceso"}
  </span>;
}

function UserForm({ user, roles, ownId, onClose, onSaved }: {
  user: ManagedUser | null; roles: ManagedRole[]; ownId?: string;
  onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const ownAccount = user?.id === ownId;
  const cloudRoles = roles.filter(role => CLOUD_ROLE_CODES.includes(role.code));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(""); setPending(true);
    try {
      await saveUser(user?.id, {
        full_name: String(data.get("full_name")).trim(), email: String(data.get("email")).trim(),
        role_id: String(data.get("role_id")), is_active: ownAccount || data.get("is_active") === "on",
        // Disabled selects are left out of FormData: keep your own access as is.
        azure_role_id: ownAccount ? user!.azure_role_id : cloudRoleId(data.get("azure_role_id")),
        aws_role_id: ownAccount ? user!.aws_role_id : cloudRoleId(data.get("aws_role_id")),
      });
      toast.success(user ? "Usuario actualizado" : "Usuario creado. Se envió un correo para que defina su contraseña.");
      await onSaved(); onClose();
    } catch (failure) { setError(message(failure)); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent className="border-smp-line-2 bg-smp-surface text-smp-ink">
      <DialogHeader><DialogTitle>{user ? "Editar usuario" : "Crear usuario"}</DialogTitle>
        <DialogDescription>El rol de plataforma define qué puede hacer en la plataforma (usuarios, operaciones, auditoría). El acceso por nube define qué puede hacer con las máquinas virtuales de cada proveedor.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          <label className="block space-y-1 text-sm">Nombre completo<input name="full_name" required maxLength={150} defaultValue={user?.full_name} className={fieldClass} /></label>
          <label className="block space-y-1 text-sm">Correo<input name="email" type="email" required maxLength={255} autoComplete="off" defaultValue={user?.email} className={fieldClass} /></label>
          {!user && <p className="text-xs text-smp-ink-muted">Se enviará un correo a esta dirección con un enlace de un solo uso para que la persona defina su propia contraseña.</p>}
          <label className="block space-y-1 text-sm">Rol de plataforma<select name="role_id" required defaultValue={user?.role_id ?? ""} className={fieldClass}>
            <option value="" disabled>Selecciona un rol</option>
            {roles.map(role => <option key={role.id} value={role.id} disabled={ownAccount && !role.permissions.includes("user.manage")}>{role.name}</option>)}
          </select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <CloudRoleSelect name="azure_role_id" label="Acceso a Azure" value={user?.azure_role_id} roles={cloudRoles} locked={ownAccount} />
            <CloudRoleSelect name="aws_role_id" label="Acceso a AWS" value={user?.aws_role_id} roles={cloudRoles} locked={ownAccount} />
          </div>
          {ownAccount && <p className="text-xs text-smp-ink-muted">No puedes cambiar tu propio acceso a las nubes; pídeselo a otro administrador.</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={user?.is_active ?? true} disabled={ownAccount} />Cuenta activa</label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-smp-danger-text">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function UsersPage() {
  const current = useCurrentUser();
  const allowed = can(current.data?.permissions, "user.manage");
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<ManagedUser | null | undefined>();
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const users = useQuery({ queryKey: ["users", search, offset], queryFn: () => listUsers(search, offset), enabled: allowed });
  const roles = useQuery({ queryKey: ["roles"], queryFn: listRoles, enabled: allowed });
  const refresh = async () => { await Promise.all([cache.invalidateQueries({ queryKey: ["users"] }), cache.invalidateQueries({ queryKey: authKeys.me() })]); };
  const deletion = useMutation({ mutationFn: deactivateUser, onSuccess: async () => { setDeleting(null); toast.success("Usuario desactivado"); await refresh(); }, onError: error => toast.error(message(error)) });
  const invitation = useMutation({ mutationFn: resendInvitation, onSuccess: () => toast.success("Invitación reenviada"), onError: error => toast.error(message(error)) });

  if (current.isPending) return <p role="status">Cargando sesión…</p>;
  if (!allowed) return <p role="alert">No tienes permiso para administrar usuarios y roles.</p>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><UserCog />Usuarios y roles</h1><p className="mt-1 text-sm text-smp-ink-muted">Gestiona las cuentas, su rol en la plataforma y su acceso a cada nube.</p></div><Button onClick={() => setEditing(null)} disabled={!roles.data?.length}><Plus className="size-4" />Crear usuario</Button></header>
    <label className="block max-w-md space-y-1 text-sm">Buscar por nombre o correo<input type="search" maxLength={150} value={search} onChange={event => { setSearch(event.target.value); setOffset(0); }} className={fieldClass} /></label>
    {users.isPending ? <p role="status">Cargando usuarios…</p> : users.isError ? <div role="alert"><p>{message(users.error)}</p><Button onClick={() => void users.refetch()}>Reintentar</Button></div> : <>
      <div className="overflow-x-auto rounded-xl border border-smp-line-soft"><table className="w-full text-left text-sm"><caption className="sr-only">Usuarios de la plataforma</caption><thead className="bg-smp-surface-raised"><tr>{["Usuario", "Plataforma", "Nubes", "Estado", "Acciones"].map(title => <th key={title} scope="col" className="p-4">{title}</th>)}</tr></thead><tbody>
        {users.data.items.map(user => <tr key={user.id} className="border-t border-smp-line-soft"><td className="p-4"><p className="font-medium">{user.full_name}</p><p className="text-smp-ink-muted">{user.email}</p></td><td className="p-4">{user.role_name}</td><td className="p-4"><div className="flex flex-wrap gap-1.5"><CloudBadge label="AZ" roleName={user.azure_role_name} /><CloudBadge label="AWS" roleName={user.aws_role_name} /></div></td><td className="p-4">{user.is_active ? "Activo" : "Inactivo"}</td><td className="p-4"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditing(user)} disabled={!roles.data?.length}>Editar</Button><Button variant="outline" disabled={!user.is_active || invitation.isPending} onClick={() => invitation.mutate(user.id)}>Reenviar invitación</Button><Button variant="outline" disabled={!user.is_active || user.id === current.data?.id || deletion.isPending} onClick={() => setDeleting(user)}>Desactivar</Button></div></td></tr>)}
        {users.data.items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-smp-ink-muted">No se encontraron usuarios.</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between text-sm"><span>{users.data.total} usuarios</span><div className="flex items-center gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Anterior</Button><span>Página {Math.floor(offset / 25) + 1}</span><Button variant="outline" disabled={offset + 25 >= users.data.total} onClick={() => setOffset(offset + 25)}>Siguiente</Button></div></div>
    </>}
    <section className="space-y-3"><h2 className="text-lg font-semibold">Roles y permisos</h2>
      {roles.isPending && <p role="status">Cargando roles…</p>}
      {roles.isError && <div role="alert"><p>{message(roles.error)}</p><Button onClick={() => void roles.refetch()}>Reintentar</Button></div>}
      <div className="grid gap-3 md:grid-cols-3">{roles.data?.map(role => <article key={role.id} className="rounded-xl border border-smp-line-soft bg-smp-surface-raised p-4"><h3 className="font-semibold">{role.name}</h3><p className="my-2 text-sm text-smp-ink-muted">{role.description}</p><ul className="space-y-1 text-xs text-smp-ink-dim">{role.permissions.map(permission => <li key={permission}>{permission}</li>)}</ul></article>)}</div>
    </section>
    {editing !== undefined && roles.data && <UserForm user={editing} roles={roles.data} ownId={current.data?.id} onClose={() => setEditing(undefined)} onSaved={refresh} />}
    <ConfirmDialog open={!!deleting} title="Desactivar usuario" description={<>La cuenta de {deleting?.email} perderá el acceso. Su historial se conservará y podrás reactivarla desde Editar.</>} confirmLabel="Desactivar" isDestructive isLoading={deletion.isPending} onCancel={() => { if (!deletion.isPending) setDeleting(null); }} onConfirm={() => { if (deleting && !deletion.isPending) deletion.mutate(deleting.id); }} />
  </div>;
}
