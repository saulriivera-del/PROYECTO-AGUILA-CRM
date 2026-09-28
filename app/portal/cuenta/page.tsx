import { redirect } from 'next/navigation'
import { Building2, Mail, ShieldCheck } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PortalShell } from '@/components/PortalShell'
import { changePassword } from './actions'

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: companyUser } = await supabase.from('company_users').select('name, email, role, companies(name, legal_name)').eq('auth_user_id', user.id).single()
  const rel = companyUser?.companies as unknown as { name?: string; legal_name?: string } | null
  const company = rel?.legal_name || rel?.name || 'Empresa'
  const name = companyUser?.name || 'Gabriela'
  const { success, error } = await searchParams

  return <PortalShell name={name} company={company}><main className="portal-content account-page"><div className="hero-copy"><h1>Mi cuenta</h1><p>Administra tus datos de acceso al Portal Empresarial.</p></div>
    <div className="account-grid"><section className="detail-card"><h3>Información de la cuenta</h3><div className="account-row"><Mail/><div><span>Correo</span><strong>{user.email}</strong></div></div><div className="account-row"><Building2/><div><span>Empresa</span><strong>{company}</strong></div></div><div className="account-row"><ShieldCheck/><div><span>Rol</span><strong>{companyUser?.role || 'viewer'}</strong></div></div></section>
    <section className="detail-card"><h3>Cambiar contraseña</h3><p>Te recomendamos reemplazar la contraseña temporal por una contraseña personal.</p>{success && <div className="form-success">{success}</div>}{error && <div className="form-error">{error}</div>}<form action={changePassword} className="password-form"><label>Nueva contraseña<input name="password" type="password" minLength={8} required /></label><label>Confirmar contraseña<input name="confirm" type="password" minLength={8} required /></label><button className="primary-button" type="submit">Actualizar contraseña</button></form></section></div>
  </main></PortalShell>
}
