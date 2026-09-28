export function formatDate(value?: string | null, withTime = false) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export function initials(name?: string | null) {
  if (!name) return 'VM'
  return name.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join('')
}
