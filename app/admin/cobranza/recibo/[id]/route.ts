import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { requireAuthContext } from '@/lib/auth-context'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

function money(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function paymentDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeZone: 'America/Hermosillo',
  }).format(new Date(value))
}

function safeText(value: unknown, max = 52) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params
  const context = await requireAuthContext()

  const { data: payment } = await context.supabase
    .from('payments')
    .select('id, process_id, amount, payment_method, payment_date, reference')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .single()

  if (!payment) return new Response('Pago no encontrado', { status: 404 })

  const [{ data: processData }, { data: allPayments }] = await Promise.all([
    context.supabase
      .from('processes')
      .select('id, service_name, contact_phone, clients(full_name, phone), process_charges(agreed_amount)')
      .eq('id', payment.process_id)
      .eq('organization_id', context.organizationId)
      .single(),
    context.supabase
      .from('payments')
      .select('amount')
      .eq('process_id', payment.process_id)
      .eq('organization_id', context.organizationId),
  ])

  if (!processData) return new Response('Trámite no encontrado', { status: 404 })

  const clientRelation = (processData as any).clients
  const client = Array.isArray(clientRelation) ? clientRelation[0] : clientRelation
  const chargeRelation = (processData as any).process_charges
  const charge = Array.isArray(chargeRelation) ? chargeRelation[0] : chargeRelation
  const agreed = Number(charge?.agreed_amount ?? 0)
  const paidTotal = (allPayments ?? []).reduce((sum, item: any) => sum + Number(item.amount ?? 0), 0)
  const balance = Math.max(0, agreed - paidTotal)
  const year = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'America/Hermosillo' }).format(new Date(payment.payment_date))
  const folio = `VM-${year}-${String(payment.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`

  const templatePath = path.join(process.cwd(), 'public', 'templates', 'recibo_pago_visamaster.pdf')
  const template = await readFile(templatePath)
  const pdf = await PDFDocument.load(template)
  const page = pdf.getPages()[0]
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.10, 0.13, 0.18)

  const draw = (text: string, x: number, y: number, size = 10, useBold = false) => {
    page.drawText(safeText(text), { x, y, size, font: useBold ? bold : regular, color: ink })
  }

  // Campos superiores de la plantilla Canva.
  draw(safeText(client?.full_name || 'Cliente', 46), 153, 550, 10, true)
  draw(paymentDate(payment.payment_date), 153, 529, 9)
  draw(payment.payment_method || 'Sin especificar', 153, 508, 9)
  draw(`Folio: ${folio}`, 420, 563, 8, true)
  draw(`Tel: ${processData.contact_phone || client?.phone || '—'}`, 420, 548, 8)

  // Primer renglón de servicios.
  draw(processData.service_name || 'Servicio Visa Master', 85, 448, 10, true)
  draw('1', 340, 448, 10)
  draw(money(Number(payment.amount)), 442, 448, 10, true)

  // Resumen inferior. El PDF se genera bajo demanda; no se guarda en Storage.
  draw(money(Number(payment.amount)), 500, 239, 12, true)
  draw(`Saldo pendiente: ${money(balance)}`, 365, 216, 8)
  if (payment.reference) draw(`Referencia: ${safeText(payment.reference, 28)}`, 365, 201, 8)

  const bytes = await pdf.save()
  const filename = `recibo-${folio}.pdf`
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
