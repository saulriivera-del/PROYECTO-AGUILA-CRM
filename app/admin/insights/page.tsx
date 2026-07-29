import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData, bonusForRevenue } from '@/lib/insights'
import { money } from '@/lib/format'

export default async function InsightsPage() {
  const context = await requireAuthContext(); requireAdministrator(context)
  const data = await getInsightsData(context.supabase, context.organizationId)
  const monthVariation = data.previousMonthRevenue > 0 ? Math.round(((data.monthRevenue - data.previousMonthRevenue) / data.previousMonthRevenue) * 100) : null
  const mainGoal = data.goals.find((goal: any) => goal.metric === 'Ingresos' && goal.period === 'Mensual')
  const goalProgress = mainGoal ? Math.min(100, Math.round((data.monthRevenue / Number(mainGoal.target_value)) * 100)) : 0

  return <>
    <header className="insights-hero">
      <div><span className="eyebrow">Águila Insights · Fase 5.2.1</span><h1>Buenos días, {context.fullName.split(' ')[0]}.</h1><p>Una fotografía ejecutiva de Visa Master basada exclusivamente en movimientos registrados.</p></div>
      <div className="header-actions"><Link className="secondary-button" href="/admin/insights/metas">Configurar metas</Link><Link className="primary-button" href="/admin/insights/bonos">Bonos del equipo</Link></div>
    </header>
    {data.errors.length ? <div className="notice error">Ejecuta primero la migración de Fase 5.2.1. {data.errors[0]}</div> : null}

    <section className="executive-kpis">
      <article><span>Ingresos hoy</span><strong>{money(data.todayRevenue)}</strong><small>Dinero cobrado</small></article>
      <article><span>Ingresos semana</span><strong>{money(data.weekRevenue)}</strong><small>Desde el lunes</small></article>
      <article><span>Ingresos mes</span><strong>{money(data.monthRevenue)}</strong><small>{monthVariation === null ? 'Sin comparativo previo' : `${monthVariation >= 0 ? '+' : ''}${monthVariation}% vs. mes anterior`}</small></article>
      <article><span>Ingresos año</span><strong>{money(data.yearRevenue)}</strong><small>Acumulado cobrado</small></article>
    </section>

    <section className="insights-grid">
      <article className="panel-card insight-feature-card">
        <div className="panel-heading"><div><span className="eyebrow">Director ejecutivo</span><h3>Resumen del negocio</h3></div></div>
        <div className="executive-summary">
          <p><strong>{data.activeProcesses}</strong> trámites activos y <strong>{data.finishedProcesses}</strong> concluidos.</p>
          <p><strong>{data.stalledProcesses}</strong> requieren atención por llevar al menos cinco días sin movimiento.</p>
          <p>Este mes entraron <strong>{data.monthProspects}</strong> prospectos y se crearon <strong>{data.monthClients}</strong> clientes.</p>
          <p>La conversión estimada del mes es de <strong>{data.conversion}%</strong> y el ticket promedio de <strong>{money(data.ticketAverage)}</strong>.</p>
        </div>
      </article>
      <article className="panel-card goal-spotlight">
        <div className="panel-heading"><div><span className="eyebrow">Meta principal</span><h3>{mainGoal?.name ?? 'Ingreso mensual'}</h3></div><strong>{goalProgress}%</strong></div>
        {mainGoal ? <><div className="progress-track"><span style={{width: `${goalProgress}%`}} /></div><div className="goal-numbers"><span>{money(data.monthRevenue)} cobrados</span><strong>{money(Number(mainGoal.target_value))}</strong></div></> : <div className="empty-state">Configura tu primera meta mensual.</div>}
      </article>
    </section>

    <section className="insights-grid">
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Servicios</span><h3>Ingresos del mes</h3></div></div><div className="ranking-list">{data.serviceRevenue.slice(0, 6).map(([service, amount], index) => <div key={service}><span>{index + 1}. {service}</span><strong>{money(amount)}</strong></div>)}{!data.serviceRevenue.length ? <div className="empty-state">Sin pagos este mes.</div> : null}</div></article>
      <article className="panel-card"><div className="panel-heading"><div><span className="eyebrow">Equipo</span><h3>Bonos semanales estimados</h3></div></div><div className="bonus-preview-list">{data.bonusRules.map((rule: any) => { const profile = Array.isArray(rule.profiles) ? rule.profiles[0] : rule.profiles; const estimated = bonusForRevenue(data.weekRevenue, Number(rule.threshold_amount), Number(rule.base_bonus), Number(rule.step_amount), Number(rule.step_bonus)); return <div key={rule.id}><span><strong>{profile?.full_name ?? 'Usuario'}</strong><small>{money(data.weekRevenue)} / {money(Number(rule.threshold_amount))}</small></span><strong>{money(estimated)}</strong></div>})}{!data.bonusRules.length ? <div className="empty-state">No hay reglas de bono configuradas.</div> : null}</div></article>
    </section>

    <section className="insight-navigation">
      <Link href="/admin/insights/finanzas"><span>💰</span><strong>Centro Financiero</strong><small>Ingresos y servicios</small></Link>
      <Link href="/admin/insights/metas"><span>🎯</span><strong>Metas</strong><small>Objetivos editables</small></Link>
      <Link href="/admin/insights/bonos"><span>🏆</span><strong>Bonos</strong><small>Reglas por usuario</small></Link>
    </section>
  </>
}
