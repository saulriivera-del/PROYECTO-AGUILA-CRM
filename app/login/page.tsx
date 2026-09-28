import { Brand } from '@/components/Brand'
import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="login-page">
      <section className="login-panel">
        <Brand />
        <div className="login-copy">
          <span className="badge">Portal Empresarial</span>
          <h1>Seguimiento claro, seguro y en tiempo real.</h1>
          <p>Consulta el avance de tus candidatos, próximas acciones, citas y actividad desde un solo lugar.</p>
        </div>
        <div className="login-foot">Visa Master · Hermosillo, Sonora</div>
      </section>
      <section className="login-card-wrap">
        <form action={login} className="login-card">
          <h2>Bienvenida</h2>
          <p>Ingresa con tu cuenta corporativa.</p>
          {error && <div className="form-error">{error}</div>}
          <label>Correo electrónico<input name="email" type="email" defaultValue="gabriela@tradeinmotion.us" required /></label>
          <label>Contraseña<input name="password" type="password" placeholder="••••••••" required /></label>
          <button className="primary-button large" type="submit">Ingresar al portal</button>
          <small>Tu acceso está protegido y limitado a los trámites autorizados de tu empresa.</small>
        </form>
      </section>
    </main>
  )
}
