'use client'

import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export default function NumberInput(props: Props) {
  return (
    <input
      {...props}
      type="number"
      onWheel={(event) => {
        event.currentTarget.blur()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
        }
        props.onKeyDown?.(event)
      }}
    />
  )
}
