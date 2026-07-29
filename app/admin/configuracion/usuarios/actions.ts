'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const allowedRoles = new Set(['admin', 'reception'])

async function audit(
  context: Awaited<ReturnType<typeof requireAuthContext>>,
  action: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await context.supabase.from('insight_audit_log').insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    action,
    entity_type: 'profile',
    entity_id: entityId,
    details,
  })
}

export async function createTeamUser(form: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const fullName = text(form, 'full_name')
  const email = text(form, 'email').toLowerCase()
  const password = text(form, 'password')
  const role = text(form, 'role').toLowerCase()

  if (!fullName || !email || password.length < 8 || !allowedRoles.has(role)) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('Revisa nombre, correo, rol y contraseña de mínimo 8 caracteres.'))
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role, organization_id: context.organizationId },
  })

  if (error || !data.user) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent(error?.message ?? 'No fue posible crear el usuario.'))
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    organization_id: context.organizationId,
    full_name: fullName,
    role,
    is_active: true,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id)
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent(profileError.message))
  }

  await audit(context, 'user.created', data.user.id, { full_name: fullName, email, role })
  revalidatePath('/admin/configuracion/usuarios')
  redirect('/admin/configuracion/usuarios?created=1')
}

export async function updateTeamUser(form: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)

  const id = text(form, 'id')
  const fullName = text(form, 'full_name')
  const role = text(form, 'role').toLowerCase()
  if (!id || !fullName || !allowedRoles.has(role)) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('Datos de usuario no válidos.'))
  }
  if (id === context.userId && role !== 'admin') {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('No puedes quitarte tu propio acceso de administrador.'))
  }

  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('organization_id').eq('id', id).single()
  if (target?.organization_id !== context.organizationId) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('Usuario fuera de tu organización.'))
  }

  const { error } = await admin.from('profiles').update({ full_name: fullName, role }).eq('id', id).eq('organization_id', context.organizationId)
  if (error) redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent(error.message))

  await admin.auth.admin.updateUserById(id, {
    user_metadata: { full_name: fullName },
    app_metadata: { role, organization_id: context.organizationId },
  })
  await audit(context, 'user.updated', id, { full_name: fullName, role })
  revalidatePath('/admin/configuracion/usuarios')
  redirect('/admin/configuracion/usuarios?updated=1')
}

export async function toggleTeamUser(form: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)
  const id = text(form, 'id')
  const nextActive = text(form, 'next_active') === 'true'
  if (!id || id === context.userId) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('No puedes desactivar tu propia cuenta.'))
  }

  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('organization_id').eq('id', id).single()
  if (target?.organization_id !== context.organizationId) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('Usuario fuera de tu organización.'))
  }

  const { error } = await admin.from('profiles').update({ is_active: nextActive }).eq('id', id).eq('organization_id', context.organizationId)
  if (error) redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent(error.message))

  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: nextActive ? 'none' : '876000h',
  })
  if (authError) redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent(authError.message))

  await audit(context, nextActive ? 'user.activated' : 'user.deactivated', id)
  revalidatePath('/admin/configuracion/usuarios')
  redirect(`/admin/configuracion/usuarios?${nextActive ? 'activated' : 'deactivated'}=1`)
}

export async function resetTeamPassword(form: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)
  const id = text(form, 'id')
  const password = text(form, 'password')
  if (!id || password.length < 8) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('La contraseña temporal debe tener mínimo 8 caracteres.'))
  }

  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('organization_id').eq('id', id).single()
  if (target?.organization_id !== context.organizationId) {
    redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent('Usuario fuera de tu organización.'))
  }
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) redirect('/admin/configuracion/usuarios?error=' + encodeURIComponent(error.message))

  await audit(context, 'user.password_reset', id)
  redirect('/admin/configuracion/usuarios?password_reset=1')
}
