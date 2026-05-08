'use client'

import { useEffect, useState } from 'react'

type AnimatedPlaceholderProps = {
  texts: string[]
  interval?: number
}

export function AnimatedPlaceholder({ texts, interval = 3000 }: AnimatedPlaceholderProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (texts.length <= 1) return

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length)
    }, interval)

    return () => clearInterval(id)
  }, [texts.length, interval])

  return (
    <div
      className="text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden text-sm leading-relaxed select-none"
      aria-hidden="true">
      <div key={texts[index]}>{texts[index]}</div>
    </div>
  )
}
