#!/usr/bin/env node
import { run } from './run.js'

const exitCode = await run(process.argv.slice(2), {
  log: (message) => {
    console.log(message)
  },
  error: (message) => {
    console.error(message)
  },
  untilStopped: () =>
    new Promise((resolve) => {
      process.once('SIGINT', () => {
        resolve()
      })
      process.once('SIGTERM', () => {
        resolve()
      })
    }),
})

process.exitCode = exitCode
