import test from 'node:test'
import assert from 'node:assert/strict'
import { newFolio, isValidFolio } from './candidate-folio.ts'
import { surnamePrefix, identityKey } from './candidate-identity.ts'
test('new candidate folios have VM and six digits', () => {
 for(let i=0;i<1000;i++) assert.match(newFolio(), /^VM-[0-9]{6}$/)
})
test('validates prefixed and legacy folios only', () => {
 for(const value of ['VM-123456','123456','VM-ABCDEF123456']) assert.equal(isValidFolio(value),true)
 for(const value of ['12345','1234567','12345A','VM-12345','']) assert.equal(isValidFolio(value),false)
})
test('surname prefix handles accents, short names and lowercase', () => {
 assert.equal(surnamePrefix('García'),'GARCI')
 assert.equal(surnamePrefix('Gil'),'GIL')
 assert.equal(surnamePrefix('Muñoz'),'MUNOZ')
 assert.equal(identityKey('garcía','1990'),'IDENTITY:GARCI:1990')
 assert.equal(identityKey('Gil','1990'),'IDENTITY:GIL:1990')
 assert.equal(identityKey('123','1990'),null)
 assert.equal(identityKey('Gil','90'),null)
 assert.equal(identityKey('Gil','3000'),null)
})
