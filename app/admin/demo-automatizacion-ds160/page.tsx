import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanAnswers } from '@/lib/trade-in-motion'
import Ds160PilotDemo from '@/components/ds160-pilot-demo'

export const dynamic = 'force-dynamic'

export default async function Ds160AutomationPilotPage() {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role.trim().toLowerCase() !== 'reception') {
    redirect('/admin?error=Acceso%20restringido')
  }

  // Vista de solo lectura. Solo expedientes de la organización del operador.
  // No consulta columnas experimentales de aprobación ni intenta enviar datos a CEAC.
  const db = createAdminClient()
  const { data, count, error } = await db.from('vm_trade_in_motion_drafts')
    .select('id,answers,applicant_email,reviewed_at,submitted_at', { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .eq('status', 'Enviado')
    .order('submitted_at', { ascending: false })
    .limit(100)

  const received = (data ?? []).map(draft => {
    const answers = cleanAnswers(draft.answers)
    return {
      id: draft.id as string,
      name: answers.full_name || draft.applicant_email || 'Solicitante sin nombre',
      email: draft.applicant_email as string | null,
      state: draft.reviewed_at ? 'En revisión' : 'Recibido',
      submittedAt: draft.submitted_at as string | null,
    }
  })
  const date = (value: string | null) => value
    ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Hermosillo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Fecha no disponible'

  return (
    <>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 22px 8px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#1f65a0' }}>VISA MASTER · AUTOMATIZACIÓN DS-160</p>
        <h1 style={{ color: '#193b5b', margin: '8px 0' }}>Expedientes recibidos en Águila</h1>
        <p style={{ color: '#60758b', lineHeight: 1.6 }}>
          Los formularios ya enviados aparecen aquí automáticamente, sin importarlos de nuevo.
          Desde esta lista puedes abrir cada expediente para revisar sus respuestas.
          El autollenado oficial de CEAC sigue desactivado hasta validar las equivalencias.
        </p>
        {error ? (
          <p role="alert" style={{ color: '#a62439', background: '#fff0f2', padding: 14, borderRadius: 10 }}>
            No se pudieron consultar los formularios en este momento. Los expedientes siguen guardados en Águila.
          </p>
        ) : (
          <section style={{ background: '#fff', border: '1px solid #d9e4ee', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 19, color: '#193b5b', margin: 0 }}>Formularios recibidos</h2>
              <span style={{ color: '#315f89', fontWeight: 700 }}>{count ?? received.length} recibidos en total</span>
            </div>
            {received.length === 0 ? (
              <p style={{ color: '#60758b' }}>Todavía no hay formularios enviados para esta organización.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {received.map(item => (
                  <div key={item.id} style={{ padding: 14, border: '1px solid #e0e8f1', borderRadius: 11, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <div>
                      <strong style={{ color: '#193b5b' }}>{item.name}</strong>
                      {item.email && item.name !== item.email ? <div style={{ fontSize: 12, color: '#60758b', marginTop: 3 }}>{item.email}</div> : null}
                      <div style={{ fontSize: 12, color: '#60758b', marginTop: 4 }}>{item.state} · Enviado: {date(item.submittedAt)}</div>
                    </div>
                    <Link href={'/admin/formularios/trade-in-motion/' + item.id} style={{ color: '#1f65a0', fontWeight: 700 }}>Abrir expediente para revisar</Link>
                  </div>
                ))}
              </div>
            )}
            {received.length === 100 && (count ?? 0) > 100
              ? <p style={{ fontSize: 13, color: '#60758b' }}>Aquí aparecen los 100 más recientes. <Link href="/admin/formularios/trade-in-motion?status=recibidos">Ver el resto en Formularios recibidos</Link>.</p>
              : null}
          </section>
        )}
        <p style={{ fontSize: 13, color: '#60758b', marginTop: 14 }}>
          La revisión y aprobación real para la extensión continúan en desarrollo. Abajo puedes explorar el flujo simulado, sin modificar respuestas.
        </p>
      </section>
      <Ds160PilotDemo />
    </>
  )
}
