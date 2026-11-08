import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function TradeInMotionIntakePage() {
  const context = await requireAuthContext()
  requireAdministrator(context)
  const { data: submissions, error } = await createAdminClient()
    .from('vm_form_submissions')
    .select('id, applicant_name, applicant_email, status, received_at, process_id')
    .eq('organization_id', context.organizationId)
    .order('received_at', { ascending: false })
    .limit(100)

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', padding: 24 }}>
      <span style={{ color: '#516783', fontSize: 12, fontWeight: 700 }}>VISA MASTER · FORMULARIOS</span>
      <h1>Recepciones de Trade in Motion</h1>
      <p>Cuestionarios recibidos para revisión. Solo personal administrador de Visa Master puede consultar las respuestas.</p>
      {error ? (
        <p role="alert">No se pudo consultar la bandeja. Verifica que la migración y el acceso del servidor estén configurados.</p>
      ) : !submissions?.length ? (
        <p>No hay formularios recibidos todavía. El cuestionario público sigue siendo demostrativo hasta que se habilite el envío verificado.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {submissions.map((item) => (
            <div key={item.id} style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 18, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <strong>{item.applicant_name}</strong>
                <span>{item.status}</span>
              </div>
              <p style={{ margin: '8px 0' }}>{item.applicant_email} · {new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Hermosillo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.received_at))}</p>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <Link href={`/admin/formularios/trade-in-motion/${item.id}`}>Revisar respuestas →</Link>
                {item.process_id ? <Link href={`/admin/tramites/${item.process_id}`}>Abrir expediente CRM →</Link> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}