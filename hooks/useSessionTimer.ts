import { useState, useEffect } from 'react'

export function useSessionTimer(startTime: string | null, endTime: string | null = null) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return

    const start = new Date(startTime).getTime()
    
    // If the session has ended, show the final static duration
    if (endTime) {
      setElapsed(Math.floor((new Date(endTime).getTime() - start) / 1000))
      return
    }

    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }

    tick() // immediate first tick
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startTime, endTime])

  return elapsed // total seconds
}
