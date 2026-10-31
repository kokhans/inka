import Link from 'next/link'
import type { ReactNode } from 'react'

type AppLinkProps = {
  href: string
  children: ReactNode
  className?: string
}

export function AppLink({ href, children, className }: AppLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
