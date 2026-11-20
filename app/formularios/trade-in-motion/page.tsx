import type { Metadata } from 'next'
import CandidateForm from '@/components/tn-candidate-form'
import './form.css'

export const metadata: Metadata = {
  title: 'Cuestionario TN | Visa Master · Trade in Motion',
  description: 'Cuestionario privado de preparación para DS-160. Guarda avances y envía respuestas a Visa Master.',
  robots: { index: false, follow: false },
}
export default function TradeInMotionQuestionnairePage() {
  return <CandidateForm />
}
