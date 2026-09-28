import {
  HERMOSILLO_TIME_ZONE,
  hermosilloDateKey,
  hermosilloTodayKey,
} from '@/lib/hermosillo'

export { HERMOSILLO_TIME_ZONE, hermosilloDateKey, hermosilloTodayKey }

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
