/**
 * Pure layout algebra for the stage.
 *
 * A layout is a binary tree of splits whose leaves are panes. Everything here is
 * a pure function over that tree so the model can be unit-tested without React,
 * the slot registry or a browser.
 */

/** Hard cap: the product opens at most four live conversations. */
const MV_MAX_PANES = 4
/** Smallest share either side of a split may keep. */
const MV_MIN_RATIO = 0.22
const MV_MAX_RATIO = 0.78

/**
 * One pane slot. `sessionId` is null while the pane is empty.
 * @typedef {{ kind: 'leaf', id: string, sessionId: string | null }} MvLeaf
 * @typedef {{ kind: 'split', id: string, dir: 'row' | 'col', ratio: number, a: MvNode, b: MvNode }} MvSplit
 * @typedef {MvLeaf | MvSplit} MvNode
 */

/** Clamp one split ratio into its contract range. */
export function mvClampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(MV_MAX_RATIO, Math.max(MV_MIN_RATIO, value))
}

/** One empty leaf with a stable identity. */
export function mvLeaf(id: string): any {
  return { kind: 'leaf', id, sessionId: null }
}

/** One split node with a stable identity. */
export function mvSplit(id: string, dir: 'row' | 'col', ratio: number, a: any, b: any): any {
  return { kind: 'split', id, dir, ratio: mvClampRatio(ratio), a, b }
}

/**
 * Build one of the three presets.
 * @param count - 2, 3 or 4 panes.
 * @returns the preset tree with empty panes.
 */
export function mvPreset(count: number): any {
  if (count <= 2) return mvSplit('s1', 'row', 0.5, mvLeaf('p1'), mvLeaf('p2'))
  if (count === 3) {
    return mvSplit('s1', 'row', 0.55, mvLeaf('p1'), mvSplit('s2', 'col', 0.5, mvLeaf('p2'), mvLeaf('p3')))
  }
  return mvSplit(
    's1',
    'row',
    0.5,
    mvSplit('s2', 'col', 0.5, mvLeaf('p1'), mvLeaf('p2')),
    mvSplit('s3', 'col', 0.5, mvLeaf('p3'), mvLeaf('p4')),
  )
}

/** Panes in reading order (top-to-bottom inside a column, left-to-right inside a row). */
export function mvLeaves(node: any, out: any[]): any[] {
  const list = out === undefined ? [] : out
  if (node === undefined || node === null) return list
  if (node.kind === 'leaf') {
    list.push(node)
    return list
  }
  mvLeaves(node.a, list)
  mvLeaves(node.b, list)
  return list
}

/**
 * Which Sessions a split holds, ignoring how they are arranged.
 *
 * Two arrangements of the same Sessions are the same working set; this is what lets
 * "move a pane" update a saved split instead of creating a near-duplicate.
 * @param node - a split tree.
 * @returns sorted, de-duplicated Session ids joined with commas.
 */
export function mvSessionSet(node: any): string {
  const ids = mvLeaves(node)
    .map((leaf) => leaf.sessionId)
    .filter((sessionId) => sessionId !== null && sessionId !== undefined && sessionId !== '')
  return [...new Set(ids)].sort().join(',')
}

/**
 * Identity of a saved split: which Sessions, and how many panes.
 *
 * Same Sessions in the same shape are one arrangement no matter how the panes are
 * ordered, so moving a pane updates its entry instead of adding one. A different pane
 * count is a different arrangement and earns its own entry.
 * @param node - a split tree.
 * @returns `sessions@count`, e.g. `a,b@3`.
 */
export function mvArrangementKey(node: any): string {
  return mvSessionSet(node) + '@' + String(mvLeaves(node).length)
}

/**
 * Classify one Session's status object into the four states the UI shows.
 *
 * Order matters: a Session waiting for an answer is *also* running, so `waiting` is tested
 * first, then `running`, then unread. Kept here rather than in the renderer because three
 * separate surfaces (pane header, collapsed switcher, sidebar badge) must agree — when this
 * lived in the stage, each new surface re-implemented the comparison and could drift.
 * @param status - a Session status entry, or anything else.
 * @returns `idle`, `running`, `waiting` or `unread`.
 */
export function mvSessionState(status: any): string {
  if (status === undefined || status === null) return 'idle'
  if (status.pendingInteraction !== undefined) return 'waiting'
  if (status.running === true) return 'running'
  if (status.completionUnread === true) return 'unread'
  return 'idle'
}

/**
 * Whether a state is asking for the user. `running` deliberately is not: producing output
 * is not a request (product decision, 2026-11-11).
 * @param state - one of the states `mvSessionState` returns.
 * @returns true only for `waiting` and `unread`.
 */
export function mvNeedsAttention(state: string): boolean {
  return state === 'waiting' || state === 'unread'
}

/**
 * Panes that want the user right now, in reading order.
 *
 * Only `waiting` (blocked on an approval or a question) and `unread` (finished while you
 * were elsewhere) qualify. A pane that is merely `running` does not: producing output is
 * not asking for anything, and counting it would make the jump cycle walk through
 * conversations that need nothing. That exclusion is a product decision, made explicit
 * here so a future change has to argue with it.
 * @param node - a split tree.
 * @param statusOf - maps a Session id to `idle`, `running`, `waiting` or `unread`.
 * @returns pane ids, in the order they appear on screen.
 */
export function mvAttentionPanes(node: any, statusOf: (sessionId: string) => string): string[] {
  const out: string[] = []
  for (const leaf of mvLeaves(node)) {
    if (leaf.sessionId === null || leaf.sessionId === undefined || leaf.sessionId === '') continue
    const state = statusOf(leaf.sessionId)
    if (mvNeedsAttention(state)) out.push(leaf.id)
  }
  return out
}

/**
 * The next pane wanting attention after the focused one, wrapping around.
 * @param node - a split tree.
 * @param focusedId - the pane the user is on.
 * @param statusOf - maps a Session id to `idle`, `running`, `waiting` or `unread`.
 * @returns the pane to focus, or null when nothing is waiting.
 */
export function mvNextAttentionPane(node: any, focusedId: string, statusOf: (sessionId: string) => string): string | null {
  const candidates = mvAttentionPanes(node, statusOf)
  if (candidates.length === 0) return null
  const order = mvLeaves(node).map((leaf) => leaf.id)
  const from = order.indexOf(focusedId)
  const after = candidates.filter((id) => order.indexOf(id) > from)
  return after.length > 0 ? after[0] : candidates[0]
}

/**
 * Collapse saved splits that describe the same arrangement, keeping the better entry.
 *
 * Older builds keyed saved splits on the ordered Session list, so an existing profile can
 * hold one entry per arrangement of the same Sessions. "Better" means the most recently
 * saved, except that a name the user typed outranks an unnamed entry: losing a hand-written
 * name silently would be worse than losing a timestamp.
 * @param views - saved splits, newest first or in any order.
 * @returns one entry per arrangement, in first-appearance order; entries holding fewer than
 * two Sessions are dropped because they cannot be restored as a split.
 */
export function mvDedupeViews(views: any[]): any[] {
  const best = new Map()
  const order = []
  for (const view of views) {
    if (view === null || view === undefined || view.layout === null || view.layout === undefined) continue
    const key = mvArrangementKey(view.layout)
    if (mvSessionSet(view.layout) === '' || mvSessionSet(view.layout).indexOf(',') < 0) continue
    const seen = best.get(key)
    if (seen === undefined) {
      best.set(key, view)
      order.push(key)
      continue
    }
    const seenNamed = typeof seen.customName === 'string'
    const viewNamed = typeof view.customName === 'string'
    /* Recency decides only between equals: when exactly one side carries a name the user
       typed, that side survives, because a name cannot be regenerated but a timestamp can. */
    let preferred
    if (seenNamed && !viewNamed) preferred = seen
    else if (!seenNamed && viewNamed) preferred = view
    else preferred = (view.savedAt ?? 0) > (seen.savedAt ?? 0) ? view : seen
    best.set(key, preferred)
  }
  return order.map((key) => best.get(key))
}

/** Pane count of one tree. */
export function mvLeafCount(node: any): number {
  return mvLeaves(node).length
}

/**
 * Rebuild the tree with a different pane count, keeping bound Sessions in
 * reading order. Extra panes are dropped; new panes are empty.
 * @param node - current tree (any shape).
 * @param count - target pane count (2..4).
 * @returns the new preset tree, or `node` when the count is unchanged.
 */
export function mvShapeTo(node: any, count: number): any {
  const target = Math.max(2, Math.min(MV_MAX_PANES, count))
  const current = mvLeaves(node)
  if (current.length === target) return node
  const sessions: (string | null)[] = current.map((leaf) => leaf.sessionId)
  const next = mvPreset(target)
  const leaves = mvLeaves(next)
  for (let index = 0; index < leaves.length; index += 1) leaves[index].sessionId = sessions[index] ?? null
  return next
}

/** Apply one leaf-level edit without mutating the tree. */
export function mvMapLeaves(node: any, edit: (leaf: any) => any): any {
  if (node.kind === 'leaf') return edit(node)
  const a = mvMapLeaves(node.a, edit)
  const b = mvMapLeaves(node.b, edit)
  if (a === node.a && b === node.b) return node
  return { ...node, a, b }
}

/**
 * Bind one Session to one pane. A Session may live in only one pane at a time,
 * so any other pane holding it is cleared in the same edit.
 * @param node - current tree.
 * @param leafId - target pane.
 * @param sessionId - Session to bind, or null to clear the pane.
 * @returns the edited tree.
 */
export function mvWithSession(node: any, leafId: string, sessionId: string | null): any {
  return mvMapLeaves(node, (leaf) => {
    if (leaf.id !== leafId && sessionId !== null && leaf.sessionId === sessionId) return { ...leaf, sessionId: null }
    if (leaf.id !== leafId) return leaf
    if (leaf.sessionId === sessionId) return leaf
    return { ...leaf, sessionId }
  })
}

/**
 * Exchange the Sessions of two panes.
 * @param node - current tree.
 * @param aId - first pane.
 * @param bId - second pane.
 * @returns the edited tree.
 */
export function mvSwapSessions(node: any, aId: string, bId: string): any {
  if (aId === bId) return node
  const leaves = mvLeaves(node)
  const a = leaves.find((leaf) => leaf.id === aId)
  const b = leaves.find((leaf) => leaf.id === bId)
  if (a === undefined || b === undefined) return node
  const aSession = a.sessionId
  const bSession = b.sessionId
  if (aSession === bSession) return node
  return mvMapLeaves(node, (leaf) => {
    if (leaf.id === aId) return { ...leaf, sessionId: bSession }
    if (leaf.id === bId) return { ...leaf, sessionId: aSession }
    return leaf
  })
}

/** Set one split node's ratio, clamped. */
export function mvResize(node: any, splitId: string, ratio: number): any {
  if (node === null || node === undefined) return node
  if (node.kind === 'leaf') return node
  if (node.id === splitId) {
    const clamped = mvClampRatio(ratio)
    return clamped === node.ratio ? node : { ...node, ratio: clamped }
  }
  const a = mvResize(node.a, splitId, ratio)
  const b = mvResize(node.b, splitId, ratio)
  if (a === node.a && b === node.b) return node
  return { ...node, a, b }
}

/**
 * Remove one pane; its sibling takes the split's place.
 * @param node - current tree.
 * @param leafId - pane to remove.
 * @returns the collapsed tree, or null when the last pane is removed.
 */
export function mvRemoveLeaf(node: any, leafId: string): any {
  if (node === null || node === undefined) return null
  if (node.kind === 'leaf') return node.id === leafId ? null : node
  const a = mvRemoveLeaf(node.a, leafId)
  const b = mvRemoveLeaf(node.b, leafId)
  if (a === null) return b
  if (b === null) return a
  if (a === node.a && b === node.b) return node
  return { ...node, a, b }
}

/** Find one pane by identity. */
export function mvLeafById(node: any, leafId: string): any {
  return mvLeaves(node).find((leaf) => leaf.id === leafId)
}

/**
 * The pane `delta` steps away in reading order, wrapping around.
 * @param node - current tree.
 * @param leafId - current pane.
 * @param delta - +1 next, -1 previous.
 * @returns the neighbouring pane identity, or the current one when alone.
 */
export function mvNeighbour(node: any, leafId: string, delta: number): string {
  const leaves = mvLeaves(node)
  const index = leaves.findIndex((leaf) => leaf.id === leafId)
  if (index < 0 || leaves.length < 2) return leafId
  const next = (index + delta + leaves.length) % leaves.length
  return leaves[next].id
}

/** Whether an unknown value is a leaf-shaped object. */
export function mvIsLeaf(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.kind === 'leaf' &&
    typeof value.id === 'string' &&
    (value.sessionId === null || typeof value.sessionId === 'string')
  )
}

/** Whether an unknown value is a split-shaped object with both children valid. */
export function mvIsSplit(value: any): boolean {
  if (value === null || typeof value !== 'object' || value.kind !== 'split') return false
  if (typeof value.id !== 'string') return false
  if (value.dir !== 'row' && value.dir !== 'col') return false
  if (typeof value.ratio !== 'number' || !Number.isFinite(value.ratio)) return false
  return value.a !== null && value.b !== null && typeof value.a === 'object' && typeof value.b === 'object'
}

/** Assign fresh identities to any node missing or duplicating one. */
export function mvNormalizeIds(node: any, seen: Set<string>): any {
  if (node === null || node === undefined) return node
  if (node.kind === 'leaf') {
    if (seen.has(node.id)) return { ...node, id: 'p' + String(seen.size + 1) }
    seen.add(node.id)
    return node
  }
  const a = mvNormalizeIds(node.a, seen)
  const b = mvNormalizeIds(node.b, seen)
  const id = seen.has(node.id) ? 's' + String(seen.size + 1) : node.id
  seen.add(id)
  if (a === node.a && b === node.b && id === node.id) return node
  return { ...node, id, a, b }
}

/**
 * Validate and repair an untrusted layout (persisted JSON or a probe input).
 * @param raw - candidate value.
 * @returns a usable tree, or null when nothing usable was supplied.
 */
export function mvSanitize(raw: any): any {
  /* Overflow is not "keep the left subtree": for a left-deep chain that subtree is a single
     leaf, so a five-pane saved layout used to collapse to one pane. Instead remember that the
     tree was too big and rebuild a standard shape holding the first panes, in reading order. */
  let overflowed = false
  const walk = (value: any, depth: number): any => {
    if (depth > 8) return null
    if (mvIsLeaf(value)) return { kind: 'leaf', id: value.id, sessionId: value.sessionId }
    if (!mvIsSplit(value)) return null
    const a = walk(value.a, depth + 1)
    const b = walk(value.b, depth + 1)
    if (a === null || b === null) return null
    const leaves = mvLeaves(a).length + mvLeaves(b).length
    if (leaves > MV_MAX_PANES) {
      overflowed = true
      /* Keep the side that holds more panes. Always keeping `b` would collapse a right-deep
         chain to its single leaf, and always keeping `a` would lose everything to the left. */
      return mvLeaves(a).length >= mvLeaves(b).length ? a : b
    }
    return { kind: 'split', id: value.id, dir: value.dir, ratio: mvClampRatio(value.ratio), a, b }
  }
  const tree = walk(raw, 0)
  if (tree === null) return null
  if (overflowed && mvLeaves(tree).length < 2) {
    /* Nothing usable survived the cut, so fall back to a sane default rather than one pane. */
    return mvPreset(2)
  }
  if (tree.kind === 'leaf') {
    /* A saved single pane is below the two-pane minimum this product supports. */
    const widened = mvPreset(2)
    const leaves = mvLeaves(widened)
    leaves[0].sessionId = tree.sessionId ?? null
    return widened
  }
  return mvNormalizeIds(tree, new Set())
}

/**
 * Bind each leaf through a reconciliation function; a leaf whose Session is gone
 * becomes empty while keeping its position.
 * @param node - current tree.
 * @param reconcile - maps a Session identity to itself or null.
 * @returns the edited tree.
 */
export function mvReconcileTree(node: any, reconcile: (sessionId: string) => string | null): any {
  return mvMapLeaves(node, (leaf) => {
    if (leaf.sessionId === null) return leaf
    const kept = reconcile(leaf.sessionId)
    if (kept === leaf.sessionId) return leaf
    return { ...leaf, sessionId: kept }
  })
}
