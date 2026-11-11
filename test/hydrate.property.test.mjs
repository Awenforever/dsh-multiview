/**
 * Property tests for hydration: the persisted document is the one input nobody validates.
 *
 * Random and deliberately malformed documents are fed to the real bundle through localStorage, and
 * the resulting state must always be one the UI can draw: legal layout, focused pane that exists,
 * preset that matches, a bounded view library, and a current view that is actually there.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bootHost, makeSessions } from './harness.mjs'

const MAX_PANES = 4
const MIN_PANES = 2
const MAX_VIEWS = 12

function makeRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
const between = (random, low, high) => low + Math.floor(random() * (high - low + 1))
const pick = (random, list) => list[between(random, 0, list.length - 1)]

/** A random tree, sometimes junk: wrong kinds, missing fields, wild ratios, duplicate ids. */
function randomLayout(random, junk) {
  const count = between(random, 1, 6)
  const leaves = Array.from({ length: count }, (_, index) => {
    const leaf = { kind: 'leaf', id: random() < 0.25 && index > 0 ? 'p0' : 'p' + index, sessionId: random() < 0.8 ? 's' + between(random, 0, 4) : null }
    if (junk && random() < 0.1) leaf.kind = 'nonsense'
    if (junk && random() < 0.1) delete leaf.sessionId
    return leaf
  })
  const build = (items) => {
    if (items.length === 1) return items[0]
    const cut = between(random, 1, items.length - 1)
    const node = {
      kind: 'split',
      id: 'r' + between(random, 1, 9),
      dir: pick(random, ['row', 'col', junk ? 'diagonal' : 'row']),
      ratio: junk ? Math.round(random() * 300) / 100 - 1 : Math.round(random() * 100) / 100,
      a: build(items.slice(0, cut)),
      b: build(items.slice(cut)),
    }
    if (junk && random() < 0.1) node.a = null
    return node
  }
  return build(leaves)
}

function randomDocument(random, junk) {
  const layout = randomLayout(random, junk)
  const views = []
  const viewCount = between(random, 0, junk ? 16 : 6)
  for (let index = 0; index < viewCount; index += 1) {
    const named = random() < 0.5
    const view = {
      id: random() < 0.2 ? 'dup' : 'v' + index,
      name: named ? 'name' + index : undefined,
      customName: named ? 'name' + index : undefined,
      layout: random() < 0.2 ? layout : randomLayout(random, junk),
      savedAt: between(random, 0, 1000),
    }
    if (junk && random() < 0.15) view.layout = null
    views.push(view)
  }
  return {
    version: junk ? pick(random, [1, 2, 3, 0, 4, null, '3']) : 3,
    layout,
    focused: random() < 0.5 ? 'p' + between(random, 0, 5) : null,
    preset: junk ? pick(random, [2, 3, 4, 99, -1, null]) : between(random, 2, 4),
    seeded: random() < 0.5,
    views,
    currentViewId: random() < 0.5 ? 'v' + between(random, 0, 20) : null,
  }
}

function leavesOf(node) {
  const out = []
  const walk = (value) => {
    if (value === null || value === undefined) return
    if (value.kind === 'leaf') { out.push(value); return }
    walk(value.a)
    walk(value.b)
  }
  walk(node)
  return out
}

function assertLegal(label, state) {
  const leaves = leavesOf(state.layout)
  assert.ok(leaves.length >= MIN_PANES && leaves.length <= MAX_PANES, `${label}: pane count ${leaves.length} is in range`)
  const ids = leaves.map((leaf) => leaf.id)
  assert.equal(new Set(ids).size, ids.length, `${label}: pane ids are unique`)
  const sessions = leaves.map((leaf) => leaf.sessionId).filter((id) => id !== null && id !== undefined)
  assert.equal(new Set(sessions).size, sessions.length, `${label}: one conversation per pane`)
  assert.ok(ids.includes(state.focused), `${label}: focus points at an existing pane`)
  assert.equal(state.preset, leaves.length, `${label}: preset matches the drawn shape`)
  assert.ok(state.maximized === null, `${label}: a reload never restores a maximize claim`)
  assert.ok(state.views.length <= MAX_VIEWS, `${label}: the library is bounded`)
  const viewIds = state.views.map((view) => view.id)
  assert.equal(new Set(viewIds).size, viewIds.length, `${label}: view ids are unique`)
  if (state.currentViewId !== null) {
    assert.ok(viewIds.includes(state.currentViewId), `${label}: the current view exists`)
  }
  for (const view of state.views) {
    const viewLeaves = leavesOf(view.layout)
    assert.ok(viewLeaves.length >= MIN_PANES && viewLeaves.length <= MAX_PANES, `${label}: view ${view.id} has a legal shape`)
    assert.equal(typeof view.name, 'string', `${label}: view ${view.id} has a name`)
  }
}

const list = makeSessions(['s1', 's2', 's3', 's4'])

test('any persisted document hydrates into a state the UI can draw', () => {
  for (let seed = 1; seed <= 150; seed += 1) {
    const random = makeRandom(seed)
    const junk = seed % 2 === 0
    const document = randomDocument(random, junk)
    let host
    try {
      host = bootHost({ sessions: list, rawSeed: JSON.stringify(document, (key, value) => (value === undefined ? null : value)) })
    } catch (error) {
      assert.fail(`seed ${seed}: hydration threw ${error && error.message}`)
    }
    assertLegal(`seed ${seed}`, host.hook.state())
  }
})

test('a corrupt or foreign document falls back instead of half-applying', () => {
  const documents = [
    'not json at all',
    '{',
    'null',
    '[]',
    '"a string"',
    '42',
    JSON.stringify({ version: 99, layout: null }),
    JSON.stringify({ version: 3, layout: { kind: 'leaf', id: 'p1', sessionId: 's1' } }),
    JSON.stringify({ version: 3, layout: { kind: 'split', id: 'r', dir: 'row', ratio: 0.5, a: null, b: null } }),
    JSON.stringify({ version: 3, layout: { kind: 'split', id: 'r', dir: 'row', ratio: 0.5, a: { kind: 'leaf', id: 'p1', sessionId: 'a' }, b: { kind: 'leaf', id: 'p2', sessionId: 'b' } }, views: 'not-an-array' }),
  ]
  for (const raw of documents) {
    const host = bootHost({ sessions: list, rawSeed: raw })
    assertLegal('corrupt ' + raw.slice(0, 24), host.hook.state())
  }
})

test('a hand-written split name survives a reload, so eviction can still protect it', () => {
  const seed = {
    version: 3,
    layout: {
      kind: 'split', id: 'r1', dir: 'row', ratio: 0.5,
      a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
      b: { kind: 'leaf', id: 'p2', sessionId: 's2' },
    },
    focused: 'p1',
    preset: 2,
    seeded: true,
    views: [
      {
        id: 'v1',
        name: '盯盘 A 组',
        customName: '盯盘 A 组',
        layout: { kind: 'split', id: 'r1', dir: 'row', ratio: 0.5, a: { kind: 'leaf', id: 'p1', sessionId: 's1' }, b: { kind: 'leaf', id: 'p2', sessionId: 's2' } },
        savedAt: 5,
      },
    ],
    currentViewId: 'v1',
  }
  const host = bootHost({ sessions: list, seed })
  const view = host.hook.state().views[0]
  assert.equal(view.customName, '盯盘 A 组', 'the typed name is still marked as typed after reload')
  assert.equal(view.name, '盯盘 A 组', 'and it is still the displayed name')
})

test('hydrating twice is stable', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const random = makeRandom(seed)
    const document = randomDocument(random, seed % 2 === 0)
    const first = bootHost({ sessions: list, rawSeed: JSON.stringify(document) }).hook.state()
    /* Re-seed with a real persisted document: the in-memory state carries fields the loader does
       not read (and lacks `version`), which would silently fall back to the default split. */
    const payload = {
      version: 3,
      layout: first.layout,
      focused: first.focused,
      preset: first.preset,
      seeded: first.seeded,
      views: first.views,
      currentViewId: first.currentViewId,
    }
    const second = bootHost({ sessions: list, seed: payload }).hook.state()
    assert.equal(JSON.stringify(second.layout), JSON.stringify(first.layout), `seed ${seed}: the layout is stable`)
    assert.equal(second.focused, first.focused, `seed ${seed}: focus is stable`)
    assert.equal(second.views.length, first.views.length, `seed ${seed}: the library does not grow on reload`)
  }
})
