'use client'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const TOKEN_KEY = 'vm_corporate_session'

type Session = {
  access_token: string
  refresh_token: string
  expires_in?: number
  token_type?: string
  user?: { id: string; email?: string }
}

function config() {
  if (!url || !anon) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y la llave pública de Supabase.'
    )
  }

  return { url, anon }
}

export function getCorporateSession(): Session | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(TOKEN_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function clearCorporateSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

export async function signInCorporate(email: string, password: string) {
  const c = config()

  const res = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: c.anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const body = await res.json()

  if (!res.ok) {
    throw new Error(
      body?.error_description ||
        body?.msg ||
        'No se pudo iniciar sesión.'
    )
  }

  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(body))
  return body as Session
}

export async function refreshCorporateSession() {
  const session = getCorporateSession()

  if (!session?.refresh_token) {
    throw new Error('Sesión no disponible.')
  }

  const c = config()

  const res = await fetch(
    `${c.url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        apikey: c.anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token,
      }),
    }
  )

  const body = await res.json()

  if (!res.ok) {
    clearCorporateSession()
    throw new Error('Tu sesión venció. Inicia sesión nuevamente.')
  }

  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(body))
  return body as Session
}

async function authedFetch(path: string, init: RequestInit = {}) {
  let session = getCorporateSession()

  if (!session?.access_token) {
    throw new Error('AUTH_REQUIRED')
  }

  const c = config()

  const doFetch = (token: string) =>
    fetch(`${c.url}${path}`, {
      ...init,
      headers: {
        apikey: c.anon,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })

  let res = await doFetch(session.access_token)

  if (res.status === 401) {
    session = await refreshCorporateSession()
    res = await doFetch(session.access_token)
  }

  return res
}

export async function getCorporateUser() {
  const res = await authedFetch('/auth/v1/user')
  const body = await res.json()

  if (!res.ok) {
    throw new Error(body?.msg || 'No se pudo validar la sesión.')
  }

  return body
}

export async function getCompanyProfile() {
  const res = await authedFetch(
    '/rest/v1/company_users?select=id,name,email,role,is_active,company_id&limit=1'
  )

  const body = await res.json()

  if (!res.ok) {
    throw new Error(body?.message || 'No se pudo cargar el perfil.')
  }

  return body?.[0] || null
}

export async function getCompany() {
  const res = await authedFetch(
    '/rest/v1/companies?select=id,name,legal_name,slug,logo_url,is_active&limit=1'
  )

  const body = await res.json()

  if (!res.ok) {
    throw new Error(body?.message || 'No se pudo cargar la empresa.')
  }

  return body?.[0] || null
}

export async function getCorporateProcesses() {
  const res = await authedFetch(
    '/rest/v1/rpc/get_my_corporate_processes',
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  )

  const body = await res.json()

  if (!res.ok) {
    throw new Error(
      body?.message || 'No se pudieron cargar los trámites.'
    )
  }

  return Array.isArray(body) ? body : []
}

export async function getCorporateProcess(processId: string) {
  const processes = await getCorporateProcesses()

  return (
    processes.find(
      (process: any) =>
        String(process.process_id) === String(processId)
    ) || null
  )
}

export async function getCorporateUpdates(processId?: string) {
  let path =
    '/rest/v1/corporate_portal_updates?select=*&order=event_date.desc&limit=100'

  if (processId) {
    path += `&process_id=eq.${encodeURIComponent(processId)}`
  }

  const res = await authedFetch(path)
  const body = await res.json()

  if (!res.ok) {
    throw new Error(
      body?.message || 'No se pudo cargar la actividad.'
    )
  }

  return Array.isArray(body) ? body : []
}

export async function getCorporateDocuments(processId?: string) {
  let path =
    '/rest/v1/documents?select=id,process_id,document_type,file_name,public_title,portal_description,storage_provider,external_file_url,created_at&visible_to_company=eq.true&order=created_at.desc'

  if (processId) {
    path += `&process_id=eq.${encodeURIComponent(processId)}`
  }

  const res = await authedFetch(path)
  const body = await res.json()

  if (!res.ok) {
    throw new Error(
      body?.message || 'No se pudieron cargar los documentos.'
    )
  }

  return Array.isArray(body) ? body : []
}

export async function updateCorporatePassword(password: string) {
  const session = getCorporateSession()

  if (!session?.access_token) {
    throw new Error('AUTH_REQUIRED')
  }

  const c = config()

  const res = await fetch(`${c.url}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: c.anon,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })

  const body = await res.json()

  if (!res.ok) {
    throw new Error(
      body?.msg || 'No se pudo cambiar la contraseña.'
    )
  }

  return body
}

export async function signOutCorporate() {
  const session = getCorporateSession()

  if (session?.access_token) {
    try {
      const c = config()

      await fetch(`${c.url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: c.anon,
          Authorization: `Bearer ${session.access_token}`,
        },
      })
    } catch {}
  }

  clearCorporateSession()
}
