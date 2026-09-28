import { CheckCircle2, Clock3, Search, AlertCircle, FileCheck2 } from 'lucide-react'

export function StatusPill({ status, label }: { status?: string | null; label?: string | null }) {
  const code = status || ''
  let tone = 'blue'
  let Icon = Clock3
  if (['APPROVED','ISSUED','COMPLETED','CONSULAR_APPOINTMENT_SCHEDULED','CAS_SCHEDULED','APPOINTMENT_FOUND'].includes(code)) {
    tone = 'green'; Icon = CheckCircle2
  } else if (['DOCUMENTS_PENDING','CONSULAR_PAYMENT_PENDING','ADMINISTRATIVE_PROCESSING'].includes(code)) {
    tone = 'amber'; Icon = AlertCircle
  } else if (['DS160_COMPLETE','DOCUMENTS_COMPLETE'].includes(code)) {
    tone = 'slate'; Icon = FileCheck2
  } else if (code === 'SEARCHING_APPOINTMENT') {
    tone = 'blue'; Icon = Search
  }
  return <span className={`status-pill status-${tone}`}><Icon size={16} />{label || 'En proceso'}</span>
}
