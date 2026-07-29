import { requireAuthContext } from '@/lib/auth-context'
import { requireAdministrator } from '@/lib/admin-access'
import { resetOperationalData } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
export default async function ToolsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const context = await requireAuthContext(); requireAdministrator(context)
  return <>
    <header className="page-header"><div><span className="eyebrow">Configuración · Fase 5.3</span><h1>Herramientas administrativas</h1><p>Prepara Águila para iniciar el beta con datos reales.</p></div></header>
    {params.cleaned ? <div className="notice success">Los datos operativos de prueba fueron eliminados. Usuarios, roles, metas, reglas de bonos y configuración se conservaron.</div> : null}
    {params.error ? <div className="notice error">{String(params.error)}</div> : null}
    <section className="panel-card danger-zone">
      <span className="eyebrow">Zona delicada</span><h2>Limpiar datos de prueba</h2>
      <p>Elimina prospectos, clientes, trámites, cargos, cobros, seguimientos, agenda y actividad operativa de tu organización. Conserva cuentas de usuario, configuración, metas y reglas de bonos.</p>
      <p><strong>Esta operación no se puede deshacer desde Águila.</strong> Antes de ejecutarla, crea un respaldo en Supabase.</p>
      <form action={resetOperationalData} className="insight-form">
        <label>Para confirmar, escribe <code>BORRAR DATOS DE PRUEBA</code><input name="confirmation" autoComplete="off" required /></label>
        <button className="danger-button">Eliminar datos operativos</button>
      </form>
    </section>
  </>
}
