import { requireAuthContext } from '@/lib/auth-context'
import { getVisaMasterAdminClient } from '@/lib/visa-master-admin'

export type BotMasterRole = 'SUPERADMIN' | 'OWNER' | 'OPERATOR' | 'VIEWER'

const ROLE_RANK: Record<BotMasterRole, number> = {
  VIEWER: 10,
  OPERATOR: 20,
  OWNER: 30,
  SUPERADMIN: 40,
}

export type BotMasterTenant = {
  admin: ReturnType<typeof getVisaMasterAdminClient>
  projectContext: any
  organizationId: number
  organizationName: string
  organizationSlug: string
  projectOrganizationId: string
  userId: string
  role: BotMasterRole
  canArmLive: boolean
  isInternal: boolean
  isSuperadmin: boolean
}

function normalizeRole(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

function internalFallbackRole(projectRole: unknown): BotMasterRole {
  const role = normalizeRole(projectRole)
  if (
    role.includes('ADMIN')
    || role.includes('OWNER')
    || role.includes('PROPIET')
    || role.includes('DIRECCION')
    || role.includes('DIRECTOR')
  ) {
    return 'SUPERADMIN'
  }
  return 'OPERATOR'
}

export function botMasterRoleAtLeast(role: BotMasterRole, minimum: BotMasterRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export async function logBotMasterSecurityEvent(
  tenant: Partial<BotMasterTenant> | null,
  input: {
    action: string
    resourceType?: string | null
    resourceId?: string | number | null
    allowed: boolean
    reason?: string | null
    metadata?: Record<string, unknown>
    actorChannel?: 'WEB' | 'TELEGRAM' | 'SYSTEM'
  },
) {
  try {
    const admin = tenant?.admin || getVisaMasterAdminClient()
    await (admin as any).from('vm_security_audit_log').insert({
      organization_id: tenant?.organizationId ?? null,
      actor_channel: input.actorChannel || 'WEB',
      actor_project_user_id: tenant?.userId || null,
      actor_role: tenant?.role || null,
      action: input.action,
      resource_type: input.resourceType || null,
      resource_id: input.resourceId === null || input.resourceId === undefined
        ? null
        : String(input.resourceId),
      allowed: Boolean(input.allowed),
      reason: input.reason || null,
      metadata: input.metadata || {},
    })
  } catch {
    // La auditoría nunca debe romper la operación principal.
  }
}

async function deny(
  tenant: Partial<BotMasterTenant> | null,
  action: string,
  reason: string,
  resourceType?: string,
  resourceId?: string | number,
): Promise<never> {
  await logBotMasterSecurityEvent(tenant, {
    action,
    resourceType,
    resourceId,
    allowed: false,
    reason,
  })
  throw new Error(`ACCESS_DENIED: ${reason}`)
}

export async function requireBotMasterTenant(
  minimum: BotMasterRole = 'VIEWER',
): Promise<BotMasterTenant> {
  const projectContext: any = await requireAuthContext()
  const admin = getVisaMasterAdminClient()
  const projectOrganizationId = String(projectContext.organizationId || '')
  const userId = String(projectContext.userId || '')

  if (!projectOrganizationId || !userId) {
    return deny(null, 'TENANT_CONTEXT', 'No se pudo resolver la organización o el usuario de Proyecto Águila.')
  }

  const { data: organizations, error: orgError } = await (admin as any)
    .from('vm_organizations')
    .select('id,name,slug,status,is_internal,project_organization_id')
    .eq('project_organization_id', projectOrganizationId)
    .limit(2)

  if (orgError) throw new Error(orgError.message)

  if (!organizations?.length) {
    return deny(
      { admin, userId } as any,
      'TENANT_CONTEXT',
      'Esta organización de Proyecto Águila todavía no está vinculada a una organización de Bot Master.',
    )
  }

  if (organizations.length !== 1) {
    return deny(
      { admin, userId } as any,
      'TENANT_CONTEXT',
      'La organización de Proyecto Águila tiene una vinculación ambigua en Bot Master.',
    )
  }

  const organization = organizations[0]
  const partialTenant: Partial<BotMasterTenant> = {
    admin,
    projectContext,
    organizationId: Number(organization.id),
    organizationName: organization.name,
    organizationSlug: organization.slug,
    projectOrganizationId,
    userId,
    isInternal: Boolean(organization.is_internal),
  }

  if (String(organization.status || '') !== 'ACTIVE') {
    return deny(partialTenant, 'TENANT_CONTEXT', `La organización está ${organization.status || 'inactiva'}.`)
  }

  let { data: memberships, error: memberError } = await (admin as any)
    .from('vm_organization_users')
    .select('id,role,can_arm_live,active,project_user_id')
    .eq('organization_id', Number(organization.id))
    .eq('project_user_id', userId)
    .eq('active', true)
    .limit(1)

  if (memberError) throw new Error(memberError.message)

  // Compatibilidad segura para Visa Master: una persona ya autenticada dentro
  // de la organización interna puede sincronizarse automáticamente.
  if (!memberships?.length && organization.is_internal) {
    const fallbackRole = internalFallbackRole(projectContext.role)
    const { data: inserted, error: insertError } = await (admin as any)
      .from('vm_organization_users')
      .insert({
        organization_id: Number(organization.id),
        project_user_id: userId,
        display_name: projectContext.fullName || null,
        role: fallbackRole,
        can_arm_live: fallbackRole === 'SUPERADMIN',
        active: true,
      })
      .select('id,role,can_arm_live,active,project_user_id')
      .single()

    if (insertError) throw new Error(insertError.message)
    memberships = inserted ? [inserted] : []
  }

  if (!memberships?.length) {
    return deny(
      partialTenant,
      'TENANT_CONTEXT',
      'Tu usuario no está autorizado para Bot Master dentro de esta organización.',
    )
  }

  const membership = memberships[0]
  const role = String(membership.role || 'VIEWER').toUpperCase() as BotMasterRole
  const tenant: BotMasterTenant = {
    admin,
    projectContext,
    organizationId: Number(organization.id),
    organizationName: String(organization.name || 'Organización'),
    organizationSlug: String(organization.slug || ''),
    projectOrganizationId,
    userId,
    role,
    canArmLive: Boolean(membership.can_arm_live),
    isInternal: Boolean(organization.is_internal),
    isSuperadmin: role === 'SUPERADMIN',
  }

  if (!botMasterRoleAtLeast(role, minimum)) {
    return deny(
      tenant,
      'ROLE_CHECK',
      `Se requiere rol ${minimum}; tu rol es ${role}.`,
    )
  }

  return tenant
}

export async function assertConfigAccess(
  tenant: BotMasterTenant,
  configId: number,
  minimum: BotMasterRole,
  action: string,
) {
  if (!botMasterRoleAtLeast(tenant.role, minimum)) {
    return deny(tenant, action, `Se requiere rol ${minimum}.`, 'BOOKING_CONFIG', configId)
  }

  const { data, error } = await (tenant.admin as any)
    .from('vm_booking_configs')
    .select('id,organization_id,client_id,account_id,ais_target_id,auto_confirm_enabled,operational_status')
    .eq('id', Number(configId))
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    return deny(tenant, action, 'La configuración no existe.', 'BOOKING_CONFIG', configId)
  }
  if (Number(data.organization_id) !== tenant.organizationId && !tenant.isSuperadmin) {
    return deny(tenant, action, 'La configuración pertenece a otra organización.', 'BOOKING_CONFIG', configId)
  }

  await logBotMasterSecurityEvent(tenant, {
    action,
    resourceType: 'BOOKING_CONFIG',
    resourceId: configId,
    allowed: true,
    reason: 'TENANT_MATCH',
  })
  return data
}

export async function assertAccountAccess(
  tenant: BotMasterTenant,
  accountId: number,
  minimum: BotMasterRole,
  action: string,
) {
  if (!botMasterRoleAtLeast(tenant.role, minimum)) {
    return deny(tenant, action, `Se requiere rol ${minimum}.`, 'AIS_ACCOUNT', accountId)
  }

  const { data, error } = await (tenant.admin as any)
    .from('vm_ais_accounts')
    .select('id,organization_id,account_email,credential_status')
    .eq('id', Number(accountId))
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return deny(tenant, action, 'La cuenta AIS no existe.', 'AIS_ACCOUNT', accountId)
  if (Number(data.organization_id) !== tenant.organizationId && !tenant.isSuperadmin) {
    return deny(tenant, action, 'La cuenta AIS pertenece a otra organización.', 'AIS_ACCOUNT', accountId)
  }

  await logBotMasterSecurityEvent(tenant, {
    action,
    resourceType: 'AIS_ACCOUNT',
    resourceId: accountId,
    allowed: true,
    reason: 'TENANT_MATCH',
  })
  return data
}

export async function assertTargetAccess(
  tenant: BotMasterTenant,
  targetId: number,
  minimum: BotMasterRole,
  action: string,
) {
  if (!botMasterRoleAtLeast(tenant.role, minimum)) {
    return deny(tenant, action, `Se requiere rol ${minimum}.`, 'AIS_TARGET', targetId)
  }

  const { data, error } = await (tenant.admin as any)
    .from('vm_ais_account_targets')
    .select('id,organization_id,account_id,client_id')
    .eq('id', Number(targetId))
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return deny(tenant, action, 'El target AIS no existe.', 'AIS_TARGET', targetId)
  if (Number(data.organization_id) !== tenant.organizationId && !tenant.isSuperadmin) {
    return deny(tenant, action, 'El target AIS pertenece a otra organización.', 'AIS_TARGET', targetId)
  }

  await logBotMasterSecurityEvent(tenant, {
    action,
    resourceType: 'AIS_TARGET',
    resourceId: targetId,
    allowed: true,
    reason: 'TENANT_MATCH',
  })
  return data
}

export async function assertOrganizationAccess(
  tenant: BotMasterTenant,
  organizationId: number,
  minimum: BotMasterRole,
  action: string,
) {
  if (!botMasterRoleAtLeast(tenant.role, minimum)) {
    return deny(tenant, action, `Se requiere rol ${minimum}.`, 'ORGANIZATION', organizationId)
  }
  if (Number(organizationId) !== tenant.organizationId && !tenant.isSuperadmin) {
    return deny(tenant, action, 'No puedes administrar otra organización.', 'ORGANIZATION', organizationId)
  }

  await logBotMasterSecurityEvent(tenant, {
    action,
    resourceType: 'ORGANIZATION',
    resourceId: organizationId,
    allowed: true,
    reason: tenant.isSuperadmin ? 'SUPERADMIN' : 'TENANT_MATCH',
  })
}

export async function assertCrmProcessAccess(
  tenant: BotMasterTenant,
  processId: string | number,
  action: string,
) {
  const { data, error } = await (tenant.admin as any)
    .from('processes')
    .select('id,organization_id')
    .eq('id', processId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return deny(tenant, action, 'El proceso CRM no existe.', 'CRM_PROCESS', processId)
  if (String(data.organization_id) !== tenant.projectOrganizationId && !tenant.isSuperadmin) {
    return deny(tenant, action, 'El proceso CRM pertenece a otra organización.', 'CRM_PROCESS', processId)
  }
  return data
}

export async function assertCanArmLive(
  tenant: BotMasterTenant,
  configId: number,
  action = 'ARM_LIVE',
) {
  await assertConfigAccess(tenant, configId, 'OPERATOR', action)
  if (!tenant.canArmLive && !tenant.isSuperadmin) {
    return deny(
      tenant,
      action,
      'Tu rol puede operar el motor, pero no tiene permiso explícito can_arm_live.',
      'BOOKING_CONFIG',
      configId,
    )
  }
}

export async function requirePlatformAdmin(action = 'PLATFORM_ADMIN') {
  const tenant = await requireBotMasterTenant('SUPERADMIN')
  await logBotMasterSecurityEvent(tenant, {
    action,
    resourceType: 'PLATFORM',
    allowed: true,
    reason: 'SUPERADMIN',
  })
  return tenant
}
