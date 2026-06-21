'use client'

import { useEffect } from 'react'

// Pre-fetch all main APIs on page load so data is cached before navigation
export default function Warmup() {
  useEffect(() => {
    // Pre-fetch main dashboard data
    fetch('/api/all-monthly-reports?limit=6').catch(() => {})
    fetch('/api/categories').catch(() => {})

    // Keep connection alive every 45 seconds
    const interval = setInterval(() => {
      fetch('/api/warmup').catch(() => {})
    }, 45_000)

    return () => clearInterval(interval)
  }, [])

  return null
}
