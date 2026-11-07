import path from 'node:path'

export function slugFromFile(contentDir: string, filePath: string): string {
  const relative = path.relative(contentDir, filePath)
  const withoutExtension = relative.slice(0, -path.extname(relative).length)
  return withoutExtension.split(path.sep).join('/')
}
