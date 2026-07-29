'use client'

import { useEffect } from 'react'

export default function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  size = 'large',
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  size?: 'medium' | 'large' | 'wide'
}) {
  useEffect(() => {
    if (!open) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.classList.add('modal-open')
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="crm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`crm-modal crm-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="crm-modal-header">
          <div>
            <span className="eyebrow">Proyecto Águila</span>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="crm-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="crm-modal-body">{children}</div>
      </section>
    </div>
  )
}
