'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ServiceAutoRefresh({
  seconds = 10,
}: {
  seconds?: number
}) {
  const router = useRouter()

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh()
    }, Math.max(5, seconds) * 1000)

    return () => window.clearInterval(id)
  }, [router, seconds])

  return null
}
