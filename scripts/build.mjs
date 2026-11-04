#!/usr/bin/env node
/**
 * Zero-dependency build for the bundle's two halves.
 *
 * The Client artifact must be one file registered into the shell's module table,
 * so the sources are type-stripped with Node's own TypeScript support, their
 * line-leading `export` keywords removed (one shared factory scope), and the
 * concatenation wrapped in the loader envelope. The Host half is plain ESM.
 */
import { stripTypeScriptTypes } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
/** Concatenation order: each file may use the names declared above it. */
const CLIENT_ORDER = ['i18n', 'compat', 'chrome', 'pane', 'stage', 'index']
const CLIENT_OUT = join(ROOT, 'client.js')
const HOST_OUT = join(ROOT, 'index.js')

function strip(source) {
  return stripTypeScriptTypes(source, { mode: 'transform' }).replace(/^export\s+(?=(async\s+)?(function|class|const|let|var)\b)/gm, '')
}

function stripHost(source) {
  return stripTypeScriptTypes(source, { mode: 'transform' })
}

function buildClient() {
  const body = CLIENT_ORDER.map((name) => strip(readFileSync(join(ROOT, 'src', 'client', `${name}.ts`), 'utf8'))).join('\n')
  const out = `/**
 * dsh-multiview — Client half.
 * Generated from src/client/*.ts by scripts/build.mjs. Do not edit by hand.
 */
window.__ModuleLoader__.load({
  id: 'dsh-multiview',
  factory(require) {
    const React = require('react')
    const h = React.createElement
${body}
    return { inject: MV_INJECT, apply }
  },
})
`
  writeFileSync(CLIENT_OUT, out, 'utf8')
  return out.length
}

function buildHost() {
  const body = stripHost(readFileSync(join(ROOT, 'src', 'host', 'index.ts'), 'utf8')).trim()
  const out = `/**
 * dsh-multiview — Host half.
 * Generated from src/host/index.ts by scripts/build.mjs. Do not edit by hand.
 */
${body}
`
  writeFileSync(HOST_OUT, out, 'utf8')
  return out.length
}

const clientSize = buildClient()
const hostSize = buildHost()
console.log(`client.js ${clientSize} bytes`)
console.log(`index.js  ${hostSize} bytes`)
