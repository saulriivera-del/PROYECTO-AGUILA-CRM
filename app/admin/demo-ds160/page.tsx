import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import DemoWizard, { type CandidateForDemo } from './DemoWizard'

export default async function Ds160DemoPage() {
  const context = await requireAuthContext()
  requireAdministrator(context)

  // Read-only lookup of existing Trade in Motion processes. Nothing is created
  // or updated in CRM merely by opening this preview.
  const candidates: CandidateForDemo[] = []
  const { data: company } = await context.supabase
    .from('companies')
    .select('id')
    .eq('name', 'Trade in Motion')
    .maybeSingle()

  if (company) {
    const { data: links } = await context.supabase
      .from('process_company_links')
      .select('process_id')
      .eq('company_id', company.id)

    const processIds = (links ?? []).map((link) => link.process_id)
    if (processIds.length > 0) {
      const { data: processes } = await context.supabase
        .from('processes')
        .select('id, client_id, service_name')
        .eq('organization_id', context.organizationId)
        .in('id', processIds)

      const clientIds = [...new Set((processes ?? []).map((process) => process.client_id))]
      if (clientIds.length > 0) {
        const { data: clients } = await context.supabase
          .from('clients')
          .select('id, full_name, birth_date, phone, email')
          .eq('organization_id', context.organizationId)
          .in('id', clientIds)

        const clientById = new Map((clients ?? []).map((client) => [client.id, client]))
        for (const process of processes ?? []) {
          const client = clientById.get(process.client_id)
          if (!client) continue
          candidates.push({
            processId: process.id,
            clientId: client.id,
            serviceName: process.service_name,
            fullName: client.full_name,
            birthDate: client.birth_date,
            phone: client.phone,
            email: client.email,
          })
        }
      }
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Automatización · Prototipo interno</span>
          <h1>Formulario Visa Master · DS-160 / TN</h1>
          <p>Vista previa para validar preguntas y mostrar precarga desde el CRM.</p>
        </div>
      </header>
      <DemoWizard candidates={candidates} />
    </>
  )
}
