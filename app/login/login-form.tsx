'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="login-form">
      <label>
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="angelrivera@visamaster.com.mx"
          required
        />
      </label>

      <label>
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="primary-button" disabled={pending}>
        {pending ? 'Ingresando…' : 'Entrar al centro de control'}
      </button>
    </form>
  )
}
