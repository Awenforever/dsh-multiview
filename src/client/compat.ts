/**
 * The one place that touches surfaces which are not formally stable.
 *
 * Every call is capability-probed and returns a value instead of throwing:
 * a missing surface downgrades one affordance, never the whole panel.
 */

/** Resolve the per-session input facade, if this build exposes one. */
function mvConversationService(): any {
  try {
    const direct = (PTX as any).conversation
    if (direct !== undefined && direct !== null) return direct
  } catch (error) {
    /* A service tracker may throw on uninjected access; fall through. */
  }
  try {
    const get = (PTX as any).get
    return typeof get === 'function' ? get.call(PTX, 'conversation') : undefined
  } catch (error) {
    return undefined
  }
}

/**
 * Return the keyboard to one pane's composer with its last caret.
 * @param sessionId - pane Session identity (already retained).
 * @returns whether a composer acknowledged the focus request.
 */
function mvFocusComposer(sessionId: string): boolean {
  if (sessionId === null || sessionId === undefined) return false
  try {
    const scoped = (PTX as any).sessions.scope(sessionId)
    if (scoped === undefined || scoped === null) return false
    const conversation = mvConversationService()
    const resolver = conversation === undefined ? undefined : conversation.input
    if (resolver === undefined || resolver === null || typeof resolver.for !== 'function') return false
    const facade = resolver.for(scoped)
    if (facade === undefined || facade === null || typeof facade.focus !== 'function') return false
    facade.focus()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Whether the shipped Conversation factory has declared its child slots.
 * Diagnostic only: registration waits on the slot itself, never on this probe.
 * @returns true when the conversation assembly is live.
 */
function mvConversationLive(): boolean {
  try {
    const slots = (PTX as any).slots
    if (slots === undefined || slots === null) return false
    if (typeof slots.spec === 'function' && slots.spec('conversation.session') !== undefined) return true
    if (typeof slots.specDynamic === 'function' && slots.specDynamic('conversation.session') !== undefined) return true
    return typeof slots.entries === 'function' && slots.entries('conversation.session').length > 0
  } catch (error) {
    return false
  }
}

/** Resolve one session row from the controller list without subscribing. */
function mvRow(sessionId: string): any {
  if (sessionId === null || sessionId === undefined) return undefined
  try {
    return (PTX as any).sessions.list.getSnapshot().byId[sessionId]
  } catch (error) {
    return undefined
  }
}

/** Display title for one pane, or undefined while the row is unknown. */
function mvTitle(sessionId: string): string | undefined {
  const row = mvRow(sessionId)
  return row === undefined ? undefined : row.title
}

/** Whether a Session identity is archived in any workspace. */
function mvIsArchived(sessionId: string): boolean {
  try {
    const archived = (PTX as any).workspaces.list.getSnapshot().archivedSessionIds
    return archived.includes(sessionId)
  } catch (error) {
    return false
  }
}

/**
 * Pick the sessions a freshly opened stage starts with: the current main
 * session first, then the most recent others. Blank sessions are excluded so a
 * pane never opens on the hero flow.
 * @param limit - how many panes to seed.
 * @returns distinct, non-archived session identities.
 */
function mvSeed(limit: number): string[] {
  const picked: string[] = []
  try {
    const list = (PTX as any).sessions.list.getSnapshot()
    const current = list.ids.find((id: string) => ((list.byId[id]?.retainedBy?.mainView ?? 0) as number) > 0)
    const ordered: string[] = current === undefined ? list.ids.slice() : [current, ...list.ids]
    for (const id of ordered) {
      if (picked.length >= limit) break
      if (picked.includes(id)) continue
      const row = list.byId[id]
      if (row === undefined || row.blank === true) continue
      if (mvIsArchived(id)) continue
      picked.push(id)
    }
  } catch (error) {
    /* An empty stage is a valid outcome. */
  }
  return picked
}

/**
 * Fill empty pane slots from the live list, newest first, never reusing a
 * Session that another slot already holds.
 * @param current - existing slot array (`null` = empty slot).
 * @param limit - pane count for this layout.
 * @returns a new array when something was filled, else `current`.
 */
function mvTopUp(current: string[], limit: number): string[] {
  const next = current.slice(0, limit)
  while (next.length < limit) next.push(null)
  let changed = next.length !== current.length
  const used = new Set(next.filter((id) => id !== null && id !== undefined))
  try {
    const list = (PTX as any).sessions.list.getSnapshot()
    const current = list.ids.find((id: string) => ((list.byId[id]?.retainedBy?.mainView ?? 0) as number) > 0)
    const ordered: string[] = current === undefined ? list.ids.slice() : [current, ...list.ids]
    for (let index = 0; index < next.length; index += 1) {
      if (next[index] !== null && next[index] !== undefined) continue
      const candidate = ordered.find((id: string) => {
        if (used.has(id)) return false
        const row = list.byId[id]
        return row !== undefined && row.blank !== true && !mvIsArchived(id)
      })
      if (candidate === undefined) continue
      next[index] = candidate
      used.add(candidate)
      changed = true
    }
  } catch (error) {
    /* Leave the remaining slots empty. */
  }
  return changed ? next : current
}

