import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
  fullName: string
  role: string
  organizationName: string
}

export async function requireAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id, organizations(name)')
    .eq('id', user.id)
    .single()

  if (error || !profile?.organization_id) {
    redirect('/login?error=profile')
  }

  const organization = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations

  return {
    supabase,
    userId: user.id,
    organizationId: profile.organization_id,
    fullName: profile.full_name ?? user.email ?? 'Usuario',
    role: profile.role,
    organizationName: organization?.name ?? 'Visa Master',
  }
}
