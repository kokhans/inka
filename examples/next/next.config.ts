import type { NextConfig } from 'next'
import { withLoomark } from 'loomark/next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
}

export default withLoomark(nextConfig)
