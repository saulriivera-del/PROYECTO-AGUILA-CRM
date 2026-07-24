'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setPending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error('Supabase login error:', {
          name: error.name,
          message: error.message,
          status: error.status,
          code: error.code,
        })

        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('El correo del usuario todavía no está confirmado.')
        } else if (
          error.message.toLowerCase().includes('invalid login credentials')
        ) {
          setErrorMessage('El correo o la contraseña no coinciden.')
        } else {
          setErrorMessage(`No se pudo iniciar sesión: ${error.message}`)
        }
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch (error) {
      console.error('Unexpected login error:', error)
      setErrorMessage(
        'No fue posible conectar con Supabase. Revisa la URL y la llave pública configuradas en Vercel.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label>
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {errorMessage ? (
        <p className="form-error" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? 'Verificando acceso…' : 'Entrar al centro de control'}
      </button>
    </form>
  )
}
