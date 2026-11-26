import { randomInt } from 'node:crypto'

export function newFolio() { return String(randomInt(100000, 1000000)) }
export function isValidFolio(folio: string) { return /^(?:[0-9]{6}|VM-[A-F0-9]{12})$/.test(folio) }
