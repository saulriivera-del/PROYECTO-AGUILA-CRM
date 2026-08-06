export const HERMOSILLO_TIME_ZONE = 'America/Hermosillo'

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function dateTime(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: HERMOSILLO_TIME_ZONE,
  }).format(new Date(value))
}

export function dateOnly(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium', timeZone: HERMOSILLO_TIME_ZONE,
  }).format(new Date(value))
}

export function hermosilloDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HERMOSILLO_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function hermosilloTodayKey() { return hermosilloDateKey(new Date()) }
