import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Proyecto Águila | Visa Master',
  description: 'Centro de operaciones de Visa Master',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  )
}
