import SubmitButton from '@/components/submit-button'
import { quickUpdateProcess } from '@/app/admin/tramites/actions'

type Profile = { id: string; full_name: string | null; role: string }

export default function ProcessQuickControl({
  processId,
  assignedTo,
  priority,
  operationalStatus,
  profiles,
  returnTo = '/admin',
}: {
  processId: string
  assignedTo: string | null
  priority: string
  operationalStatus: string | null
  profiles: Profile[]
  returnTo?: string
}) {
  return (
    <form action={quickUpdateProcess} className="quick-process-control">
      <input type="hidden" name="process_id" value={processId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <label>
        Responsable
        <select name="assigned_to" defaultValue={assignedTo ?? ''}>
          <option value="">Sin asignar</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name || 'Usuario'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prioridad
        <select name="priority" defaultValue={priority || 'Media'}>
          <option>Alta</option><option>Media</option><option>Baja</option>
        </select>
      </label>
      <label>
        Situación
        <select name="operational_status" defaultValue={operationalStatus || 'Automático'}>
          <option>Automático</option>
          <option>Atender hoy</option>
          <option>Esperando al cliente</option>
          <option>Esperando cita</option>
          <option>Esperando pago</option>
          <option>Seguimiento pendiente</option>
          <option>En orden</option>
        </select>
      </label>
      <SubmitButton className="mini-button" pendingText="Guardando…">Guardar</SubmitButton>
    </form>
  )
}
