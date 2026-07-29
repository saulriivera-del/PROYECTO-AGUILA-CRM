import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTeamUser, resetTeamPassword, toggleTeamUser, updateTeamUser } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext()
  requireAdministrator(context)
  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .eq('organization_id', context.organizationId)
    .order('full_name')

  const notices: [string, string][] = [
    ['created', 'Usuario creado correctamente.'], ['updated', 'Usuario actualizado.'],
    ['activated', 'Usuario activado.'], ['deactivated', 'Usuario desactivado.'],
    ['password_reset', 'Contraseña temporal actualizada.'],
  ]

  return <>
    <header className="page-header"><div><span className="eyebrow">Configuración · Fase 5.3</span><h1>Usuarios y roles</h1><p>Crea cuentas del equipo sin entrar a la base de datos.</p></div></header>
    {notices.map(([key, message]) => params[key] ? <div className="notice success" key={key}>{message}</div> : null)}
    {params.error ? <div className="notice error">{String(params.error)}</div> : null}
    {error ? <div className="notice error">{error.message}</div> : null}

    <section className="insights-grid goals-config-grid">
      <form action={createTeamUser} className="panel-card insight-form">
        <div className="panel-heading"><div><span className="eyebrow">Nueva cuenta</span><h3>Agregar integrante</h3></div></div>
        <label>Nombre completo<input name="full_name" placeholder="Mariana Apellido" required /></label>
        <label>Correo<input name="email" type="email" placeholder="mariana@visamaster.com.mx" required /></label>
        <label>Contraseña temporal<input name="password" type="password" minLength={8} placeholder="Mínimo 8 caracteres" required /></label>
        <label>Rol<select name="role" defaultValue="recepcionista"><option value="recepcionista">Recepcionista</option><option value="administrador">Administrador</option></select></label>
        <button className="primary-button">Crear usuario</button>
        <p className="helper-text">La cuenta queda confirmada y lista para iniciar sesión. Comparte la contraseña por un canal privado.</p>
      </form>

      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Seguridad</span><h3>Alcance de roles</h3></div></div><div className="executive-summary"><p><strong>Recepcionista:</strong> operaciones, prospectos, personas, trámites, cobranza y agenda.</p><p><strong>Administrador:</strong> además puede entrar a Águila Insights, usuarios y herramientas administrativas.</p><p>La llave <code>service_role</code> se usa únicamente en el servidor.</p></div></article>
    </section>

    <section className="users-list">
      {(profiles ?? []).map((profile: any) => <article className="panel-card user-admin-card" key={profile.id}>
        <div className="panel-heading"><div><span className={`status-pill ${profile.is_active ? 'success' : 'muted'}`}>{profile.is_active ? 'Activo' : 'Desactivado'}</span><h3>{profile.full_name}</h3><p>{profile.role}</p></div></div>
        <form action={updateTeamUser} className="inline-admin-form">
          <input type="hidden" name="id" value={profile.id} />
          <label>Nombre<input name="full_name" defaultValue={profile.full_name ?? ''} required /></label>
          <label>Rol<select name="role" defaultValue={String(profile.role).toLowerCase()}><option value="recepcionista">Recepcionista</option><option value="administrador">Administrador</option></select></label>
          <button className="secondary-button">Guardar cambios</button>
        </form>
        <form action={resetTeamPassword} className="inline-admin-form">
          <input type="hidden" name="id" value={profile.id} />
          <label>Nueva contraseña temporal<input name="password" type="password" minLength={8} placeholder="Mínimo 8 caracteres" required /></label>
          <button className="secondary-button">Cambiar contraseña</button>
        </form>
        {profile.id !== context.userId ? <form action={toggleTeamUser}>
          <input type="hidden" name="id" value={profile.id} />
          <input type="hidden" name="next_active" value={profile.is_active ? 'false' : 'true'} />
          <button className={profile.is_active ? 'danger-button' : 'secondary-button'}>{profile.is_active ? 'Desactivar acceso' : 'Activar acceso'}</button>
        </form> : <p className="helper-text">Esta es tu cuenta actual; no puede desactivarse desde aquí.</p>}
      </article>)}
    </section>
  </>
}
