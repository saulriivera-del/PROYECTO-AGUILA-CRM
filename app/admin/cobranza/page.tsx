import { requireAuthContext } from '@/lib/auth-context'
import { dateTime, money } from '@/lib/format'
import { getFinancialSummary } from '@/lib/financial-summary'
import PaymentForm from '@/components/payment-form'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function CobranzaPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const context = await requireAuthContext()
  const financial = await getFinancialSummary(
    context.supabase,
    context.organizationId,
  )

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Control financiero</span>
          <h1>Cobranza</h1>
          <p>Pagos, saldos y compromisos en tiempo real.</p>
        </div>
      </header>

      {params.created ? (
        <div className="notice success">Pago registrado correctamente.</div>
      ) : null}
      {params.error ? (
        <div className="notice error">{String(params.error)}</div>
      ) : null}
      {financial.error ? (
        <div className="notice error">
          No fue posible calcular la cobranza: {financial.error}
        </div>
      ) : null}

      <section className="client-kpis">
        <article>
          <span>Total acordado</span>
          <strong>{money(financial.totalAgreed)}</strong>
        </article>
        <article>
          <span>Cobrado</span>
          <strong>{money(financial.totalPaid)}</strong>
        </article>
        <article>
          <span>Por cobrar</span>
          <strong>{money(financial.totalBalance)}</strong>
        </article>
        <article>
          <span>Vencido</span>
          <strong>{money(financial.overdueBalance)}</strong>
        </article>
      </section>

      <section className="collections-layout">
        <PaymentForm
          processes={financial.rows
            .filter((row) => row.balance > 0)
            .map((row) => {
              const client = Array.isArray(row.clients)
                ? row.clients[0]
                : row.clients

              return {
                id: row.id,
                service_name: row.service_name,
                client_name: client?.full_name || 'Cliente',
                balance: row.balance,
              }
            })}
        />

        <section className="table-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Cuentas</span>
              <h3>Estado de cobranza</h3>
            </div>
            <strong>{financial.rows.length}</strong>
          </div>

          <div className="collection-cards">
            {financial.rows.map((row) => {
              const client = Array.isArray(row.clients)
                ? row.clients[0]
                : row.clients

              return (
                <article
                  className={
                    row.overdue
                      ? 'collection-card overdue'
                      : 'collection-card'
                  }
                  key={row.id}
                >
                  <div className="collection-card-head">
                    <div>
                      <strong>{client?.full_name || 'Cliente'}</strong>
                      <small>
                        {row.service_name} · {client?.phone || ''}
                      </small>
                    </div>
                    <span
                      className={
                        row.balance <= 0
                          ? 'payment-status paid'
                          : row.paid > 0
                            ? 'payment-status partial'
                            : 'payment-status pending'
                      }
                    >
                      {row.balance <= 0
                        ? 'Pagado'
                        : row.paid > 0
                          ? 'Parcial'
                          : 'Pendiente'}
                    </span>
                  </div>

                  <div className="collection-amounts">
                    <div>
                      <span>Total</span>
                      <strong>{money(row.agreed)}</strong>
                    </div>
                    <div>
                      <span>Pagado</span>
                      <strong>{money(row.paid)}</strong>
                    </div>
                    <div>
                      <span>Saldo</span>
                      <strong>{money(row.balance)}</strong>
                    </div>
                  </div>

                  <small>
                    Compromiso: {row.commitment || 'Sin fecha'}
                    {row.overdue ? ' · VENCIDO' : ''}
                  </small>
                </article>
              )
            })}

            {!financial.rows.length ? (
              <div className="empty-state">Sin cuentas registradas.</div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="panel-card payment-history">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Historial</span>
            <h3>Últimos pagos</h3>
          </div>
        </div>

        <div className="activity-list">
          {financial.payments.slice(0, 30).map((payment) => (
            <div key={payment.id}>
              <strong>
                {money(payment.amount)} · {payment.payment_method}
              </strong>
              <small>
                {dateTime(payment.payment_date)}
                {payment.reference ? ` · ${payment.reference}` : ''}
              </small>
            </div>
          ))}

          {!financial.payments.length ? (
            <div className="empty-state">Sin pagos registrados.</div>
          ) : null}
        </div>
      </section>
    </>
  )
}
