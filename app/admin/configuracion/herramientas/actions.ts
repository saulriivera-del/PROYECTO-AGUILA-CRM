'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'

export async function resetOperationalData(form: FormData) {
  const context = await requireAuthContext()
  requireAdministrator(context)
  const confirmation = String(form.get('confirmation') ?? '').trim().toUpperCase()
  if (confirmation !== 'BORRAR DATOS DE PRUEBA') {
    redirect('/admin/configuracion/herramientas?error=' + encodeURIComponent('Escribe exactamente: BORRAR DATOS DE PRUEBA'))
  }

  const { data, error } = await context.supabase.rpc('reset_demo_operational_data')
  if (error) redirect('/admin/configuracion/herramientas?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin', 'layout')
  redirect('/admin/configuracion/herramientas?cleaned=1&result=' + encodeURIComponent(JSON.stringify(data ?? {})))
}
