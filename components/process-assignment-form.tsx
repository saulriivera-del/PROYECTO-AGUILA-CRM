import SubmitButton from '@/components/submit-button'
import { updateProcessAssignment } from '@/app/admin/tramites/actions'
import { hermosilloLocalInputValue } from '@/lib/hermosillo'

type Profile = {
  id: string
  full_name: string | null
  role: string
}

export default function ProcessAssignmentForm({
  processId,
  assignedTo,
  priority,
  priorityAttentionAt,
  operationalStatus,
  profiles,
}: {
  processId: string
  assignedTo: string | null
  priority: string
  priorityAttentionAt: string | null
  operationalStatus?: string | null
  profiles: Profile[]
}) {
  const localValue = hermosilloLocalInputValue(priorityAttentionAt)

  return (
    <form action={updateProcessAssignment} className="assignment-form">
      <input type="hidden" name="process_id" value={processId} />

      <label>
        Responsable
        <select name="assigned_to" defaultValue={assignedTo ?? ''}>
          <option value="">General · visible para todos</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name || 'Usuario'} · {profile.role}
            </option>
          ))}
        </select>
      </label>

      <label>
        Prioridad
        <select name="priority" defaultValue={priority || 'Media'}>
          <option>Alta</option>
          <option>Media</option>
          <option>Baja</option>
        </select>
      </label>

      <label>
        Situación operativa
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

      <label>
        Fecha prioritaria de atención
        <input
          name="priority_attention_at"
          type="datetime-local"
          defaultValue={localValue}
        />
      </label>

      <SubmitButton pendingText="Guardando asignación…">
        Guardar asignación
      </SubmitButton>
    </form>
  )
}
