'use client'

import { motion } from 'framer-motion'

const TRANSITION = { duration: 0.18, ease: 'easeOut' as const }

export function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function FadeSlideSwap({
  swapKey,
  children,
  className,
}: {
  swapKey: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      key={swapKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION}
      className={className}
    >
      {children}
    </motion.div>
  )
}
