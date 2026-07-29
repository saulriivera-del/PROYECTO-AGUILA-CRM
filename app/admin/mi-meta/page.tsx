import { requireAuthContext } from '@/lib/auth-context'
import { getPersonalGoalData } from '@/lib/personal-goal'
import PersonalGoalCard from '@/components/personal-goal-card'

export default async function MyGoalPage() {
  const context = await requireAuthContext()
  const data = await getPersonalGoalData(context.supabase, context.organizationId, context.userId)

  return (
    <>
      <header className="daily-control-header">
        <div>
          <span className="eyebrow">Fase 5.4 · Centro de Desempeño</span>
          <h1>Centro de Desempeño</h1>
          <p className="daily-date">Tu bono se calcula con todo el dinero efectivamente cobrado por Visa Master durante la semana actual, sin importar qué miembro registró el pago.</p>
        </div>
      </header>
      <PersonalGoalCard data={data} />
    </>
  )
}
