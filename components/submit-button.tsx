'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  children: React.ReactNode
  pendingText?: string
  className?: string
  disabled?: boolean
}

export default function SubmitButton({
  children,
  pendingText = 'Guardando…',
  className = 'primary-button',
  disabled = false,
}: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
    >
      {pending ? pendingText : children}
    </button>
  )
}
