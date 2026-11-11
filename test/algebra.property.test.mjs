/**
 * Property tests for the layout algebra.
 *
 * Each example test in model.test.ts checks a case I thought of. These check the invariants that
 * must hold for *any* tree the plugin can end up with, including trees that arrive from a damaged or
 * hand-edited payload — the same door through which the trim defect was found.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mvClampRatio,
  mvLeaves,
  mvLeafCount,
  mvLeafById,
  mvPreset,
  mvSanitize,
  mvShapeTo,
  mvResize,
  mvRemoveLeaf,
  mvSwapSessions,
  mvWithSession,
  mvNeighbour,
  mvArrangementKey,
  mvSessionSet,
  mvReconcileTree,
  mvDedupeViews,
} from '../src/client/model.ts'

const MAX_PANES = 4
const MIN_PANES = 2
const RATIO_MIN = 0.2
const RATIO_MAX = 0.8

function makeRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const between = (random, low, high) => low + Math.floor(random() * (high - low + 1))

/** Random tree, deliberately including junk: duplicate ids, wild ratios, 1-6 leaves. */
function randomTree(random, options = {}) {
  const count = options.count ?? between(random, 1, 6)
  const leaves = Array.from({ length: count }, (_, index) => ({
    kind: 'leaf',
    id: options.uniqueIds === false && index > 0 && random() < 0.2 ? 'p1' : 'p' + index,
    sessionId: random() < 0.8 ? 's' + between(random, 0, 5) : null,
  }))
  const build = (items) => {
    if (items.length === 1) return items[0]
    const cut = 1 + Math.floor(random() * (items.length - 1))
    const ratio = options.wildRatios === false ? 0.5 : Math.round(random() * 100) / 100
    return {
      kind: 'split',
      id: 'r' + between(random, 100, 999),
      dir: random() < 0.5 ? 'row' : 'col',
      ratio,
      a: build(items.slice(0, cut)),
      b: build(items.slice(cut)),
    }
  }
  return build(leaves)
}

const ids = (tree) => mvLeaves(tree, []).map((leaf) => leaf.id)

test('a sanitized tree is legal: bounded panes, unique ids and sessions, clamped ratios', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random, { uniqueIds: false, wildRatios: true }))
    const leaves = mvLeaves(tree, [])

    assert.ok(leaves.length >= MIN_PANES && leaves.length <= MAX_PANES, `seed ${seed}: pane count stays in range (${leaves.length})`)
    assert.equal(mvLeafCount(tree), leaves.length, `seed ${seed}: both counters agree`)
    assert.equal(new Set(ids(tree)).size, leaves.length, `seed ${seed}: pane ids are unique`)

    const sessions = leaves.map((leaf) => leaf.sessionId).filter((id) => id !== null)
    assert.equal(new Set(sessions).size, sessions.length, `seed ${seed}: one conversation per pane`)

    const walk = (node) => {
      if (node === null || node === undefined || node.kind !== 'split') return
      assert.ok(node.ratio >= RATIO_MIN && node.ratio <= RATIO_MAX, `seed ${seed}: ratio ${node.ratio} is clamped`)
      walk(node.a)
      walk(node.b)
    }
    walk(tree)
  }
})

test('sanitizing is idempotent, so a reload cannot keep mutating the layout', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const once = mvSanitize(randomTree(random, { uniqueIds: false }))
    const twice = mvSanitize(once)
    assert.equal(mvArrangementKey(once), mvArrangementKey(twice), `seed ${seed}: arrangement is stable`)
    assert.deepEqual(ids(twice), ids(once), `seed ${seed}: pane ids are stable`)
    assert.deepEqual(twice, once, `seed ${seed}: the second pass changes nothing`)
  }
})

test('every preset has exactly the panes it promises', () => {
  for (const count of [2, 3, 4]) {
    const tree = mvPreset(count)
    assert.equal(mvLeafCount(tree), count, `${count}-pane preset has ${count} panes`)
    assert.equal(mvSanitize(tree).kind === undefined ? 'ok' : 'ok', 'ok')
    assert.deepEqual(ids(mvSanitize(tree)).length, count, `${count}-pane preset survives sanitizing`)
  }
})

test('resizing only clamps the ratio it was given', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const splits = []
    const walk = (node) => {
      if (node === null || node === undefined || node.kind !== 'split') return
      splits.push(node)
      walk(node.a)
      walk(node.b)
    }
    walk(tree)
    const target = splits[between(random, 0, splits.length - 1)]
    const wanted = Math.round(random() * 200) / 100
    const resized = mvResize(tree, target.id, wanted)

    assert.deepEqual(ids(resized), ids(tree), `seed ${seed}: resizing keeps every pane`)
    const after = []
    const walk2 = (node) => {
      if (node === null || node === undefined || node.kind !== 'split') return
      after.push(node)
      walk2(node.a)
      walk2(node.b)
    }
    walk2(resized)
    for (let index = 0; index < splits.length; index += 1) {
      const before = splits[index]
      const now = after[index]
      if (before.id === target.id) {
        assert.equal(now.ratio, mvClampRatio(wanted), `seed ${seed}: the target takes the clamped value`)
      } else {
        assert.equal(now.ratio, before.ratio, `seed ${seed}: other dividers keep their ratio`)
      }
    }
  }
})

test('removing a pane drops exactly one pane and promotes its sibling', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize({ kind: 'split', id: 'r0', dir: 'row', ratio: 0.5, a: randomTree(random), b: randomTree(random) })
    const before = ids(tree)
    if (before.length <= MIN_PANES) continue
    const victim = before[between(random, 0, before.length - 1)]
    const after = mvRemoveLeaf(tree, victim)

    assert.equal(mvLeafCount(after), before.length - 1, `seed ${seed}: one pane fewer`)
    assert.ok(!ids(after).includes(victim), `seed ${seed}: the pane is gone`)
    assert.deepEqual(mvSanitize(after), after, `seed ${seed}: the result needs no repair`)
  }
})

test('swapping keeps the same set of conversations and the same panes', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const leaves = mvLeaves(tree, [])
    if (leaves.length < 2) continue
    const first = leaves[between(random, 0, leaves.length - 1)]
    const second = leaves[between(random, 0, leaves.length - 1)]
    const swapped = mvSwapSessions(tree, first.id, second.id)

    assert.deepEqual(ids(swapped), ids(tree), `seed ${seed}: panes keep their identities`)
    assert.equal(mvSessionSet(swapped).split(',').filter(Boolean).length, mvSessionSet(tree).split(',').filter(Boolean).length, `seed ${seed}: the set of conversations is unchanged`)
    const sessions = mvLeaves(swapped, []).map((leaf) => leaf.sessionId).filter((id) => id !== null)
    assert.equal(new Set(sessions).size, sessions.length, `seed ${seed}: no conversation is duplicated by a swap`)
  }
})

test('navigating panes is a cycle that visits every pane exactly once', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const order = ids(tree)
    if (order.length === 0) continue
    const seen = [order[0]]
    let current = order[0]
    for (let step = 1; step < order.length; step += 1) {
      current = mvNeighbour(tree, current, 1)
      seen.push(current)
    }
    assert.equal(new Set(seen).size, order.length, `seed ${seed}: every pane is reached`)
    assert.equal(mvNeighbour(tree, current, 1), order[0], `seed ${seed}: the walk returns to the start`)

    /* And backwards is the exact inverse. */
    let back = order[0]
    for (let step = 0; step < order.length; step += 1) back = mvNeighbour(tree, back, -1)
    assert.equal(back, order[0], `seed ${seed}: walking back lands where it started`)
  }
})

test('reconciling with nothing to repair is the identity', () => {
  for (let seed = 1; seed <= 150; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const kept = mvReconcileTree(tree, (sessionId) => sessionId)
    assert.deepEqual(kept, tree, `seed ${seed}: an unchanged host leaves the layout alone`)

    /* Losing one conversation clears exactly its panes and keeps the shape. */
    const victim = mvLeaves(tree, []).find((leaf) => leaf.sessionId !== null)
    if (victim === undefined) continue
    const cleared = mvReconcileTree(tree, (sessionId) => (sessionId === victim.sessionId ? null : sessionId))
    const clearedLeaves = mvLeaves(cleared, [])
    assert.equal(clearedLeaves.length, mvLeaves(tree, []).length, `seed ${seed}: the shape is kept`)
    for (const leaf of clearedLeaves) {
      assert.notEqual(leaf.sessionId, victim.sessionId, `seed ${seed}: the lost conversation is gone`)
    }
  }
})

test('shaping keeps the watched conversation whenever it can', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const leaves = mvLeaves(tree, [])
    const focused = leaves[between(random, 0, leaves.length - 1)]
    const target = between(random, MIN_PANES, MAX_PANES)
    const shaped = mvShapeTo(tree, target, focused.id)
    const shapedLeaves = mvLeaves(shaped, [])

    assert.equal(shapedLeaves.length, target, `seed ${seed}: the requested shape is produced`)
    /* Shaping rebuilds a preset, so pane ids are renumbered — what must survive is the conversation
       you were looking at, which is the actual promise of shrinking a split. */
    if (focused.sessionId !== null) {
      const sessions = shapedLeaves.map((leaf) => leaf.sessionId)
      assert.ok(
        sessions.includes(focused.sessionId),
        `seed ${seed}: the watched conversation (${focused.sessionId}) survives shaping to ${target}`,
      )
    }
  }
})

test('deduplicating saved splits never prefers an unnamed entry over a named one', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const key = mvArrangementKey(tree)
    const views = []
    const count = between(random, 2, 5)
    for (let index = 0; index < count; index += 1) {
      const named = random() < 0.5
      views.push({
        id: 'v' + index,
        name: named ? 'name' + index : key,
        customName: named ? 'name' + index : undefined,
        layout: index === 0 ? tree : mvSanitize(randomTree(random)),
        savedAt: index,
      })
    }
    const deduped = mvDedupeViews(views)
    const groups = new Map()
    for (const view of deduped) {
      const groupKey = mvArrangementKey(view.layout)
      groups.set(groupKey, (groups.get(groupKey) ?? 0) + 1)
    }
    for (const [groupKey, size] of groups) {
      assert.equal(size, 1, `seed ${seed}: one entry per arrangement (${groupKey})`)
    }
    /* A named entry survives every group it belongs to. */
    for (const view of views.filter((entry) => entry.customName !== undefined)) {
      const groupKey = mvArrangementKey(view.layout)
      const survivor = deduped.find((entry) => mvArrangementKey(entry.layout) === groupKey)
      if (survivor !== undefined) {
        const siblings = views.filter((entry) => mvArrangementKey(entry.layout) === groupKey)
        const namedSiblings = siblings.filter((entry) => entry.customName !== undefined)
        if (namedSiblings.length === 1) {
          assert.equal(survivor.customName, view.customName, `seed ${seed}: the only named entry survives its group`)
        }
      }
    }
  }
})

test('binding leaves the other panes alone', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const random = makeRandom(seed)
    const tree = mvSanitize(randomTree(random))
    const leaves = mvLeaves(tree, [])
    const target = leaves[between(random, 0, leaves.length - 1)]
    const bound = mvWithSession(tree, target.id, 'fresh')
    const after = mvLeaves(bound, [])

    assert.deepEqual(ids(bound), ids(tree), `seed ${seed}: binding keeps every pane`)
    for (const leaf of after) {
      if (leaf.id === target.id) {
        assert.equal(leaf.sessionId, 'fresh', `seed ${seed}: the target pane is bound`)
      } else {
        const before = leaves.find((item) => item.id === leaf.id)
        assert.equal(leaf.sessionId, before.sessionId, `seed ${seed}: pane ${leaf.id} is untouched`)
      }
    }
    assert.equal(mvLeafById(bound, target.id).sessionId, 'fresh', `seed ${seed}: lookup agrees with the walk`)
  }
})
