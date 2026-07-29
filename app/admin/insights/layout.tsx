import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'

export default async function InsightsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await requireAuthContext()
  requireAdministrator(context)
  return children
}
