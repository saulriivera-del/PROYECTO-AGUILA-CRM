import test from 'node:test'
import assert from 'node:assert/strict'
import { birthCountryOptions, canonicalBirthCountry, isValidBirthCountry, birthCountryMatchesState } from './birth-countries.ts'

test('lista ISO completa de países con México destacado', () => {
  assert.equal(birthCountryOptions.length, 249)
  assert.equal(new Set(birthCountryOptions.map(x => x.code)).size, 249)
  assert.equal(birthCountryOptions.find(x => x.code === 'MX')?.name, 'México')
  assert.ok(birthCountryOptions.some(x => x.code === 'US'))
  assert.ok(birthCountryOptions.some(x => x.code === 'CA'))
})

test('normalizar entradas históricas México y otros países sin inventar destinos', () => {
  assert.equal(canonicalBirthCountry('mexico'), 'MX')
  assert.equal(canonicalBirthCountry('México'), 'MX')
  assert.equal(canonicalBirthCountry('MX'), 'MX')
  assert.equal(canonicalBirthCountry('Estados Unidos'), 'US')
  assert.equal(canonicalBirthCountry('Canadá'), 'CA')
  assert.equal(canonicalBirthCountry('Pais inventado'), 'Pais inventado')
  assert.equal(isValidBirthCountry('Pais inventado'), false)
})

test('no se permite país/estado de nacimiento incoherente', () => {
  assert.equal(birthCountryMatchesState('MX', 'Sonora'), true)
  assert.equal(birthCountryMatchesState('MX', 'Fuera de México / otro estado o provincia'), false)
  assert.equal(birthCountryMatchesState('US', 'Sonora'), false)
  assert.equal(birthCountryMatchesState('US', 'Fuera de México / otro estado o provincia'), true)
  assert.equal(birthCountryMatchesState('', 'Sonora'), false)
})
