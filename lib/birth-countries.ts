/** Opciones ISO 3166-1 alpha-2 (249 países y territorios).
 * Se guardan los códigos de dos letras para evitar diferencias de ortografía
 * entre Águila, traducciones y el catálogo de CEAC.
 * El catálogo de CEAC puede usar otros códigos: su mapeo se valida por etiqueta.
 */
const ISO_ALPHA_2 = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(' ')
const ISO_COUNTRIES = new Set(ISO_ALPHA_2)

export const DEFAULT_BIRTH_COUNTRY = 'MX' as const

const spanish = new Intl.DisplayNames(['es-MX'], { type: 'region' })
const collator = new Intl.Collator('es-MX', { sensitivity: 'base' })

export const birthCountryOptions = ISO_ALPHA_2
  .map(code => ({ code, name: code === 'MX' ? 'México' : spanish.of(code) || code }))
  .sort((a, b) => collator.compare(a.name, b.name))

export function isValidBirthCountry(value: string): boolean {
  return ISO_COUNTRIES.has(value)
}

/** Compatibilidad con respuestas antiguas escritas en texto libre. */
export function canonicalBirthCountry(value: string): string {
  const original = (value || '').trim()
  if (!original) return ''
  const asCode = original.toUpperCase()
  if (ISO_COUNTRIES.has(asCode)) return asCode
  const norm = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '').toUpperCase()
  const normalized = norm(original)
  const aliases: Record<string, string> = {
    MEXICO: 'MX', MEX: 'MX', ESTADOSUNIDOS: 'US',
    UNITEDSTATES: 'US', UNITEDSTATESOFAMERICA: 'US',
    EUA: 'US', EEUU: 'US', CANADA: 'CA'
  }
  if (aliases[normalized]) return aliases[normalized]
  const matched = birthCountryOptions.filter(item => norm(item.name) === normalized)
  return matched.length === 1 ? matched[0].code : original
}

/** Evita enviar al DS-160 combinaciones incompatibles de país y estado. */
export function birthCountryMatchesState(country: string, state: string): boolean {
  if (!isValidBirthCountry(country) || !state) return false
  const outsideMexico = 'Fuera de México / otro estado o provincia'
  return country === 'MX' ? state !== outsideMexico : state === outsideMexico
}
