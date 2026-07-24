import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="eagle-mark">Á</div>
        <span>PROYECTO ÁGUILA</span>
        <h1>Centro de operaciones de Visa Master</h1>
        <p>
          Prospectos, clientes, trámites, agenda y cobranza protegidos
          mediante tu cuenta.
        </p>

        <div className="security-note">
          <strong>Fase 4.2</strong>
          <span>Inicio de sesión y lectura real desde Supabase.</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">Acceso privado</span>
          <h2>Bienvenido, Ángel</h2>
          <p>Utiliza el usuario que creaste en Supabase Authentication.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  )
}
