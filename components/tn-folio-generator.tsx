'use client'
import { useState, useTransition } from 'react'
import { createFolioAccess } from '@/app/admin/formularios/trade-in-motion/actions'

export default function TnFolioGenerator() {
  const [name,setName] = useState('')
  const [surname,setSurname] = useState('')
  const [year,setYear] = useState('')
  const [result,setResult] = useState<{folio?:string;key?:string;error?:string}|null>(null)
  const [pending,start] = useTransition()
  function generate(event: React.FormEvent) {
    event.preventDefault()
    setResult(null)
    start(async () => {
      try {
        const response = await createFolioAccess(name,surname,year)
        setResult(response)
        if (response.folio) {setName('');setSurname('');setYear('')}
      } catch { setResult({error:'No se pudo generar el acceso.'}) }
    })
  }
  const baseUrl = typeof window === 'undefined' ? 'https://crm.visamaster.com.mx' : window.location.origin
  const message = result?.folio
    ? `Visa Master · Cuestionario de candidato\nFormulario: ${baseUrl}/formularios/trade-in-motion\nFolio: ${result.folio}\nPara entrar, escribe las primeras cinco letras de tu primer apellido y tu año de nacimiento. Guarda el folio para continuar tu formulario más adelante.`
    : ''
  return <section style={{ background:'#fff',border:'1px solid #c8d9ea',borderRadius:13,padding:20,margin:'18px 0 22px' }}>
    <h3 style={{margin:'0 0 5px'}}>Generar folio de candidato</h3>
    <p style={{color:'#617b94',fontSize:13}}>No se requiere correo para ingresar. Comparte el folio por un canal privado. El candidato ingresará su primer apellido y año de nacimiento.</p>
    <form onSubmit={generate} style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <input aria-label="Nombre del candidato" type="text" minLength={2} maxLength={180} required
        value={name} onChange={e=>setName(e.target.value)}
        placeholder="Nombre del candidato o PRUEBA INTERNA"
        style={{padding:12,border:'1px solid #bfcfdf',borderRadius:8,flex:1,minWidth:220}}/>
      <input aria-label="Primer apellido" required value={surname} onChange={e=>setSurname(e.target.value)} placeholder="Primer apellido" maxLength={60} style={{padding:12,border:'1px solid #bfcfdf',borderRadius:8}}/>
      <input aria-label="Año de nacimiento" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={year} onChange={e=>setYear(e.target.value)} placeholder="Año de nacimiento" style={{padding:12,border:'1px solid #bfcfdf',borderRadius:8,width:150}}/>
      <button className="primary-button" type="submit" disabled={pending}>{pending?'Generando…':'Generar acceso'}</button>
    </form>
    {result?.error ? <p role="alert" className="notice error">{result.error}</p> : null}
    {message ? <div style={{background:'#f4f7fc',border:'1px solid #bbd0e4',borderRadius:10,padding:16,marginTop:14}}>
      <strong>Acceso generado. Comparte el folio:</strong>
      <p><b>Folio:</b> <code>{result?.folio}</code></p>
      <p>Acceso: cinco primeras letras del primer apellido y año de nacimiento.</p>
      <button type="button" className="secondary-button" onClick={() => navigator.clipboard.writeText(message)}>Copiar invitación para WhatsApp</button>
      <p style={{fontSize:12,color:'#657b92'}}>No se enviaron correos ni solicitudes oficiales.</p>
    </div> : null}
  </section>
}
