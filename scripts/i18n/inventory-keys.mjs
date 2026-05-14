import fs from 'node:fs'
import path from 'node:path'

const codeRoots = [
  'homework-app/src',
  'homework-app-react/src',
  'homework-app-expo/src',
  'homework-app-expo/app',
]

const keyPattern = /(?:\$t|(?<![\w.])t|i18n\.t)\(\s*['"`]([A-Za-z0-9_.]+)['"`]/g

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }
    if (/\.(js|jsx|ts|tsx|vue)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

function collectCodeKeys() {
  const result = new Map()

  for (const root of codeRoots) {
    for (const file of walk(root)) {
      const source = fs.readFileSync(file, 'utf8')
      for (const match of source.matchAll(keyPattern)) {
        const key = match[1]
        if (!result.has(key)) result.set(key, new Set())
        result.get(key).add(file)
      }
    }
  }

  return result
}

function flattenObject(value, prefix = '', keys = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return keys

  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenObject(child, next, keys)
    } else {
      keys.add(next)
    }
  }

  return keys
}

async function loadLocaleModule(file) {
  const fullPath = path.resolve(file)
  return await import(`file://${fullPath}`)
}

async function main() {
  const usedKeys = collectCodeKeys()
  const mod = await loadLocaleModule('packages/shared/locales.js')
  const localeKeySets = new Map([
    ['packages/shared/locales.js', {
      en: flattenObject(mod.en),
      zh: flattenObject(mod.zh),
    }],
  ])

  const lines = ['# I18n Key Inventory', '', '## Used Keys', '']

  for (const [key, sources] of [...usedKeys.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`- \`${key}\``)
    for (const source of [...sources].sort()) {
      lines.push(`  - ${source}`)
    }
  }

  lines.push('', '## Locale Coverage', '')

  for (const [file, sets] of localeKeySets.entries()) {
    const missingInEn = [...usedKeys.keys()].filter(key => !sets.en.has(key))
    const missingInZh = [...usedKeys.keys()].filter(key => !sets.zh.has(key))
    lines.push(`### ${file}`)
    lines.push(`- Missing in en: ${missingInEn.length}`)
    lines.push(`- Missing in zh: ${missingInZh.length}`)
  }

  fs.mkdirSync('docs/superpowers/artifacts', { recursive: true })
  fs.writeFileSync('docs/superpowers/artifacts/2026-05-14-i18n-key-inventory.md', `${lines.join('\n')}\n`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
