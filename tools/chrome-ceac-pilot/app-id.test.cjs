const test = require('node:test');
const assert = require('node:assert/strict');
const { candidates, valid } = require('./app-id.js');
test('detecta solo un ID etiquetado de diez caracteres', () => {
  assert.deepEqual(candidates('Your Application ID is: AA00AB12CD'), ['AA00AB12CD']);
  assert.deepEqual(candidates('Application ID:\nAA0001IRZK'), ['AA0001IRZK']);
});
test('no obtiene identificadores desde texto suelto o un valor inválido', () => {
  assert.deepEqual(candidates('AA00AB12CD'), []);
  assert.deepEqual(candidates('Application ID: AA00AB12CDEXTRA'), []);
  assert.deepEqual(candidates('Application ID: AA00AB12C'), []);
  assert.equal(valid('AA0001IRZK'), true);
  assert.equal(valid('AA00AB12C'), false);
});
test('evita duplicados y detecta conflicto entre dos IDs en la pantalla', () => {
  assert.deepEqual(candidates('Application ID: AA0001IRZK \n Application ID: AA0001IRZK'), ['AA0001IRZK']);
  assert.deepEqual(candidates('Application ID: AA0001IRZK \n Application ID: AA0002IRZK'), ['AA0001IRZK','AA0002IRZK']);
});
