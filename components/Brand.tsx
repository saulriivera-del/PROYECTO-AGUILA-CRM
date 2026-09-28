import Link from 'next/link'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/portal" className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-script">Visa</div>
      <div className="brand-master">MASTER</div>
      {!compact && <div className="brand-tagline">simplificamos tu trámite de visa</div>}
    </Link>
  )
}
