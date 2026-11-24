import { redirect } from 'next/navigation'
import { requireAuthContext } from '@/lib/auth-context'
import { isAdministrator } from '@/lib/admin-access'

export default async function Ds160PilotLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requireAuthContext()
  if (!isAdministrator(context.role) && context.role.trim().toLowerCase() !== 'reception') {
    redirect('/admin?error=Acceso%20restringido')
  }

  return children
}
