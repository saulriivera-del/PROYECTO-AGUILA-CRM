export function normalizeSurname(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')
}
export function birthYearValid(value: string) {
  return /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= new Date().getFullYear()
}
export function identityKey(surname: string, year: string) {
  const normalized = normalizeSurname(surname)
  return normalized && birthYearValid(year) ? 'IDENTITY:' + normalized + ':' + year : null
}
