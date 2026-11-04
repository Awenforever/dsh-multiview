/**
 * Layout algebra tests: presets, invariants, edits, repair, navigation.
 * Run with `node --test test/model.test.ts`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mvClampRatio,
  mvLeafCount,
  mvLeaves,
  mvLeafById,
  mvNeighbour,
  mvPreset,
  mvReconcileTree,
  mvRemoveLeaf,
  mvResize,
  mvSanitize,
  mvShapeTo,
  mvSwapSessions,
  mvWithSession,
} from '../src/client/model.ts'

/** Every leaf in reading order, as `[paneId, sessionId]` tuples. */
function bindings(node) {
  return mvLeaves(node).map((leaf) => [leaf.id, leaf.sessionId])
}

test('presets carry the requested pane count and unique identities', () => {
  for (const count of [2, 3, 4]) {
    const tree = mvPreset(count)
    const leaves = mvLeaves(tree)
    assert.equal(leaves.length, count)
    assert.equal(new Set(leaves.map((leaf) => leaf.id)).size, count)
    assert.ok(leaves.every((leaf) => leaf.sessionId === null))
  }
})

test('two-pane preset splits left and right evenly', () => {
  const tree = mvPreset(2)
  assert.equal(tree.kind, 'split')
  assert.equal(tree.dir, 'row')
  assert.equal(tree.ratio, 0.5)
  assert.deepEqual(bindings(tree), [['p1', null], ['p2', null]])
})

test('three-pane preset is one primary column plus two stacked panes', () => {
  const tree = mvPreset(3)
  assert.equal(tree.dir, 'row')
  assert.equal(tree.b.dir, 'col')
  assert.deepEqual(bindings(tree), [['p1', null], ['p2', null], ['p3', null]])
})

test('four-pane preset is a balanced 2x2', () => {
  const tree = mvPreset(4)
  assert.equal(tree.a.dir, 'col')
  assert.equal(tree.b.dir, 'col')
  assert.deepEqual(bindings(tree), [['p1', null], ['p2', null], ['p3', null], ['p4', null]])
})

test('switching shape carries bound sessions in reading order', () => {
  let tree = mvWithSession(mvPreset(2), 'p1', 'a')
  tree = mvWithSession(tree, 'p2', 'b')
  const three = mvShapeTo(tree, 3)
  assert.deepEqual(bindings(three), [['p1', 'a'], ['p2', 'b'], ['p3', null]])
  const back = mvShapeTo(three, 2)
  assert.deepEqual(bindings(back), [['p1', 'a'], ['p2', 'b']])
})

test('a session lives in exactly one pane', () => {
  let tree = mvPreset(2)
  tree = mvWithSession(tree, 'p1', 'a')
  tree = mvWithSession(tree, 'p2', 'a')
  assert.deepEqual(bindings(tree), [['p1', null], ['p2', 'a']])
})

test('swapping exchanges only the two panes', () => {
  let tree = mvPreset(4)
  tree = mvWithSession(tree, 'p1', 'a')
  tree = mvWithSession(tree, 'p2', 'b')
  tree = mvWithSession(tree, 'p3', 'c')
  const swapped = mvSwapSessions(tree, 'p1', 'p3')
  assert.deepEqual(bindings(swapped), [['p1', 'c'], ['p2', 'b'], ['p3', 'a'], ['p4', null]])
  assert.equal(mvSwapSessions(tree, 'p1', 'p9'), tree)
  assert.equal(mvSwapSessions(tree, 'p1', 'p1'), tree)
})

test('resize clamps to the contract range', () => {
  assert.equal(mvClampRatio(0), 0.22)
  assert.equal(mvClampRatio(1), 0.78)
  assert.equal(mvClampRatio(Number.NaN), 0.5)
  const tree = mvPreset(3)
  assert.equal(mvResize(tree, tree.id, 0.9).ratio, 0.78)
  assert.equal(mvResize(tree, 'missing', 0.9), tree)
})

test('removing a pane promotes its sibling', () => {
  let tree = mvPreset(4)
  tree = mvWithSession(tree, 'p1', 'a')
  const three = mvRemoveLeaf(tree, 'p3')
  assert.equal(mvLeafCount(three), 3)
  assert.deepEqual(mvLeaves(three).map((leaf) => leaf.id), ['p1', 'p2', 'p4'])
  const two = mvRemoveLeaf(three, 'p4')
  assert.equal(mvLeafCount(two), 2)
  assert.equal(mvRemoveLeaf(mvRemoveLeaf(two, 'p1'), 'p2'), null)
})

test('sanitize accepts a good tree and repairs ratios', () => {
  const recovered = mvSanitize({ kind: 'split', id: 's1', dir: 'row', ratio: 9, a: { kind: 'leaf', id: 'p1', sessionId: 'a' }, b: { kind: 'leaf', id: 'p2', sessionId: null } })
  assert.notEqual(recovered, null)
  assert.equal(recovered.ratio, 0.78)
  assert.deepEqual(bindings(recovered), [['p1', 'a'], ['p2', null]])
})

test('sanitize rejects junk and truncates oversized trees', () => {
  assert.equal(mvSanitize(null), null)
  assert.equal(mvSanitize({ kind: 'leaf' }), null)
  assert.equal(mvSanitize({ kind: 'split', dir: 'row', ratio: 0.5, a: { kind: 'leaf', id: 'p1', sessionId: null }, b: { kind: 'nope' } }), null)
  const wide = {
    kind: 'split',
    id: 's1',
    dir: 'row',
    ratio: 0.5,
    a: { kind: 'split', id: 's2', dir: 'row', ratio: 0.5, a: { kind: 'leaf', id: 'a1', sessionId: 'a' }, b: { kind: 'leaf', id: 'a2', sessionId: 'b' } },
    b: { kind: 'split', id: 's3', dir: 'row', ratio: 0.5, a: { kind: 'split', id: 's4', dir: 'row', ratio: 0.5, a: { kind: 'leaf', id: 'b1', sessionId: 'c' }, b: { kind: 'leaf', id: 'b2', sessionId: 'd' } }, b: { kind: 'leaf', id: 'b3', sessionId: 'e' } },
  }
  const repaired = mvSanitize(wide)
  assert.ok(mvLeafCount(repaired) <= 4)
})

test('sanitize gives duplicated pane identities fresh ones', () => {
  const tree = mvSanitize({
    kind: 'split',
    id: 's1',
    dir: 'row',
    ratio: 0.5,
    a: { kind: 'leaf', id: 'p1', sessionId: 'a' },
    b: { kind: 'leaf', id: 'p1', sessionId: 'b' },
  })
  const ids = mvLeaves(tree).map((leaf) => leaf.id)
  assert.equal(new Set(ids).size, 2)
})

test('reconcile clears vanished sessions but keeps positions', () => {
  let tree = mvPreset(2)
  tree = mvWithSession(tree, 'p1', 'a')
  tree = mvWithSession(tree, 'p2', 'b')
  const kept = mvReconcileTree(tree, (id) => (id === 'a' ? id : null))
  assert.deepEqual(bindings(kept), [['p1', 'a'], ['p2', null]])
})

test('neighbour cycles in reading order', () => {
  const tree = mvPreset(4)
  assert.equal(mvNeighbour(tree, 'p1', 1), 'p2')
  assert.equal(mvNeighbour(tree, 'p4', 1), 'p1')
  assert.equal(mvNeighbour(tree, 'p1', -1), 'p4')
  assert.equal(mvNeighbour(mvPreset(2), 'p1', 1), 'p2')
  assert.equal(mvNeighbour({ kind: 'leaf', id: 'p1', sessionId: null }, 'p1', 1), 'p1')
})

test('leaf lookup and binding helpers agree', () => {
  const tree = mvWithSession(mvPreset(3), 'p2', 'x')
  assert.equal(mvLeafById(tree, 'p2').sessionId, 'x')
  assert.equal(mvLeafById(tree, 'missing'), undefined)
})
