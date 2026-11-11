#!/usr/bin/env node
/**
 * Release self-check: manifest contract, artifact sanity, copy parity, budget.
 *
 * Runs with no dependencies and exits non-zero on the first failing check so CI
 * (or a human) can rely on it before packing.
 */
import { readFileSync, statSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const failures = []
const notes = []

function fail(message) {
  failures.push(message)
}

function ok(condition, message) {
  if (!condition) fail(message)
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

// ---- manifest -----------------------------------------------------------------
ok(pkg.name === 'dsh-multiview', 'package name must be dsh-multiview')
ok(typeof pkg.version === 'string' && /^\d+\.\d+\.\d+$/.test(pkg.version), 'version must be semver')
ok(pkg.license === 'MIT', 'license must be MIT')
ok(pkg.engines !== undefined && typeof pkg.engines.dsh === 'string', 'engines.dsh is required')
/* The range must accept every version this project is verified on, and must
   not accept a line we have never run. Measured with a local implementation of
   node-semver's prerelease rule, because a copied string cannot catch the trap
   where `>=0.2.1-rc.5 <0.3.0` silently drops 0.2.2-rc.1. */
const parseVersion = (text) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(text)
  if (match === null) return null
  return {
    parts: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] === undefined ? [] : match[4].split('.'),
  }
}
const compareVersion = (a, b) => {
  for (let index = 0; index < 3; index += 1) {
    if (a.parts[index] !== b.parts[index]) return a.parts[index] < b.parts[index] ? -1 : 1
  }
  /* A version without a prerelease outranks the same version with one. */
  if (a.pre.length === 0 && b.pre.length === 0) return 0
  if (a.pre.length === 0) return 1
  if (b.pre.length === 0) return -1
  const length = Math.max(a.pre.length, b.pre.length)
  for (let index = 0; index < length; index += 1) {
    const left = a.pre[index]
    const right = b.pre[index]
    if (left === undefined) return -1
    if (right === undefined) return 1
    const leftNumeric = /^\d+$/.test(left)
    const rightNumeric = /^\d+$/.test(right)
    if (leftNumeric && rightNumeric) {
      if (Number(left) !== Number(right)) return Number(left) < Number(right) ? -1 : 1
      continue
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    if (left !== right) return left < right ? -1 : 1
  }
  return 0
}
const satisfiesRange = (version, range) => {
  const target = parseVersion(version)
  if (target === null) return false
  return range.split('||').some((branch) => {
    const comparators = branch.trim().split(/\s+/).filter(Boolean)
    /* Semver only lets a prerelease match a set that mentions its tuple. */
    const sameTuple = comparators.some((comparator) => {
      const operand = parseVersion(comparator.replace(/^[<>=]+/, ''))
      return operand !== null && operand.pre.length > 0 && operand.parts.every((part, index) => part === target.parts[index])
    })
    if (target.pre.length > 0 && !sameTuple) return false
    return comparators.every((comparator) => {
      const operator = (/^[<>=]+/.exec(comparator) ?? [''])[0]
      const operand = parseVersion(comparator.slice(operator.length))
      if (operand === null) return false
      const order = compareVersion(target, operand)
      if (operator === '>=') return order >= 0
      if (operator === '>') return order > 0
      if (operator === '<=') return order <= 0
      if (operator === '<') return order < 0
      return order === 0
    })
  })
}
const engineRange = pkg.engines?.dsh ?? ''
ok(satisfiesRange('0.2.1-rc.5', engineRange), 'engines.dsh must accept 0.2.1-rc.5, a version this build is verified on')
ok(satisfiesRange('0.2.2-rc.1', engineRange), 'engines.dsh must accept 0.2.2-rc.1 (the prerelease trap: a plain >=0.2.1-rc.5 <0.3.0 rejects it)')
ok(satisfiesRange('0.2.2', engineRange), 'engines.dsh must accept the 0.2.2 final release')
ok(!satisfiesRange('0.3.0-rc.1', engineRange), 'engines.dsh must not accept an untested 0.3 prerelease')
ok(!satisfiesRange('0.3.0', engineRange), 'engines.dsh must not accept 0.3.0')
ok(!satisfiesRange('0.1.9', engineRange), 'engines.dsh must not accept a pre-0.2 line')
ok(engineRange.includes('<0.2.2-0') && engineRange.includes('<0.2.3-0'), 'engines.dsh must enumerate each prerelease line explicitly')
ok(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'bundle patch must be ./cordis.patch.yml')
ok(pkg.dsh?.client?.platform === 'web', 'client platform must be web')
ok(pkg.dsh?.client?.immediately === true, 'client must load immediately')
ok(pkg.type === 'module', 'package must be ESM')
for (const field of ['index.js', 'client.js', 'cordis.patch.yml']) {
  ok(pkg.files?.includes(field), `files must publish ${field}`)
}

// ---- artifacts ----------------------------------------------------------------
const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
const host = readFileSync(join(ROOT, 'index.js'), 'utf8')
const clientBytes = statSync(join(ROOT, 'client.js')).size
ok(client.includes("window.__ModuleLoader__.load({"), 'client.js must register through __ModuleLoader__')
ok(client.includes("id: 'dsh-multiview'"), 'client.js loader id must equal the package name')
ok(/return \{ inject: MV_INJECT, apply \}/.test(client), 'client.js must export inject/apply')
ok(!/\beval\s*\(/.test(client), 'client.js must not call eval')
ok(!/new Function\s*\(/.test(client), 'client.js must not build functions from strings')
ok(!/XMLHttpRequest/.test(client), 'client.js must not perform network requests')
/* Exactly one external endpoint is sanctioned: the public registry, used only to
   learn the latest published version. Everything else must stay same-origin on
   the market API. The market's own package query was measured at 40-75 s and
   returned latestVersion: null, which made every update check fail. */
const ALLOWED_EXTERNAL = 'https://registry.npmjs.org/dsh-multiview/latest'
const withoutAllowed = client.split(ALLOWED_EXTERNAL).join('')
ok(!/https?:\/\//.test(withoutAllowed.replace(/https?:\/\/[^\s'"]*schema[^\s'"]*/g, '')), 'client.js must not embed endpoints other than the registry fallback')
ok(client.includes(ALLOWED_EXTERNAL), 'the registry fallback endpoint must be present')
ok((client.match(/registry\.npmjs\.org/g) ?? []).length === 1, 'client.js must reference the registry exactly once')
const fetchCalls = (client.match(/\bfetch\(/g) ?? []).length
ok(fetchCalls <= 3, `client.js may only talk to the market API and the registry (found ${fetchCalls} fetch calls)`)
ok(
  fetchCalls === 0 || client.includes('/dsh-market/api/v1/capabilities'),
  'network access must stay on the plugin market same-origin API',
)
ok(
  client.includes(`const MV_PLUGIN_VERSION = '${pkg.version}'`),
  'client.js version constant must equal package.json version',
)
ok(clientBytes < 160 * 1024, `client.js is ${clientBytes} bytes, over the 160 KiB budget`)
ok(host.includes('export function apply'), 'index.js must export a Host apply')
ok(readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8').includes("name: 'dsh-multiview'"), 'patch row must name the package')

// ---- copy ---------------------------------------------------------------------
const css = /const MV_CSS = `([\s\S]*?)`;?/.exec(client)
ok(css !== null, 'client.js must ship its stylesheet inline')
if (css !== null) {
  const styles = css[1]
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(styles), 'stylesheet must not hard-code hex colours')
  ok(!/rgb\(/.test(styles), 'stylesheet must not hard-code rgb colours')
  ok(styles.includes('var(--dsw-alias-'), 'stylesheet must use theme alias tokens')
}

const zh = JSON.parse(readFileSync(join(ROOT, 'locale', 'zh.json'), 'utf8'))
const en = JSON.parse(readFileSync(join(ROOT, 'locale', 'en.json'), 'utf8'))
ok(typeof zh.meta?.title === 'string' && zh.meta.title.length > 0, 'zh meta.title is required')
ok(typeof en.meta?.title === 'string' && en.meta.title.length > 0, 'en meta.title is required')

const dictOf = (name) => {
  const start = client.indexOf(`const ${name} = {`)
  if (start < 0) return null
  const lines = client.slice(start).split('\n')
  const keys = []
  for (const line of lines.slice(1)) {
    if (/^\}/.test(line)) break
    const match = /^\s+([A-Za-z][A-Za-z0-9_]*)\s*:/.exec(line)
    if (match !== null) keys.push(match[1])
  }
  return keys.length === 0 ? null : keys.sort()
}
const zhKeys = dictOf('MV_ZH')
const enKeys = dictOf('MV_EN')
ok(zhKeys !== null && enKeys !== null, 'both dictionaries must be present in client.js')
if (zhKeys !== null && enKeys !== null) {
  /* Every key the code asks for must exist in BOTH dictionaries. A missing key renders as the
     raw identifier in production, and no test would notice because the fake host returns the key
     itself — so this is checked statically. */
  const usedKeys = new Set()
  for (const match of client.matchAll(/\bT\('([A-Za-z][A-Za-z0-9]*)'\)/g)) usedKeys.add(match[1])
  for (const match of client.matchAll(/labelKey:\s*'([A-Za-z][A-Za-z0-9]*)'/g)) usedKeys.add(match[1])
  const zhList = zhKeys ?? []
  const enList = enKeys ?? []
  for (const key of usedKeys) {
    ok(zhList.includes(key), `T('${key}') is not in the zh dictionary, so it would render as the raw key`)
    ok(enList.includes(key), `T('${key}') is not in the en dictionary, so it would render as the raw key`)
  }
  notes.push(`${zhKeys.length} copy keys, zh/en parity ok`)
  notes.push(`${usedKeys.size} requested copy keys all declared`)

  ok(zhKeys.length >= 20, `zh dictionary looks incomplete (${zhKeys.length} keys)`)
  ok(
    JSON.stringify(zhKeys) === JSON.stringify(enKeys),
    `zh and en dictionaries must declare the same keys (zh=${zhKeys.length} [${zhKeys.join(',')}] en=${enKeys.length} [${enKeys.join(',')}])`,
  )
} else {
  ok(false, `dictionary extraction failed (zh=${zhKeys === null ? 'missing' : 'ok'}, en=${enKeys === null ? 'missing' : 'ok'})`)
}

// ---- documentation drift -------------------------------------------------------
// Two classes of mistake have shipped before: a doc quoting an engine range that the
// manifest no longer declares, and a one-liner that exists in three places (manifest,
// marketplace entry, README) drifting apart. Both are cheap to catch here.
{
  const engineRange = pkg.engines?.dsh
  ok(typeof engineRange === 'string' && engineRange.length > 0, 'package.json must declare engines.dsh')
  if (typeof engineRange === 'string') {
    for (const file of ['docs/DESIGN.md', 'docs/RELEASE_ACCEPTANCE.md']) {
      const text = readFileSync(join(ROOT, file), 'utf8')
      ok(
        text.includes(engineRange),
        `${file} must quote the exact engines.dsh range (${engineRange}); update it when the manifest changes`,
      )
    }
  }

  const description = pkg.description
  ok(typeof description === 'string' && description.length > 30, 'package.json needs a real description')
  const entryPath = join(ROOT, '.dev/market/Awenforever__dsh-multiview.yml')
  if (existsSync(entryPath)) {
    const entry = readFileSync(entryPath, 'utf8')
    ok(
      entry.includes(description),
      'the marketplace entry description drifted from package.json.description',
    )
  }
  for (const file of ['README.md', 'README.zh.md']) {
    const text = readFileSync(join(ROOT, file), 'utf8')
    if (file === 'README.md') {
      ok(text.includes(description), 'README.md does not carry the package.json.description sentence')
    }
  }
}

// ---- single source of truth, and two token names that have been written wrong ---------
{
  const stage = readFileSync(join(ROOT, 'src/client/stage.ts'), 'utf8')
  ok(
    !/===\s*'waiting'[^\n]*\|\|[^\n]*===\s*'unread'|===\s*'unread'[^\n]*\|\|[^\n]*===\s*'waiting'/.test(stage),
    'stage.ts must not re-implement the attention rule; call mvNeedsAttention (model.ts) instead',
  )

  /* Both of these were real mistakes: the warning token is `state-warn-primary` (not
     `state-warning-primary`) and there is no `bg-layer-4`. A wrong name silently falls back
     to another colour, which is worse than a build error. */
  const shipped = readFileSync(join(ROOT, 'client.js'), 'utf8')
  for (const bad of ['state-warning-', 'bg-layer-4']) {
    ok(!shipped.includes(bad), `client.js references "${bad}", which is not a theme token the host provides`)
  }
}

// ---- report -------------------------------------------------------------------
if (failures.length > 0) {
  for (const message of failures) console.error('FAIL ' + message)
  process.exit(1)
}
for (const note of notes) console.log('ok   ' + note)
console.log(`ok   client.js ${clientBytes} bytes, manifest, patch and copy verified`)
