#!/usr/bin/env node
/**
 * Release self-check: manifest contract, artifact sanity, copy parity, budget.
 *
 * Runs with no dependencies and exits non-zero on the first failing check so CI
 * (or a human) can rely on it before packing.
 */
import { readFileSync, statSync } from 'node:fs'
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
ok(pkg.engines?.dsh === '>=0.2.1-rc.5 <0.2.2-0 || >=0.2.2-rc.1 <0.3.0', 'unexpected engines.dsh range')
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
ok(!/\bfetch\s*\(/.test(client), 'client.js must not perform network requests')
ok(!/XMLHttpRequest/.test(client), 'client.js must not perform network requests')
ok(!/https?:\/\//.test(client.replace(/https?:\/\/[^\s'"]*schema[^\s'"]*/g, '')), 'client.js must not embed endpoints')
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
  notes.push(`${zhKeys.length} copy keys, zh/en parity ok`)
  ok(zhKeys.length >= 20, `zh dictionary looks incomplete (${zhKeys.length} keys)`)
  ok(
    JSON.stringify(zhKeys) === JSON.stringify(enKeys),
    `zh and en dictionaries must declare the same keys (zh=${zhKeys.length} [${zhKeys.join(',')}] en=${enKeys.length} [${enKeys.join(',')}])`,
  )
} else {
  ok(false, `dictionary extraction failed (zh=${zhKeys === null ? 'missing' : 'ok'}, en=${enKeys === null ? 'missing' : 'ok'})`)
}

// ---- report -------------------------------------------------------------------
if (failures.length > 0) {
  for (const message of failures) console.error('FAIL ' + message)
  process.exit(1)
}
for (const note of notes) console.log('ok   ' + note)
console.log(`ok   client.js ${clientBytes} bytes, manifest, patch and copy verified`)
