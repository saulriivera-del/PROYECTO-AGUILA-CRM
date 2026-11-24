'use client'

import { useState } from 'react'

type Step = 'captura' | 'revision' | 'aprobacion' | 'extension'
type Role = 'recepcion' | 'administracion'

const steps: { key: Step; title: string; desc: string }[] = [
  { key: 'captura', title: '1. Cliente', desc: 'Responde el cuestionario en Águila' },
  { key: 'revision', title: '2. Mariana', desc: 'Coteja datos y documentos' },
  { key: 'aprobacion', title: '3. Aprobación', desc: 'Autoriza la sección personal' },
  { key: 'extension', title: '4. Chrome', desc: 'Prepara datos para CEAC' },
]
const fields = [
  { label: 'Nombre conforme al pasaporte', value: 'PERSONA DE PRUEBA', key: 'full_name', note: 'Debe separarse en nombres y apellidos antes de CEAC' },
  { label: 'Fecha de nacimiento', value: '1990-08-15', key: 'birth_date', note: 'La extensión adaptará día, mes y año' },
  { label: 'Ciudad de nacimiento', value: 'HERMOSILLO', key: 'birth_city', note: 'Esperando correspondencia oficial' },
  { label: 'Nacionalidad', value: 'Mexicana', key: 'nationality', note: 'Esperando catálogo de CEAC' },
]
const palette = { navy:'#193b5b', muted:'#60758b', border:'#d9e4ee', blue:'#1f65a0' }
export default function Ds160PilotDemoPage() {
  const [step, setStep] = useState<Step>('captura')
  const [role, setRole] = useState<Role>('administracion')
  const [showIssue, setShowIssue] = useState(false)
  const stage = steps.findIndex(s => s.key === step)
  const button = (active: boolean) => ({
    background: active ? '#1c5f98' : '#fff', color: active ? '#fff' : palette.navy,
    border: '1px solid ' + (active ? '#1c5f98' : palette.border),
    borderRadius: 9, padding: '10px 14px', cursor: 'pointer', fontWeight: 650 as const,
  })
  const card = { border: '1px solid ' + palette.border, background: '#fff', borderRadius: 13, padding: 19 }
  return (
    <div style={{maxWidth:1120, margin:'0 auto', padding:'24px 22px 55px', color:palette.navy}}>
      <div style={{display:'flex', gap:12, justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap'}}>
        <div>
          <small style={{fontWeight:750, letterSpacing:'0.12em', color:palette.blue}}>VISA MASTER · PILOTO DS-160</small>
          <h1 style={{fontSize:29, margin:'8px 0'}}>Automatización desde Águila</h1>
          <p style={{color:palette.muted, lineHeight:1.6, maxWidth:720}}>Recorre la experiencia prevista para clientes, recepción y administración. Esta pantalla usa información inventada para que puedas dar comentarios sin cambiar expedientes reales.</p>
        </div>
        <span style={{padding:'9px 12px', border:'1px solid #e8cfa3', borderRadius:24, color:'#805518', background:'#fff8eb', fontWeight:700}}>DEMO INTERACTIVA · NO ENVÍA DATOS</span>
      </div>
      <div style={{...card, background:'#edf5fc', marginTop:16}}>
        <strong>Qué está desarrollado y qué falta</strong>
        <p style={{margin:'9px 0 0', lineHeight:1.6}}>Águila ya tiene el flujo de aprobación y la lectura autenticada de datos personales. La extensión Chrome v0.2, disponible en el repositorio principal, prepara hasta 10 campos en Datos personales 1 y 2 campos en Datos personales 2. Falta validar el llenado extremo a extremo en CEAC con una solicitud ficticia; esta demo no modifica ninguna solicitud oficial.</p>
      </div>
      <section style={{...card,marginTop:20}}><h2 style={{fontSize:18,marginTop:0}}>Extensión piloto disponible</h2><p>Descarga el repositorio desde GitHub, extrae la carpeta <code>tools/chrome-ceac-pilot</code> y en Chrome abre <code>chrome://extensions</code> → Modo desarrollador → Cargar descomprimida. Abre la ficha aprobada del candidato en Águila y la página CEAC en otra pestaña.</p><p><a href="https://github.com/saulriivera-del/PROYECTO-AGUILA-CRM/tree/main/tools/chrome-ceac-pilot" target="_blank" rel="noopener noreferrer">Ver extensión y guía de instalación en GitHub</a></p><p style={{fontSize:12,color:palette.muted}}>Usar solo con expedientes ficticios hasta completar la validación. La aprobación de Mariana sigue siendo obligatoria.</p></section>
      <section style={{marginTop:24}}>
        <h2 style={{fontSize:19}}>¿Qué vista quieres revisar?</h2>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button style={button(role==='administracion')} onClick={() => setRole('administracion')}>Mi vista · Administrador</button>
          <button style={button(role==='recepcion')} onClick={() => setRole('recepcion')}>Vista de Mariana · Recepción</button>
        </div>
        <p style={{fontSize:13, color:palette.muted, marginTop:10}}>{role==='administracion' ? 'Administrador: ve el expediente, la autorización y una futura bitácora de aprobaciones.' : 'Recepción: revisa el expediente, corrige incidencias y autoriza la transferencia.'}</p>
      </section>
      <section style={{marginTop:23}}>
        <h2 style={{fontSize:19}}>Flujo del trámite</h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))', gap:10}}>
          {steps.map((s,i)=><button key={s.key} onClick={()=>{setStep(s.key);setShowIssue(false)}} style={{...button(step===s.key), textAlign:'left', minHeight:86}}>
            <div style={{fontWeight:750, marginBottom:5}}>{s.title}</div>
            <div style={{fontSize:12, fontWeight:400, opacity:.9}}>{s.desc}</div>
          </button>)}
        </div>
      </section>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginTop:20}}>
        <section style={card}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <h2 style={{fontSize:19, margin:0}}>Expediente de demostración</h2>
            <span style={{fontSize:12, fontWeight:700, background:'#edf3f9', padding:'6px 10px',borderRadius:15}}>{stage===0?'Borrador':stage===1?'En revisión':stage===2?'Aprobado':'Preparado'}</span>
          </div>
          <p style={{fontSize:13,color:palette.muted}}>Folio: VM-DEMO-001 · Persona ficticia</p>
          {fields.map(f=><div key={f.key} style={{borderTop:'1px solid '+palette.border, padding:'12px 0'}}>
            <div style={{fontSize:12,color:palette.muted}}>{f.label}</div>
            <div style={{fontWeight:700,marginTop:4}}>{f.value}</div>
            {stage>=1 && <small style={{color:'#59718b'}}>{f.note}</small>}
          </div>)}
        </section>
        <section style={card}>
          <h2 style={{fontSize:19,margin:'0 0 12px'}}>Acción de esta etapa</h2>
          {step==='captura' && <><p>El cliente captura los datos en el formulario propio de Águila y los envía a recepción.</p><p><strong>Estado:</strong> En espera de revisión documental.</p></>}
          {step==='revision' && <><p>Mariana compara las respuestas con el pasaporte y documentos, y detecta errores antes de autorizarlas.</p>
            <button style={button(showIssue)} onClick={()=>setShowIssue(v=>!v)}>{showIssue?'Ocultar ejemplo de error':'Simular campo con error'}</button>
            {showIssue && <p style={{color:'#a04d24'}} role="alert">Revisar: los apellidos deben coincidir exactamente con el pasaporte. No se autorizará la sección hasta corregirlo.</p>}</>}
          {step==='aprobacion' && <><p>El operador autorizado comprueba que los datos están completos y cotejados. La aprobación queda asociada al expediente.</p><p><strong>Control:</strong> Si cambian las respuestas, la aprobación debe repetirse.</p></>}
          {step==='extension' && <><p>En Chrome, la extensión consulta los datos aprobados y prepara el mapeo a CEAC.</p><p><strong>Mapeo piloto:</strong> hasta 12 campos (10 en Personal 1 y 2 en Personal 2), pendientes de comprobar en una sesión de CEAC.</p><p>La extensión pide revisión y clic humano por pantalla, y nunca firma ni envía una solicitud.</p></>}
          {role==='administracion' && <div style={{background:'#f4f7fa',borderRadius:8,padding:12,marginTop:16,fontSize:13}}>
            <strong>Supervisión del administrador</strong>
            <p style={{marginBottom:0}}>Aquí se podrá consultar quién autorizó, cuándo, si hubo cambios y qué campos quedaron pendientes.</p>
          </div>}
          <button style={{...button(false),width:'100%',marginTop:20}} onClick={()=>{setStep(steps[(stage+1)%steps.length].key);setShowIssue(false)}}>Simular siguiente etapa</button>
        </section>
      </div>
      <section style={{...card,marginTop:20}}>
        <h2 style={{fontSize:19,marginTop:0}}>Mapa de campos que vamos a validar en CEAC</h2>
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse',width:'100%',fontSize:13}}>
            <thead><tr style={{textAlign:'left',background:'#f2f6fa'}}><th style={{padding:11}}>Águila</th><th style={{padding:11}}>Transformación</th><th style={{padding:11}}>Estado</th></tr></thead>
            <tbody>
              <tr><td style={{padding:11}}>full_name</td><td style={{padding:11}}>Separar nombres y apellidos según pasaporte</td><td style={{padding:11}}>Pendiente</td></tr>
              <tr><td style={{padding:11}}>birth_date</td><td style={{padding:11}}>Convertir en día, mes y año</td><td style={{padding:11}}>Pendiente</td></tr>
              <tr><td style={{padding:11}}>birth_city</td><td style={{padding:11}}>Ubicar campo oficial correspondiente</td><td style={{padding:11}}>Pendiente</td></tr>
              <tr><td style={{padding:11}}>nationality</td><td style={{padding:11}}>Homologar país con el catálogo oficial</td><td style={{padding:11}}>Pendiente</td></tr>
            </tbody>
          </table>
        </div>
        <p style={{fontSize:12,color:palette.muted}}>Las equivalencias se validarán manualmente una vez por sección y se volverán a comprobar cuando cambie CEAC.</p>
      </section>
    </div>
  )
}
