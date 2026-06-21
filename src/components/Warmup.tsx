'use client'

import { useEffect } from 'react'

export default function Warmup() {
  useEffect(() => {
    fetch('/api/dashboard-data').catch(() => {})

    const interval = setInterval(() => {
      fetch('/api/warmup').catch(() => {})
    }, 45_000)

    return () => clearInterval(interval)
  }, [])

  return null
}
