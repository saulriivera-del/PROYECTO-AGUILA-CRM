'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthContext } from '@/lib/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const allowed = new Set(['MATCHED','NOTIFIED','REVIEWING','USED','EXPIRED','DISMISSED'])

export async function updateOpportunityStatus(formData: FormData) {
  await requireAuthContext()
  const clientId = Number(formData.get('client_id'))
  const consulate = String(formData.get('consulate') ?? '')
  const availableDate = String(formData.get('available_date') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!Number.isFinite(clientId) || !consulate || !availableDate || !allowed.has(status)) throw new Error('Datos de oportunidad inválidos')

  const supabase = createAdminClient()
  const { error } = await supabase.rpc('vm_update_opportunity_status', {
    p_client_id: clientId,
    p_consulate: consulate,
    p_available_date: availableDate,
    p_new_status: status,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/oportunidades')
}
