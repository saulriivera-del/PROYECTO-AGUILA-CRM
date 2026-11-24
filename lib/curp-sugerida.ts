// Sugerencia NO oficial de CURP: carácter 17 aproximado (0/A), siempre exige confirmación documental.
export type CurpInput = { nombres?: string; paterno?: string; materno?: string; fecha?: string; sexo?: string; entidad?: string }
const ENTIDADES: Record<string, string> = {
  'Aguascalientes':'AS','Baja California':'BC','Baja California Sur':'BS','Campeche':'CC',
  'Chiapas':'CS','Chihuahua':'CH','Ciudad de México':'DF','Coahuila':'CL','Colima':'CM',
  'Durango':'DG','Estado de México':'MC','Guanajuato':'GT','Guerrero':'GR','Hidalgo':'HG',
  'Jalisco':'JC','Michoacán':'MN','Morelos':'MS','Nayarit':'NT','Nuevo León':'NL',
  'Oaxaca':'OC','Puebla':'PL','Querétaro':'QT','Quintana Roo':'QR','San Luis Potosí':'SP',
  'Sinaloa':'SL','Sonora':'SR','Tabasco':'TC','Tamaulipas':'TS','Tlaxcala':'TL',
  'Veracruz':'VZ','Yucatán':'YN','Zacatecas':'ZS','Fuera de México / otro estado o provincia':'NE',
}
const PARTICULAS = new Set(['DE','DEL','LA','LAS','LOS','Y','DA','DAS','DO','DOS','VON','VAN','MC','MAC'])
const INCONVENIENTES = new Set(['BACA','BAKA','BUEI','BUEY','CACA','CACO','CAGA','CAGO','CAKA','CAKO','COGE','COGI','COJA','COJE','COJI','COJO','COLA','CULO','FALO','FETO','GETA','GUEI','GUEY','JETA','JOTO','KACA','KACO','KAGA','KAGO','KAKA','KAKO','KOGE','KOGI','KOJA','KOJE','KOJI','KOJO','KOLA','KULO','LILO','LOCA','LOCO','LOKA','LOKO','MAME','MAMO','MEAR','MEAS','MEON','MIAR','MION','MOCO','MOKO','MULA','MULO','NACA','NACO','PEDA','PEDO','PENE','PIPI','PITO','POPO','PUTA','PUTO','QULO','RATA','ROBA','ROBE','ROBO','RUIN','SENO','TETA','VACA','VAGA','VAGO','VAKA','VUEI','VUEY','WUEI','WUEY'])
function normaliza(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/Ñ/g,'X').replace(/[^A-Z ]/g,' ').replace(/\s+/g,' ').trim() }
function apellido(s: string) { return normaliza(s).split(' ').filter(t => t && !PARTICULAS.has(t))[0] || '' }
function nombreClave(s: string) {
  const a = normaliza(s).split(' ').filter(Boolean)
  if (a.length > 1 && (a[0] === 'JOSE' || a[0] === 'MARIA' || a[0] === 'MA')) return a[1]
  return a[0] || ''
}
function interior(s: string, expr: RegExp) { return s.slice(1).match(expr)?.[0] || 'X' }
const ALFABETO = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'
function verificador(c17: string) {
  const suma = [...c17].reduce((s,ch,i) => s + ALFABETO.indexOf(ch) * (18-i), 0)
  return String((10 - (suma % 10)) % 10)
}
export function sugerirCurp(data: CurpInput): string | null {
  const p=apellido(data.paterno || ''), m=apellido(data.materno || ''), n=nombreClave(data.nombres || '')
  const fecha=data.fecha || '', estado=ENTIDADES[data.entidad || '']
  const sexo = data.sexo === 'Mujer' ? 'M' : data.sexo === 'Hombre' ? 'H' : ''
  if (!p || !n || !estado || !sexo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const [yyyy,mm,dd]=fecha.split('-')
  const d=new Date(fecha+'T00:00:00Z')
  if (Number(yyyy)<1900 || Number(yyyy)>2099 || Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==fecha) return null
  let inicial=p[0]+interior(p,/[AEIOU]/)+(m[0] || 'X')+n[0]
  if (INCONVENIENTES.has(inicial)) inicial=inicial.slice(0,1)+'X'+inicial.slice(2)
  const c16=inicial+yyyy.slice(2)+mm+dd+sexo+estado+interior(p,/[BCDFGHJKLMNPQRSTVWXYZ]/)+(m?interior(m,/[BCDFGHJKLMNPQRSTVWXYZ]/):'X')+interior(n,/[BCDFGHJKLMNPQRSTVWXYZ]/)
  const c17=c16+(Number(yyyy)<2000?'0':'A') // No es el carácter oficial asignado por RENAPO.
  return c17+verificador(c17)
}
export function formatoCurp(value: string) { return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-J]\d$/.test(value) }
