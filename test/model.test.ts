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
  mvArrangementKey,
  mvDedupeViews,
  mvAttentionPanes,
  mvKeyCap,
  mvShortcutHint,
  mvTrimViews,
  mvNextAttentionPane,
  mvNeedsAttention,
  mvSessionSet,
  mvSessionState,
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

test('a session set ignores arrangement, which is what stops duplicate saved splits', () => {
  const two = mvWithSession(mvWithSession(mvPreset(2), 'p1', 'a'), 'p2', 'b')
  const swapped = mvSwapSessions(two, 'p1', 'p2')
  /* Different arrangement, same working set. */
  assert.notEqual(mvLeaves(two).map((leaf) => leaf.sessionId).join(','), mvLeaves(swapped).map((leaf) => leaf.sessionId).join(','))
  assert.equal(mvSessionSet(two), mvSessionSet(swapped))
  assert.equal(mvSessionSet(two), 'a,b')
  /* A third pane is a different set, so it earns its own entry. */
  const three = mvWithSession(mvShapeTo(two, 3), 'p3', 'c')
  assert.equal(mvSessionSet(three), 'a,b,c')
  assert.notEqual(mvSessionSet(three), mvSessionSet(two))
  /* Empty panes never contribute. */
  assert.equal(mvSessionSet(mvPreset(4)), '')
})

test('an arrangement key separates a swap from a shape change', () => {
  const two = mvWithSession(mvWithSession(mvPreset(2), 'p1', 'a'), 'p2', 'b')
  const swapped = mvSwapSessions(two, 'p1', 'p2')
  /* Same Sessions, same pane count: one arrangement, two orders. */
  assert.equal(mvArrangementKey(two), mvArrangementKey(swapped))
  assert.equal(mvArrangementKey(two), 'a,b@2')
  /* Same Sessions, more panes: a different arrangement. */
  const three = mvShapeTo(two, 3)
  assert.equal(mvArrangementKey(three), 'a,b@3')
  assert.notEqual(mvArrangementKey(three), mvArrangementKey(two))
})

test('attention excludes running, which is the agreed product rule', () => {
  const tree = mvWithSession(mvWithSession(mvPreset(3), 'p1', 'a'), 'p2', 'b')
  tree.kind === 'split' ? null : null
  const withThird = mvWithSession(tree, 'p3', 'c')
  const states = { a: 'running', b: 'waiting', c: 'idle' }
  const statusOf = (id) => states[id] ?? 'idle'

  /* Only the pane blocked on a question counts; the one producing output does not. */
  assert.deepEqual(mvAttentionPanes(withThird, statusOf), ['p2'])

  /* A split where everything is merely running asks for nothing at all. */
  const allRunning = (id) => (id === '' ? 'idle' : 'running')
  assert.deepEqual(mvAttentionPanes(withThird, allRunning), [])
  assert.equal(mvNextAttentionPane(withThird, 'p1', allRunning), null)

  /* Unread counts, and the cycle wraps back to the first candidate. */
  const unreadStates = { a: 'unread', b: 'waiting', c: 'idle' }
  const statusOf2 = (id) => unreadStates[id] ?? 'idle'
  assert.deepEqual(mvAttentionPanes(withThird, statusOf2), ['p1', 'p2'])
  assert.equal(mvNextAttentionPane(withThird, 'p1', statusOf2), 'p2')
  assert.equal(mvNextAttentionPane(withThird, 'p3', statusOf2), 'p1')
  assert.equal(mvNextAttentionPane(withThird, 'p2', statusOf2), 'p1')
})

test('loading an old profile collapses the duplicate arrangements older builds created', () => {
  const two = mvWithSession(mvWithSession(mvPreset(2), 'p1', 'a'), 'p2', 'b')
  const swapped = mvSwapSessions(two, 'p1', 'p2')
  const three = mvWithSession(mvShapeTo(two, 3), 'p3', 'c')
  const empty = mvPreset(2)

  const views = [
    { id: 'old-swapped', layout: swapped, savedAt: 10 },
    { id: 'new-ordered', layout: two, savedAt: 20 },
    { id: 'three', layout: three, savedAt: 15 },
    { id: 'single', layout: mvWithSession(mvPreset(2), 'p1', 'a'), savedAt: 30 },
    { id: 'empty', layout: empty, savedAt: 40 },
  ]

  const deduped = mvDedupeViews(views)
  const ids = deduped.map((view) => view.id)

  /* The same Sessions in the same shape collapse to one entry: the newer one wins. */
  assert.deepEqual(ids, ['new-ordered', 'three'])
  assert.equal(deduped.length, 2)

  /* A different pane count survives as its own arrangement. */
  assert.ok(ids.includes('three'))

  /* Splits that cannot be restored (one Session, or none) are dropped. */
  assert.ok(!ids.includes('single'))
  assert.ok(!ids.includes('empty'))
})

test('a hand-written name outranks a newer unnamed entry when collapsing', () => {
  const two = mvWithSession(mvWithSession(mvPreset(2), 'p1', 'a'), 'p2', 'b')
  const swapped = mvSwapSessions(two, 'p1', 'p2')

  const kept = mvDedupeViews([
    { id: 'named', layout: two, savedAt: 10, customName: '盯盘 A 组' },
    { id: 'newer-unnamed', layout: swapped, savedAt: 99 },
  ])

  assert.equal(kept.length, 1)
  assert.equal(kept[0].id, 'named', 'losing the typed name would be worse than losing the timestamp')
})

test('status classification has one source of truth, and attention has one rule', () => {
  /* Precedence: a Session blocked on a question is also running, so waiting must win. */
  assert.equal(mvSessionState({ pendingInteraction: {}, running: true }), 'waiting')
  assert.equal(mvSessionState({ running: true }), 'running')
  assert.equal(mvSessionState({ running: true, completionUnread: true }), 'running')
  assert.equal(mvSessionState({ completionUnread: true }), 'unread')
  assert.equal(mvSessionState({}), 'idle')
  assert.equal(mvSessionState(undefined), 'idle')
  assert.equal(mvSessionState(null), 'idle')

  /* Attention is derived from the same states, so new surfaces cannot invent their own rule. */
  assert.equal(mvNeedsAttention('waiting'), true)
  assert.equal(mvNeedsAttention('unread'), true)
  assert.equal(mvNeedsAttention('running'), false)
  assert.equal(mvNeedsAttention('idle'), false)
  assert.equal(mvNeedsAttention(''), false)
})

test('shrinking keeps the conversation you are watching, growing leaves every seat alone', () => {
  /* Four bound panes, focused on the last one. */
  let tree = mvWithSession(mvWithSession(mvPreset(4), 'p1', 'a'), 'p2', 'b')
  tree = mvWithSession(tree, 'p3', 'c')
  tree = mvWithSession(tree, 'p4', 'd')
  assert.deepEqual(mvLeaves(tree).map((leaf) => leaf.sessionId), ['a', 'b', 'c', 'd'])

  /* Dropping to two panes keeps the watched Session, in the first seat. */
  const shrunk = mvShapeTo(tree, 2, 'p4')
  assert.deepEqual(mvLeaves(shrunk).map((leaf) => leaf.sessionId), ['d', 'a'])

  /* When the watched pane is already inside the surviving range, order is untouched. */
  const shrunkEarly = mvShapeTo(tree, 2, 'p1')
  assert.deepEqual(mvLeaves(shrunkEarly).map((leaf) => leaf.sessionId), ['a', 'b'])

  /* Focusing the second pane must not reshuffle anything: both panes survive, so the reading
     order the user arranged stays exactly as it was. */
  const shrunkSecond = mvShapeTo(tree, 2, 'p2')
  assert.deepEqual(mvLeaves(shrunkSecond).map((leaf) => leaf.sessionId), ['a', 'b'])

  const shrunkThird = mvShapeTo(tree, 3, 'p3')
  assert.deepEqual(mvLeaves(shrunkThird).map((leaf) => leaf.sessionId), ['a', 'b', 'c'])

  /* Shrinking to three keeps the watched Session too. */
  const shrunkThree = mvShapeTo(tree, 3, 'p4')
  assert.deepEqual(mvLeaves(shrunkThree).map((leaf) => leaf.sessionId), ['d', 'a', 'b'])

  /* Growing never moves a Session out of its seat. */
  const two = mvWithSession(mvWithSession(mvPreset(2), 'p1', 'a'), 'p2', 'b')
  const grown = mvShapeTo(two, 4, 'p2')
  assert.deepEqual(mvLeaves(grown).map((leaf) => leaf.sessionId), ['a', 'b', null, null])

  /* Without a focus hint the old positional rule still applies, so callers stay simple. */
  assert.deepEqual(mvLeaves(mvShapeTo(tree, 2)).map((leaf) => leaf.sessionId), ['a', 'b'])
})

test('key caps render the way the default binding reads', () => {
  assert.equal(mvKeyCap('KeyJ'), 'J', 'letter keys drop the Key prefix')
  assert.equal(mvKeyCap('BracketLeft'), '[', 'brackets have their own cap')
  assert.equal(mvKeyCap('BracketRight'), ']', 'brackets have their own cap')
  assert.equal(mvKeyCap('Digit3'), '3', 'digits drop the Digit prefix')
  assert.equal(mvKeyCap('F7'), 'F7', 'an unmapped code passes through unchanged')
  assert.equal(mvShortcutHint('KeyM'), 'Mod+Alt+M', 'the default binding is primary+alt')
})

test('the saved-split library evicts an auto-named entry before a hand-named one', () => {
  const entry = (id, customName) => ({ id, customName })

  /* Under the cap nothing is touched, and the newcomer is kept. */
  const small = mvTrimViews([entry('new'), entry('a'), entry('b')], 12)
  assert.equal(small.views.length, 3, 'a short library keeps everything')
  assert.equal(small.keptNewcomer, true, 'the newcomer is kept')

  /* At the cap the oldest unnamed entry goes, however old the named ones are. */
  const named12 = Array.from({ length: 12 }, (_, index) => entry('v' + index, 'named ' + index))
  const mix = mvTrimViews([entry('new'), ...named12.slice(0, 11), entry('oldest-unnamed')], 12)
  assert.equal(mix.views.length, 12, 'the cap holds')
  assert.equal(mix.keptNewcomer, true, 'the newcomer is kept')
  assert.ok(!mix.views.some((view) => view.id === 'oldest-unnamed'), 'the unnamed entry is the one dropped')
  assert.equal(mix.views[0].id, 'new', 'the newcomer leads the list')

  /* A hand-written name outranks an auto-named entry even when the named one is oldest. */
  const namedOldest = mvTrimViews([entry('new'), entry('old-but-named', '盯盘'), ...Array.from({ length: 11 }, (_, index) => entry('auto' + index))], 12)
  assert.ok(namedOldest.views.some((view) => view.id === 'old-but-named'), 'a named entry survives')
  assert.equal(namedOldest.views.length, 12, 'the cap still holds')

  /* Every entry named: nothing is dropped, and the newcomer is reported as not kept. */
  const allNamed = mvTrimViews([entry('new'), ...named12], 12)
  assert.equal(allNamed.keptNewcomer, false, 'the caller learns the newcomer did not fit')
  assert.ok(!allNamed.views.some((view) => view.id === 'new'), 'no named entry is sacrificed')
  assert.equal(allNamed.views.length, 12, 'the library keeps its size')
})
