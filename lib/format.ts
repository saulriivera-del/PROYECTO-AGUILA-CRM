export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function dateTime(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Hermosillo',
  }).format(new Date(value))
}

export function dateOnly(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeZone: 'America/Hermosillo',
  }).format(new Date(value))
}
