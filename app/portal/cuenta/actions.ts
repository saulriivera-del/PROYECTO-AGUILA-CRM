'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function changePassword(formData: FormData) {
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')
  if (password.length < 8) redirect('/portal/cuenta?error=La contraseña debe tener al menos 8 caracteres')
  if (password !== confirm) redirect('/portal/cuenta?error=Las contraseñas no coinciden')
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/portal/cuenta?error=${encodeURIComponent(error.message)}`)
  redirect('/portal/cuenta?success=Contraseña actualizada correctamente')
}
