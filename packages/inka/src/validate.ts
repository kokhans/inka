import type { z } from 'zod'
import { isRecord } from './shared/values.js'
import type { ValidationError } from './types.js'

export type ValidationResult =
  { ok: true; data: Record<string, unknown> } | { ok: false; errors: ValidationError[] }

export type ValidationOptions = {
  schema: z.ZodType
  data: Record<string, unknown>
  file: string
  collection: string
}

type Issue = z.core.$ZodIssue

export function validateFrontmatter(options: ValidationOptions): ValidationResult {
  const result = options.schema.safeParse(options.data)
  if (result.success) {
    return { ok: true, data: isRecord(result.data) ? result.data : {} }
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      file: options.file,
      collection: options.collection,
      field: issue.path.map(String).join('.') || 'frontmatter',
      message: describeIssue(issue, readPath(options.data, issue.path)),
    })),
  }
}

export function formatError(error: ValidationError): string {
  return `${error.file}: "${error.field}" — ${error.message}`
}

export function reportErrors(errors: ValidationError[]): void {
  for (const error of errors) {
    console.warn(`inka: ${formatError(error)}`)
  }
}

function describeIssue(issue: Issue, value: unknown): string {
  if (issue.code !== 'invalid_type') return issue.message
  return `Expected ${issue.expected}, received ${describeValue(value)}`
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function readPath(data: Record<string, unknown>, segments: (string | number | symbol)[]): unknown {
  let current: unknown = data
  for (const segment of segments) {
    if (!isRecord(current)) return undefined
    current = current[String(segment)]
  }
  return current
}
