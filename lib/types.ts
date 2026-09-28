export type PortalProcess = {
  company_id: string
  company_name: string | null
  company_legal_name: string | null
  company_slug: string | null
  process_id: string
  client_id: string
  client_name: string
  service_name: string
  public_status: string | null
  public_status_label: string | null
  public_note: string | null
  public_next_step: string | null
  requires_client_action: boolean | null
  client_action_note: string | null
  cas_appointment_at: string | null
  consulate_appointment_at: string | null
  result_status: string | null
  portal_last_updated_at: string | null
  portal_published_at: string | null
  external_reference: string | null
}

export type PortalUpdate = {
  company_id: string
  company_slug: string | null
  update_id: string
  process_id: string
  status: string | null
  title: string
  description: string | null
  event_date: string | null
  source: string | null
  created_at: string | null
}
