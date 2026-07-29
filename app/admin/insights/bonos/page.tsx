import Link from 'next/link'
import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { getInsightsData, bonusForRevenue } from '@/lib/insights'
import { money } from '@/lib/format'
import { closeCurrentBonusWeek, markBonusPaid, saveBonusRule } from '../actions'

type SearchParams = Promise<Record<string,string|string[]|undefined>>

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function BonusesPage({searchParams}:{searchParams:SearchParams}) {
  const params = await searchParams
  const context = await requireAuthContext(); requireAdministrator(context)
  const data = await getInsightsData(context.supabase, context.organizationId)
  const weekEnd = new Date(data.weekStart); weekEnd.setDate(weekEnd.getDate() + 6)

  return <>
    <header className="insights-hero compact">
      <div><span className="eyebrow">Águila Insights · Fase 5.2 Final</span><h1>Bonos del equipo</h1><p>Cálculo, cierre e historial basados únicamente en dinero efectivamente cobrado.</p></div>
      <div className="header-actions"><Link className="secondary-button" href="/admin/insights">Volver a Insights</Link></div>
    </header>
    {params.saved ? <div className="notice success">Regla de bono guardada.</div> : null}
    {params.closed ? <div className="notice success">Semana cerrada y guardada en el historial.</div> : null}
    {params.already_closed ? <div className="notice error">Esta semana ya fue cerrada. El historial quedó protegido contra duplicados.</div> : null}
    {params.already_paid ? <div className="notice success">Este bono ya estaba marcado como pagado.</div> : null}
    {params.paid ? <div className="notice success">Bono marcado como pagado.</div> : null}
    {params.error ? <div className="notice error">{String(params.error)}</div> : null}
    {data.errors.length ? <div className="notice error">No fue posible consultar todos los datos. {data.errors[0]}</div> : null}

    <section className="executive-kpis">
      <article><span>Ingreso semanal</span><strong>{money(data.weekRevenue)}</strong><small>Desde el lunes</small></article>
      <article><span>Reglas activas</span><strong>{data.bonusRules.length}</strong><small>Bonos configurados</small></article>
      <article><span>Bonos estimados</span><strong>{money(data.bonusRules.reduce((sum:number,r:any)=>sum+bonusForRevenue(data.weekRevenue,Number(r.threshold_amount),Number(r.base_bonus),Number(r.step_amount),Number(r.step_bonus)),0))}</strong><small>Semana actual</small></article>
      <article><span>Pendientes de pago</span><strong>{money(data.bonusHistory.filter((h:any)=>h.status!=='Pagado').reduce((sum:number,h:any)=>sum+Number(h.calculated_bonus||0),0))}</strong><small>Historial abierto</small></article>
    </section>

    <section className="bonus-dashboard-grid">
      <div className="bonus-current-column">
        {data.bonusRules.map((rule:any) => {
          const profile = Array.isArray(rule.user_profile) ? rule.user_profile[0] : rule.user_profile
          const threshold = Number(rule.threshold_amount)
          const bonus = bonusForRevenue(data.weekRevenue, threshold, Number(rule.base_bonus), Number(rule.step_amount), Number(rule.step_bonus))
          const progress = Math.min(100, Math.round(data.weekRevenue / threshold * 100))
          const remaining = Math.max(0, threshold - data.weekRevenue)
          const extra = Math.max(0, data.weekRevenue - threshold)
          const completedSteps = Math.floor(extra / Number(rule.step_amount))
          const nextStepRemaining = data.weekRevenue < threshold ? remaining : Number(rule.step_amount) - (extra % Number(rule.step_amount) || Number(rule.step_amount))
          const alreadyClosed = data.bonusHistory.some((item:any) => item.bonus_rule_id === rule.id && item.period_start === isoDate(data.weekStart))
          return <article className="panel-card bonus-employee-card" key={rule.id}>
            <div className="panel-heading"><div><span className="eyebrow">Semana actual</span><h3>{profile?.full_name ?? 'Usuario'}</h3><p>{rule.name}</p></div><strong>{money(bonus)}</strong></div>
            <div className="bonus-big-progress"><div className="progress-track"><span style={{width:`${progress}%`}} /></div><div className="goal-numbers"><span>{money(data.weekRevenue)} cobrados</span><strong>{money(threshold)}</strong></div></div>
            <div className="bonus-detail-grid">
              <div><span>Bono base</span><strong>{money(Number(rule.base_bonus))}</strong></div>
              <div><span>Incrementos ganados</span><strong>{completedSteps}</strong></div>
              <div><span>Valor por incremento</span><strong>{money(Number(rule.step_bonus))}</strong></div>
              <div><span>Siguiente avance</span><strong>{data.weekRevenue < threshold ? `${money(remaining)} para activar` : `${money(nextStepRemaining)} para +${money(Number(rule.step_bonus))}`}</strong></div>
            </div>
            <form action={closeCurrentBonusWeek} className="bonus-close-form">
              <input type="hidden" name="rule_id" value={rule.id}/><input type="hidden" name="user_id" value={rule.user_id}/><input type="hidden" name="period_start" value={isoDate(data.weekStart)}/><input type="hidden" name="period_end" value={isoDate(weekEnd)}/><input type="hidden" name="collected_revenue" value={data.weekRevenue}/><input type="hidden" name="calculated_bonus" value={bonus}/>
              <button className="primary-button" disabled={alreadyClosed}>{alreadyClosed ? 'Semana ya cerrada' : 'Cerrar semana y guardar'}</button>
            </form>
          </article>
        })}
        {!data.bonusRules.length ? <article className="panel-card empty-state">Configura la regla semanal de Mariana para comenzar.</article> : null}
      </div>

      <form action={saveBonusRule} className="panel-card insight-form bonus-rule-form">
        <div className="panel-heading"><div><span className="eyebrow">Configuración</span><h3>Nueva regla semanal</h3></div></div>
        <label>Usuario<select name="user_id" required><option value="">Seleccionar</option>{data.profiles.map((p:any)=><option value={p.id} key={p.id}>{p.full_name}</option>)}</select></label>
        <label>Nombre<input name="name" defaultValue="Bono semanal por ingresos cobrados"/></label>
        <div className="form-grid"><label>Meta para activar<input name="threshold_amount" type="number" defaultValue="17000" min="1"/></label><label>Bono base<input name="base_bonus" type="number" defaultValue="1000" min="0"/></label><label>Cada cuánto adicional<input name="step_amount" type="number" defaultValue="1000" min="1"/></label><label>Bono por bloque<input name="step_bonus" type="number" defaultValue="100" min="0"/></label></div>
        <div className="readonly-rule">Fuente: <strong>Dinero cobrado</strong> · Periodo: <strong>Semanal</strong></div>
        <button className="primary-button">Guardar regla</button>
      </form>
    </section>

    <section className="panel-card bonus-history-card">
      <div className="panel-heading"><div><span className="eyebrow">Control administrativo</span><h3>Historial semanal</h3></div><strong>{data.bonusHistory.length}</strong></div>
      <div className="bonus-history-table">
        <div className="bonus-history-head"><span>Usuario</span><span>Semana</span><span>Ingreso cobrado</span><span>Bono</span><span>Estado</span><span>Acción</span></div>
        {data.bonusHistory.map((item:any)=>{const profile=Array.isArray(item.user_profile)?item.user_profile[0]:item.user_profile; return <div className="bonus-history-row" key={item.id}><span><strong>{profile?.full_name ?? 'Usuario'}</strong></span><span>{new Date(item.period_start+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}–{new Date(item.period_end+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</span><span>{money(Number(item.collected_revenue))}</span><span><strong>{money(Number(item.calculated_bonus))}</strong></span><span><span className={`bonus-status ${item.status==='Pagado'?'paid':'pending'}`}>{item.status}</span></span><span>{item.status==='Pagado'?<small>Pagado</small>:<form action={markBonusPaid}><input type="hidden" name="id" value={item.id}/><button className="secondary-button compact-button">Marcar pagado</button></form>}</span></div>})}
        {!data.bonusHistory.length?<div className="empty-state">Al cerrar una semana aparecerá aquí su ingreso, bono y estado de pago.</div>:null}
      </div>
    </section>
  </>
}
