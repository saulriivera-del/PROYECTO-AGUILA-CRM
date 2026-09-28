import Link from 'next/link'
import { CalendarDays, Flag, MoreVertical } from 'lucide-react'
import type { PortalProcess } from '@/lib/types'
import { StatusPill } from './StatusPill'
import { formatDate, initials } from '@/lib/format'

export function CaseCard({ item }: { item: PortalProcess }) {
  return (
    <article className="case-card">
      <div className="case-person">
        <div className="case-avatar">{initials(item.client_name)}</div>
        <div>
          <h3>{item.client_name}</h3>
          <div className="case-service">{item.service_name}<span>Activo</span></div>
          <div className="case-ref">{item.external_reference || 'Trámite empresarial'}</div>
          <small>Actualizado {formatDate(item.portal_last_updated_at)}</small>
        </div>
      </div>

      <div className="case-status">
        <span className="eyebrow">Estado actual</span>
        <StatusPill status={item.public_status} label={item.public_status_label}/>
        <p>{item.public_note || 'Seguimiento activo por Visa Master.'}</p>
        <div className="next-step"><Flag size={17}/><div><strong>Próximo paso</strong><span>{item.public_next_step || 'Continuar seguimiento del trámite.'}</span></div></div>
        {item.requires_client_action && <div className="action-alert"><strong>Acción requerida:</strong> {item.client_action_note || 'Favor de contactar a Visa Master.'}</div>}
      </div>

      <div className="case-dates">
        <MoreVertical className="more" size={20}/>
        <div className="date-row"><CalendarDays size={17}/><span>CAS</span><strong>{formatDate(item.cas_appointment_at)}</strong></div>
        <div className="date-row"><span/> <span>Consulado</span><strong>{formatDate(item.consulate_appointment_at)}</strong></div>
        <div className="date-row"><span/> <span>Resultado</span><strong>{item.result_status || 'Sin resultado'}</strong></div>
        <Link className="primary-button" href={`/portal/tramites/${item.process_id}`}>Ver trámite →</Link>
      </div>
    </article>
  )
}
