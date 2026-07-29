import { redirect } from 'next/navigation'
import type { AuthContext } from '@/lib/auth-context'

export function isAdministrator(role: string | null | undefined) {
  const normalized = String(role ?? '').trim().toLowerCase()
  return ['administrador', 'admin', 'owner', 'propietario', 'director'].includes(normalized)
}

export function requireAdministrator(context: AuthContext) {
  if (!isAdministrator(context.role)) redirect('/admin?error=Acceso%20reservado%20para%20administradores')
}
