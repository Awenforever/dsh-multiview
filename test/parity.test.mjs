import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/host-geometry.json', import.meta.url), 'utf8'))
const chrome = readFileSync(new URL('../src/client/chrome.ts', import.meta.url), 'utf8')


/** Read one rule's declarations out of the plugin stylesheet. */
function declarationsOf(selector) {
  const pattern = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')
  const match = pattern.exec(chrome)
  assert.ok(match !== null, selector + ' must have a style rule')
  const found = {}
  for (const part of match[1].split(';')) {
    const index = part.indexOf(':')
    if (index === -1) continue
    found[part.slice(0, index).trim()] = part.slice(index + 1).trim()
  }
  return found
}

for (const [group, spec] of Object.entries(fixture)) {
  if (group.startsWith('_')) continue

  test(`the injected ${group} declares the host's geometry`, () => {
    const ours = declarationsOf(spec.ourSelector)
    /* Every geometry property the host sets must be present with the same value. A property the
       host leaves at its default may be declared by us as that default. */
    for (const [property, value] of Object.entries(spec.declarations)) {
      assert.equal(
        ours[property],
        value,
        `${spec.ourSelector} must declare ${property}: ${value} to match ${spec.hostSelector} (got ${ours[property]})`,
      )
    }
  })
}

test('the plugin does not add geometry the host does not have', () => {
  /* Extra declarations that change layout would move the control even if every host value matched.
     Only presentation the host leaves to the cascade (or that a button must opt back into, such as
     the inherited font) may be added. */
  const presentational = new Set(['border', 'background', 'color', 'cursor', 'font-family', 'justify-content'])
  for (const [group, spec] of Object.entries(fixture)) {
    if (group.startsWith('_')) continue
    const allowed = new Set([...Object.keys(spec.declarations), ...presentational])
    for (const property of Object.keys(declarationsOf(spec.ourSelector))) {
      assert.ok(allowed.has(property), `${spec.ourSelector} declares ${property}, which ${spec.hostSelector} does not; justify it`)
    }
  }
})
