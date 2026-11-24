import test from 'node:test'
import assert from 'node:assert/strict'
import { nombresDesdeNombreCompleto, sugerirCurp, formatoCurp } from './curp-sugerida.ts'

const base = {
  paterno: 'Rivera',
  materno: 'Espinoza',
  fecha: '1996-08-02',
  sexo: 'Hombre',
  entidad: 'Sonora',
}

test('reconoce Ángel Saúl cuando Rivera y Espinoza están en campos distintos', () => {
  const nombres = nombresDesdeNombreCompleto('Ángel Saúl', base.paterno, base.materno)
  assert.equal(nombres, 'ANGEL SAUL')
  const suggestion = sugerirCurp({ ...base, nombres })
  assert.equal(suggestion, 'RIEA960802HSRVSN04')
  assert.equal(formatoCurp(suggestion), true)
})

test('la misma CURP sugerida se obtiene si el nombre completo incluye apellidos', () => {
  const givenOnly = nombresDesdeNombreCompleto('Ángel Saúl', 'Rivera', 'Espinoza')
  const withSurnames = nombresDesdeNombreCompleto('Ángel Saúl Rivera Espinoza', 'Rivera', 'Espinoza')
  const surnamesFirst = nombresDesdeNombreCompleto('Rivera Espinoza Ángel Saúl', 'Rivera', 'Espinoza')
  assert.equal(withSurnames, givenOnly)
  assert.equal(surnamesFirst, givenOnly)
  assert.equal(sugerirCurp({ ...base, nombres: withSurnames }), sugerirCurp({ ...base, nombres: givenOnly }))
})

test('no inventa nombres si el campo tiene solo una coincidencia parcial de apellidos', () => {
  assert.equal(nombresDesdeNombreCompleto('Ángel Rivera', 'Rivera', 'Espinoza'), '')
  assert.equal(nombresDesdeNombreCompleto('Juan Pérez López Ramírez', 'Rivera', 'Espinoza'), '')
  assert.equal(nombresDesdeNombreCompleto('Ángel Saúl', '', 'Espinoza'), '')
})

test('mantiene obligatorios sexo, fecha y entidad para el cálculo preliminar', () => {
  assert.equal(sugerirCurp({ ...base, nombres: 'ANGEL SAUL', sexo: '' }), null)
  assert.equal(sugerirCurp({ ...base, nombres: 'ANGEL SAUL', fecha: '1996-02-30' }), null)
  assert.equal(sugerirCurp({ ...base, nombres: 'ANGEL SAUL', entidad: '' }), null)
})
