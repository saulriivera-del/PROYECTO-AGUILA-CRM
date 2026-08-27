export const HERMOSILLO_TIME_ZONE = 'America/Hermosillo'
export const HERMOSILLO_OFFSET = '-07:00'
const DAY_MS = 86_400_000

export function hermosilloDateKey(value: Date | string = new Date()) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HERMOSILLO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function hermosilloTodayKey() {
  return hermosilloDateKey(new Date())
}

export function hermosilloDateTime(dateKey: string, hour = 0, minute = 0, second = 0) {
  return new Date(
    `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${HERMOSILLO_OFFSET}`,
  )
}

export function hermosilloLocalInputToDate(value: string) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return hermosilloDateTime(value, 12)
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!match) return new Date(value)
  return hermosilloDateTime(match[1], Number(match[2]), Number(match[3]))
}

export function addDaysKey(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T12:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export function weekdayForKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay()
}

export function startOfWeekKey(dateKey = hermosilloTodayKey()) {
  const day = weekdayForKey(dateKey)
  const distance = day === 0 ? 6 : day - 1
  return addDaysKey(dateKey, -distance)
}

export function endOfWeekExclusiveKey(dateKey = hermosilloTodayKey()) {
  return addDaysKey(startOfWeekKey(dateKey), 7)
}

export function startOfMonthKey(dateKey = hermosilloTodayKey()) {
  return `${dateKey.slice(0, 8)}01`
}

export function startOfYearKey(dateKey = hermosilloTodayKey()) {
  return `${dateKey.slice(0, 4)}-01-01`
}

export function daysBetweenKeys(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T12:00:00Z`).getTime()
  const to = new Date(`${toKey}T12:00:00Z`).getTime()
  return Math.max(0, Math.floor((to - from) / DAY_MS))
}

export function hermosilloDayBounds(dateKey = hermosilloTodayKey()) {
  return {
    start: hermosilloDateTime(dateKey, 0, 0, 0),
    endExclusive: hermosilloDateTime(addDaysKey(dateKey, 1), 0, 0, 0),
  }
}

export function hermosilloWeekBounds(dateKey = hermosilloTodayKey()) {
  const startKey = startOfWeekKey(dateKey)
  const endKey = addDaysKey(startKey, 7)
  return {
    startKey,
    endKey,
    start: hermosilloDateTime(startKey, 0, 0, 0),
    endExclusive: hermosilloDateTime(endKey, 0, 0, 0),
  }
}

export function hermosilloLocalInputValue(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HERMOSILLO_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
