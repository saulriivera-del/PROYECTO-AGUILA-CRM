import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal Empresarial | Visa Master',
  description: 'Seguimiento corporativo de trámites Visa Master',
}

export default function EmpresasLayout({ children }: { children: React.ReactNode }) {
  return children
}
