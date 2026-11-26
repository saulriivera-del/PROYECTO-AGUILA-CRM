import test from 'node:test'
import assert from 'node:assert/strict'
import { newFolio, isValidFolio } from './candidate-folio.ts'
test('new candidate folios are exactly six digits', () => {
  for (let i=0;i<1000;i++) assert.match(newFolio(), /^[0-9]{6}$/)
})
test('validates six digits and legacy folios only', () => {
  for (const value of ['123456','VM-ABCDEF123456']) assert.equal(isValidFolio(value),true)
  for (const value of ['12345','1234567','12345A','VM-123456','']) assert.equal(isValidFolio(value),false)
})
