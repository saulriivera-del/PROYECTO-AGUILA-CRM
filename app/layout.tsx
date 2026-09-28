import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal Empresarial | Visa Master',
  description: 'Seguimiento empresarial de trámites Visa Master',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
