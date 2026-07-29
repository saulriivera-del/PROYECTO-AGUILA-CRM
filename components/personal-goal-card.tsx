import Link from 'next/link'
import { money } from '@/lib/format'
import type { PersonalGoalData } from '@/lib/personal-goal'

export default function PersonalGoalCard({ data, compact = false }: { data: PersonalGoalData; compact?: boolean }) {
  if (!data.hasRule) {
    return (
      <section className="personal-goal-card personal-goal-empty">
        <div><span className="eyebrow">Meta semanal Visa Master</span><h2>Meta pendiente de configurar</h2><p>{data.message}</p></div>
      </section>
    )
  }

  const visualProgress = Math.min(100, Math.max(0, data.progress))

  return (
    <section className={`personal-goal-card ${data.progress >= 100 ? 'goal-complete' : ''} ${compact ? 'compact' : ''}`}>
      <div className="personal-goal-heading">
        <div>
          <span className="eyebrow">Meta semanal Visa Master</span>
          <h2>{data.progress >= 100 ? '🎉 ¡Meta alcanzada!' : data.ruleName}</h2>
          <p>{data.message}</p>
        </div>
        {compact ? <Link className="secondary-button" href="/admin/mi-meta">Ver desempeño</Link> : <strong className="personal-goal-percent">{data.progress}%</strong>}
      </div>

      <div className="personal-progress-track" aria-label={`Avance ${data.progress}%`}>
        <span style={{ width: `${visualProgress}%` }} />
      </div>

      <div className="personal-goal-kpis">
        <div><span>Cobrado</span><strong>{money(data.collected)}</strong></div>
        <div><span>Meta</span><strong>{money(data.threshold)}</strong></div>
        <div><span>{data.progress >= 100 ? 'Bono actual' : 'Faltan'}</span><strong>{data.progress >= 100 ? money(data.bonus) : money(data.remaining)}</strong></div>
        <div><span>Días restantes</span><strong>{data.daysRemaining}</strong></div>
      </div>

      {!compact ? (
        <>
          <div className="personal-score-grid">
            <article><span>Ticket promedio del equipo</span><strong>{money(data.ticketAverage)}</strong><small>Por trámite con pago esta semana</small></article>
            <article><span>Cobros del equipo</span><strong>{data.paymentCount}</strong><small>Registrados por cualquier miembro</small></article>
            <article><span>Clientes asignados</span><strong>{data.clientsThisWeek}</strong><small>Nuevos esta semana</small></article>
            <article><span>Trámites iniciados</span><strong>{data.processesThisWeek}</strong><small>Asignados a ti esta semana</small></article>
          </div>
          {data.nextTarget !== null && data.nextBonus !== null ? (
            <div className="next-goal-callout"><span>Siguiente objetivo</span><strong>{money(data.nextTarget)}</strong><small>Bono estimado al alcanzarlo: {money(data.nextBonus)}</small></div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
