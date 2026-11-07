export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
  )
}

export function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>
}

export function readField(entry: object, field: string): unknown {
  return asRecord(entry)[field]
}

export function toTime(value: unknown): number | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.getTime()
  if (typeof value === 'string') {
    const time = Date.parse(value)
    return Number.isNaN(time) ? undefined : time
  }
  return undefined
}

export function compareValues(left: unknown, right: unknown): number {
  const leftEmpty = left === undefined || left === null
  const rightEmpty = right === undefined || right === null
  if (leftEmpty || rightEmpty) return leftEmpty === rightEmpty ? 0 : leftEmpty ? 1 : -1

  const leftTime = toTime(left)
  const rightTime = toTime(right)
  if (leftTime !== undefined && rightTime !== undefined) return leftTime - rightTime

  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'string' && typeof right === 'string') {
    if (left === right) return 0
    return left < right ? -1 : 1
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return left === right ? 0 : left ? 1 : -1
  }
  return 0
}

export function equalsValue(left: unknown, right: unknown): boolean {
  if (left instanceof Date || right instanceof Date) {
    const leftTime = toTime(left)
    const rightTime = toTime(right)
    return leftTime !== undefined && leftTime === rightTime
  }
  return left === right
}

export function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}
