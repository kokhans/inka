import type { NextConfig } from 'next'
import { withInka } from 'inka/next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
}

export default withInka(nextConfig)
