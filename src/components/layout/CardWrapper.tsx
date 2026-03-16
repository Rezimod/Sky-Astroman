import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardWrapperProps {
  children: ReactNode
  className?: string
  glow?: 'gold' | 'cyan' | 'none'
}

export default function CardWrapper({ children, className, glow = 'none' }: CardWrapperProps) {
  return (
    <div
      className={clsx(
        'glass-card p-4 sm:p-5',
        glow === 'gold' && 'glow-gold',
        glow === 'cyan' && 'glow-cyan',
        className
      )}
    >
      {children}
    </div>
  )
}
