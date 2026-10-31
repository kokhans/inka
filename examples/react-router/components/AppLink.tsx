import { Link } from 'react-router'
import type { ReactNode } from 'react'

type AppLinkProps = {
  href: string
  children: ReactNode
  className?: string
}

export function AppLink({ href, children, className }: AppLinkProps) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  )
}
