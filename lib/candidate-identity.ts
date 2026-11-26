export function surnamePrefix(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
}
export function birthYearValid(value: string) {
  return /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= new Date().getFullYear()
}
export function identityKey(surname: string, year: string) {
  const prefix = surnamePrefix(surname)
  return prefix && birthYearValid(year) ? 'IDENTITY:' + prefix + ':' + year : null
}
