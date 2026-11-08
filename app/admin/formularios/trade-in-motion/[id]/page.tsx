import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const labels: Record<string, string> = {
  full_name: 'Nombre completo',
  birth_date: 'Fecha de nacimiento',
  birth_city: 'Ciudad de nacimiento',
  birth_state: 'Estado de nacimiento',
  birth_country: 'País de nacimiento',
  nationality: 'Nacionalidad',
  marital_status: 'Estado civil',
  email: 'Correo electrónico',
  phone: 'Teléfono celular',
  employer_phone: 'Teléfono del trabajo',
  passport_number: 'Número de pasaporte',
  passport_issued: 'Pasaporte expedido',
  passport_expires: 'Pasaporte vence',
  tn_employer: 'Empresa contratante en EE. UU.',
  tn_position: 'Puesto ofrecido',
  tn_profession: 'Categoría TN',
  tn_duties: 'Actividades propuestas',
  tn_salary: 'Sueldo ofrecido (USD)',
}

function readableName(key: string) {
  return labels[key] || key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function readableValue(value: unknown) {
  if (value == null || value === '') return 'Sin respuesta'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value, null, 2)
}

export default async function ReviewIntake({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await requireAuthContext()
  requireAdministrator(context)
  const { data, error } = await createAdminClient()
    .from('vm_form_submissions')
    .select('id, organization_id, applicant_name, applicant_email, status, received_at, process_id, answers')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .maybeSingle()

  if (error || !data) notFound()

  const answers = data.answers && typeof data.answers === 'object' && !Array.isArray(data.answers)
    ? Object.entries(data.answers as Record<string, unknown>)
    : []

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <p><Link href="/admin/formularios/trade-in-motion">← Volver a la bandeja</Link></p>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#516783' }}>TRADE IN MOTION · REVISIÓN PRIVADA</span>
      <h1>{data.applicant_name}</h1>
      <p>{data.applicant_email} · {data.status}</p>
      {data.process_id ? <p><Link href={`/admin/tramites/${data.process_id}`}>Abrir expediente CRM →</Link></p> : null}
      <p style={{ fontSize: 13 }}>La información siguiente es confidencial. Comprueba sus datos antes de preparar el DS-160 oficial.</p>
      <dl style={{ display: 'grid', gap: 10 }}>
        {answers.map(([key, value]) => (
          <div key={key} style={{ padding: 14, border: '1px solid #d9e2ec', borderRadius: 10, background: '#fff' }}>
            <dt style={{ fontSize: 13, fontWeight: 700, color: '#243e60' }}>{readableName(key)}</dt>
            <dd style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{readableValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}