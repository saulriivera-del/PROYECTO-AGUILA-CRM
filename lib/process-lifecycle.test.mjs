import test from 'node:test'
import assert from 'node:assert/strict'
import { isFinalProcess, isAwaitingVisaPickup, isPendingAgendaEvent } from './process-lifecycle.ts'
test('an undecided consular step is active', () => assert.equal(isFinalProcess({status:'Activo',current_stage:'Aprobada o rechazada'}),false))
test('approved pending pickup is active even with a legacy closure date', () => {
 const p={status:'Aprobada',current_stage:'Aprobada · pendiente de recolección',closed_at:'2026-11-25'}
 assert.equal(isFinalProcess(p),false)
 assert.equal(isAwaitingVisaPickup(p),true)
})
test('approved legacy closure is preserved, as are rejected and cancelled cases', () => {
 assert.equal(isFinalProcess({status:'Aprobada',closed_at:'2026-11-25'}),true)
 for(const status of ['Concluido','Cancelado','Rechazada'])assert.equal(isFinalProcess({status}),true)
})
test('closed process hides stale automated visa alerts but preserves independent tasks', () => {
 const processes={status:'Concluido'}
 assert.equal(isPendingAgendaEvent({status:'Pendiente',automation_key:'1:visa-pickup-pending',processes}),false)
 assert.equal(isPendingAgendaEvent({status:'Pendiente',automation_key:'1:manual-visa-followup',processes}),true)
 assert.equal(isPendingAgendaEvent({status:'Realizado'}),false)
 assert.equal(isPendingAgendaEvent({status:'Pendiente',automation_key:'1:visa-pickup-pending',processes:{status:'Aprobada'}}),true)
})
