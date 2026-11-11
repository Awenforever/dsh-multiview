/**
 * Pure layout algebra for the stage.
 *
 * A layout is a binary tree of splits whose leaves are panes. Everything here is
 * a pure function over that tree so the model can be unit-tested without React,
 * the slot registry or a browser.
 */

/** Hard cap: the product opens at most four live conversations. */
const MV_MAX_PANES = 4
const MV_MIN_PANES = 2
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
  /* Verified against the host's own derivation
     (`@deepseek-ai/dsh-client-ui-session`, `publishStatus`), which builds each entry as
     `{ running: boolean | undefined, pendingInteraction: interaction | undefined,
        completionUnread: boolean }`.
     A null pending interaction is not a pending interaction: test for both nullish kinds. */
  const pending = status.pendingInteraction
  if (pending !== undefined && pending !== null) return 'waiting'
  if (status.running === true) return 'running'
  if (status.completionUnread === true) return 'unread'
  return 'idle'
}

/**
 * Clip text to a maximum number of characters, on whole code points.
 *
 * `String.prototype.slice` counts UTF-16 code units, so a cut that lands inside a surrogate pair
 * produces half a character — a replacement glyph in the label. Iterating code points keeps every
 * character whole.
 * @param text - the text to clip.
 * @param max - maximum number of characters to keep.
 * @param ellipsis - appended when something was dropped.
 */
export function mvClip(text: any, max: number, ellipsis: string): string {
  const source = text === undefined || text === null ? '' : String(text)
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0
  const characters = Array.from(source)
  if (characters.length <= limit) return source
  return characters.slice(0, limit).join('') + ellipsis
}

/**
 * First candidate that is worth showing.
 *
 * A chain of `??` stops at an empty string, so a blank message or title wins over the fallback and
 * the user sees nothing. Numbers and booleans are values rather than absences, so they are stringified
 * instead of skipped.
 * @param candidates - values in preference order.
 * @param fallback - returned when nothing usable is present.
 */
export function mvFirstText(candidates: any[], fallback: string): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const text = candidate.trim()
      if (text !== '') return text
    } else if (typeof candidate === 'number' || typeof candidate === 'boolean') {
      return String(candidate)
    }
  }
  return fallback
}

/**
 * A never-blank title for a pane header.
 *
 * `title ?? fallback` is not enough: the host trims Session titles and an untitled Session therefore
 * carries `''`, which is not nullish and slipped through to render an empty header. The host's own
 * sidebar shows a localized "untitled" label in exactly this case.
 * @param title - the raw title, or undefined while the record is unknown.
 * @param fallback - localized label for a known Session with no title.
 * @param unknown - localized label for a Session the host does not list (deleted or not yet known).
 */
export function mvDisplayTitle(title: any, fallback: string, unknown?: string): string {
  if (title === undefined || title === null) return unknown === undefined ? fallback : unknown
  const text = String(title).trim()
  return text === '' ? fallback : text
}

/**
 * Readable label for one Workspace entry.
 *
 * A fallback chain on paper, but `??` only skips nullish values: a blank title or a path with no
 * basename produced an empty string, which then suppressed the picker's whole grouping. Every step
 * here treats a blank value as absent.
 * @param item - one entry of `workspaces.list.getSnapshot().items`.
 * @returns a non-blank label, or the empty string when the entry carries nothing usable.
 */
export function mvWorkspaceLabel(item: any): string {
  const title = typeof item?.title === 'string' ? item.title.trim() : ''
  if (title !== '') return title
  const path = typeof item?.path === 'string' ? item.path.trim() : ''
  if (path !== '') {
    const parts = path.split(/[\\/]/).filter((part: string) => part !== '')
    const base = parts.length === 0 ? '' : parts[parts.length - 1]
    if (base !== '') return base
  }
  const id = typeof item?.workspaceId === 'string' ? item.workspaceId.trim() : ''
  return id
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
/**
 * Rebuild the tree with a different pane count.
 *
 * Growing keeps every bound Session in place and adds empty panes. Shrinking has to drop some
 * conversations, and dropping by position alone throws away the one the user is looking at when
 * it happens to sit in the later panes — so the focused pane wins the first slot and the rest
 * follow in reading order.
 * @param node - current tree (any shape).
 * @param count - target pane count (2..4).
 * @param focusedId - the pane the user is on, when known.
 * @returns the new preset tree, or `node` when the count is unchanged.
 */
export function mvShapeTo(node: any, count: number, focusedId?: string): any {
  const target = Math.max(2, Math.min(MV_MAX_PANES, count))
  const current = mvLeaves(node)
  if (current.length === target) return node
  const sessions: (string | null)[] = current.map((leaf) => leaf.sessionId)
  if (target < current.length && focusedId !== undefined) {
    const index = current.findIndex((leaf) => leaf.id === focusedId)
    if (index > target - 1) {
      /* Move the watched Session to the front so it survives the cut. */
      const watched = sessions[index]
      sessions.splice(index, 1)
      sessions.unshift(watched)
    }
  }
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
  /* The two-pane minimum is a product invariant, so the algebra refuses to express a smaller tree
     instead of trusting every caller to check first. It is checked once, at the root: the recursive
     step must still be able to collapse a two-pane subtree, which is how any removal works. */
  if (mvLeafCount(node) <= MV_MIN_PANES) return node
  return mvRemoveLeafIn(node, leafId)
}

/** Recursive step of {@link mvRemoveLeaf}: collapses the parent of the removed pane. */
function mvRemoveLeafIn(node: any, leafId: string): any {
  if (node === null || node === undefined) return null
  if (node.kind === 'leaf') return node.id === leafId ? null : node
  const a = mvRemoveLeafIn(node.a, leafId)
  const b = mvRemoveLeafIn(node.b, leafId)
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

/**
 * Take `proposed` when it is a usable identity that has not appeared yet; otherwise mint one and
 * **record it**. Not recording the minted id is what let two duplicates end up with the same fresh
 * identity, which silently merged two panes into one for every id-keyed operation.
 * @param proposed - identity from the payload.
 * @param prefix - `p` for panes, `s` for splits.
 * @param seen - every identity already assigned in this tree.
 */
function mvUniqueId(proposed: any, prefix: string, seen: Set<string>): string {
  if (typeof proposed === 'string' && proposed !== '' && !seen.has(proposed)) {
    seen.add(proposed)
    return proposed
  }
  let counter = seen.size + 1
  let candidate = prefix + String(counter)
  while (seen.has(candidate)) {
    counter += 1
    candidate = prefix + String(counter)
  }
  seen.add(candidate)
  return candidate
}

/** Assign fresh identities to any node missing or duplicating one. */
export function mvNormalizeIds(node: any, seen: Set<string>): any {
  if (node === null || node === undefined) return node
  if (node.kind === 'leaf') {
    const id = mvUniqueId(node.id, 'p', seen)
    return id === node.id ? node : { ...node, id }
  }
  const a = mvNormalizeIds(node.a, seen)
  const b = mvNormalizeIds(node.b, seen)
  const id = mvUniqueId(node.id, 's', seen)
  if (a === node.a && b === node.b && id === node.id) return node
  return { ...node, id, a, b }
}

/**
 * Repair a persisted layout, then enforce the invariant every edit relies on: one conversation per
 * pane. Persisted data is the one input nobody validates, and a hand-edited payload could otherwise
 * put the same conversation in two panes, where the rest of the algebra assumes it cannot happen.
 * @param raw - untrusted persisted layout.
 */
export function mvSanitize(raw: any): any {
  const repaired = mvSanitizeRaw(raw)
  const seen = new Set<string>()
  const clearDuplicates = (value: any): any => {
    if (value === null || value === undefined) return value
    if (value.kind === 'leaf') {
      if (value.sessionId === null) return value
      if (seen.has(value.sessionId)) return { ...value, sessionId: null }
      seen.add(value.sessionId)
      return value
    }
    if (value.kind !== 'split') return value
    return { ...value, a: clearDuplicates(value.a), b: clearDuplicates(value.b) }
  }
  return clearDuplicates(repaired)
}


/**
 * Validate and repair an untrusted layout (persisted JSON or a probe input).
 * @param raw - candidate value.
 * @returns a usable tree, or null when nothing usable was supplied.
 */
function mvSanitizeRaw(raw: any): any {
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

/**
 * Key cap for a physical key code, as the default binding renders it.
 *
 * The defaults are `primary+alt`, so a hint only needs the key itself. Unmapped codes fall through
 * unchanged rather than guessing, which keeps a wrong hint from appearing silently.
 * @param code - physical key code such as `KeyJ` or `BracketLeft`.
 */
export function mvKeyCap(code: string): string {
  if (code === 'BracketLeft') return '['
  if (code === 'BracketRight') return ']'
  if (code === 'Slash') return '/'
  if (code === 'Backslash') return '\\'
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  return code
}

/** Tooltip hint for a command's default binding, e.g. `Mod+Alt+J`. */
export function mvShortcutHint(code: string): string {
  return 'Mod+Alt+' + mvKeyCap(code)
}

/**
 * Whether a scheduled update check may run now.
 *
 * Two independent conditions: the last **successful** check is at least one interval old, and any
 * backoff window has expired. Keeping them separate is what lets a failure retry sooner than a
 * success — the previous code advanced the success timestamp on failure too, which made the backoff
 * unreachable.
 * @param checkedAt - when the last successful check finished (0 when never).
 * @param nextAt - earliest moment a retry may run.
 * @param now - current time.
 * @param interval - the normal check interval.
 */
export function mvUpdateDue(checkedAt: number, nextAt: number, now: number, interval: number): boolean {
  if (!(now - checkedAt >= interval)) return false
  return nextAt <= now
}

/**
 * Retry delay after consecutive failures: exponential, capped.
 * @param failures - consecutive failure count, 1 for the first.
 * @param base - first delay.
 * @param max - ceiling.
 */
export function mvBackoffDelay(failures: number, base: number, max: number): number {
  const count = Number.isFinite(failures) && failures >= 1 ? Math.floor(failures) : 1
  /* Guard the exponent: Math.pow(2, 1000) is Infinity, and min() would hide the intent. */
  const doublings = Math.min(count - 1, 40)
  return Math.min(base * Math.pow(2, doublings), max)
}

/** Split a version into its numeric core and its prerelease identifiers. */
function mvVersionParts(version: string): { core: number[]; pre: string[] } {
  const withoutBuild = String(version).split('+')[0]
  const dash = withoutBuild.indexOf('-')
  const core = dash < 0 ? withoutBuild : withoutBuild.slice(0, dash)
  const pre = dash < 0 ? '' : withoutBuild.slice(dash + 1)
  return {
    core: core.split('.').map((part) => {
      const value = Number.parseInt(part, 10)
      return Number.isFinite(value) ? value : 0
    }),
    pre: pre === '' ? [] : pre.split('.'),
  }
}

/** Compare two prerelease identifier lists; returns -1, 0 or 1. */
function mvComparePre(left: string[], right: string[]): number {
  /* No prerelease outranks any prerelease. */
  if (left.length === 0 && right.length === 0) return 0
  if (left.length === 0) return 1
  if (right.length === 0) return -1
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index]
    const b = right[index]
    /* A shorter list is lower when every compared identifier is equal. */
    if (a === undefined) return -1
    if (b === undefined) return 1
    const aNumeric = /^\d+$/.test(a)
    const bNumeric = /^\d+$/.test(b)
    if (aNumeric && bNumeric) {
      const difference = Number(a) - Number(b)
      if (difference !== 0) return difference < 0 ? -1 : 1
      continue
    }
    /* Numeric identifiers always rank below alphanumeric ones. */
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1
    if (a !== b) return a < b ? -1 : 1
  }
  return 0
}

/**
 * Whether `left` is a strictly newer version than `right`.
 *
 * Prereleases are compared, not discarded: `0.1.80` must be newer than `0.1.80-rc.1`, otherwise a
 * user on a release candidate is never told the final shipped.
 */
export function mvVersionGt(left: string, right: string): boolean {
  const a = mvVersionParts(left)
  const b = mvVersionParts(right)
  for (let index = 0; index < Math.max(a.core.length, b.core.length); index += 1) {
    const first = a.core[index] ?? 0
    const second = b.core[index] ?? 0
    if (first !== second) return first > second
  }
  return mvComparePre(a.pre, b.pre) > 0
}

/**
 * Keep the saved-split library inside its cap without silently destroying a name.
 *
 * Candidates arrive newest-first. An entry the user named by hand outranks an auto-named one, so
 * eviction takes the oldest unnamed entry; if every entry is named, nothing is dropped and the
 * caller is told the newcomer did not fit.
 * @param candidates - newest-first entries, the newcomer included at index 0.
 * @param cap - maximum number of entries to keep.
 * @returns kept entries and whether the newcomer survived the trim.
 */
export function mvTrimViews<T extends { id: string; customName?: string }>(
  candidates: T[],
  cap: number,
): { views: T[]; keptNewcomer: boolean } {
  const named = (entry: T): boolean => typeof entry.customName === 'string' && entry.customName.trim() !== ''
  if (candidates.length <= cap) return { views: candidates, keptNewcomer: true }
  if (cap <= 0) return { views: [], keptNewcomer: false }

  const newcomer = candidates[0]
  const rest = candidates.slice(1)
  const namedRest = rest.filter(named)
  const unnamedRest = rest.filter((entry) => !named(entry))

  /* Keep the newcomer only when doing so costs no hand-written name. */
  if (namedRest.length <= cap - 1) {
    return { views: [newcomer, ...namedRest, ...unnamedRest].slice(0, cap), keptNewcomer: true }
  }
  /* Otherwise every name outranks the newcomer; the library itself may still exceed the cap only if
     it already contained more named entries than the cap allows. */
  return { views: [...namedRest, ...unnamedRest].slice(0, cap), keptNewcomer: false }
}


/**
 * Merge host content hits into the title-matched rows.
 *
 * Title matches keep their order and identity; a content hit that is already listed only gains its
 * snippet, and one that is not listed is appended after them. Everything stays one list, because the
 * picker can only offer one set of rows.
 * @param rows - rows already matched by title, in display order.
 * @param hits - host search hits, `{ sessionId, snippet }`.
 * @param titleOf - resolves a session id to its current title, or null when unavailable.
 * @param cap - maximum number of rows to return.
 */
export function mvMergeSearchRows(
  rows: any[],
  hits: any[],
  titleOf: (id: string) => string | null,
  cap: number,
): any[] {
  const seen = new Set<string>()
  const out: any[] = []
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || row.kind !== undefined) {
      out.push(row)
      continue
    }
    seen.add(row.id)
    out.push(row)
  }
  for (const hit of Array.isArray(hits) ? hits : []) {
    const id = typeof hit?.sessionId === 'string' ? hit.sessionId : null
    if (id === null) continue
    const snippet = typeof hit?.snippet === 'string' ? hit.snippet : ''
    if (seen.has(id)) {
      const existing = out.find((row) => row !== null && typeof row === 'object' && row.id === id)
      if (existing !== undefined && existing.snippet === undefined) existing.snippet = snippet
      continue
    }
    const title = titleOf(id)
    if (title === null) continue
    seen.add(id)
    out.push({ id, title, depth: 0, owner: null, onStage: false, snippet, fromContent: true })
  }
  return out.slice(0, cap)
}
