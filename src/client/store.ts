/**
 * The stage's single source of truth: layout tree, focus, maximized pane, saved
 * views, the view currently being edited, and the persisted shape. React reads
 * it through `useSyncExternalStore`; every mutation goes through the pure
 * helpers in `model.ts`.
 */

/** Stage state persisted per device. */
function mvInitialState(): any {
  return {
    layout: mvPreset(2),
    focused: 'p1',
    maximized: null,
    preset: 2,
    seeded: false,
    reconciled: false,
    views: [],
    currentViewId: null,
  }
}

let mvState = mvInitialState()
const mvListeners = new Set<() => void>()
let mvSaveTimer = 0

/** Current snapshot; stable reference between mutations. */
function mvGetState(): any {
  return mvState
}

/** Subscribe to stage mutations (the `useSyncExternalStore` contract). */
function mvSubscribe(listener: () => void): () => void {
  mvListeners.add(listener)
  return () => {
    mvListeners.delete(listener)
  }
}

/** Persist the durable slice after a quiet period. */
function mvScheduleSave(): void {
  if (mvSaveTimer !== 0) clearTimeout(mvSaveTimer)
  mvSaveTimer = setTimeout(() => {
    mvSaveTimer = 0
    try {
      const durable = {
        version: 3,
        layout: mvState.layout,
        focused: mvState.focused,
        preset: mvState.preset,
        seeded: mvState.seeded,
        views: mvState.views,
        currentViewId: mvState.currentViewId,
      }
      window.localStorage.setItem(MV_STORAGE_KEY, JSON.stringify(durable))
    } catch (error) {
      /* Storage may be unavailable or full; the stage still works in memory. */
    }
  }, 200)
}

/** Ordered Session ids that a layout currently shows. */
function mvViewKey(layout: any): string {
  return mvLeaves(layout)
    .map((leaf) => leaf.sessionId)
    .filter((sessionId) => sessionId !== null)
    .join(',')
}

/**
 * Which Sessions a split holds, regardless of how they are arranged.
 *
 * `mvViewKey` is order-sensitive, so swapping two panes used to look like a brand
 * new split and spawn a near-duplicate entry. Two arrangements of the same Sessions
 * are the same working set: the second one updates the saved split instead.
 * @param layout - a split tree.
 * @returns sorted, de-duplicated Session ids joined with commas.
 */
function mvViewSet(layout: any): string {
  return mvArrangementKey(layout)
}

/**
 * Collapse saved splits that hold the same Sessions, keeping the most recently saved.
 * Older builds created one entry per arrangement, so existing profiles can carry
 * duplicates that the new rule would not create.
 * @param views - saved splits in stored order.
 * @returns the de-duplicated list, order preserved by first appearance.
 */
function mvNormalizeViews(views: any[]): any[] {
  return mvDedupeViews(views)
}

/** Readable label for a split: the joined Session titles. */
function mvViewName(layout: any): string {
  let list = null
  try {
    list = PTX.sessions.list.getSnapshot()
  } catch (error) {
    list = null
  }
  const titles = mvLeaves(layout)
    .map((leaf) => (leaf.sessionId === null ? null : list?.byId[leaf.sessionId]?.title))
    .filter((title) => typeof title === 'string' && title.length > 0)
  if (titles.length === 0) return T('viewsCurrent')
  return titles.join('  |  ')
}

/** Whether a layout has enough Sessions to be worth remembering. */
function mvViewWorthy(layout: any): boolean {
  const key = mvViewKey(layout)
  return key !== '' && key.indexOf(',') >= 0
}

/**
 * Keep the edited view in step with the stage, without spawning views blindly:
 * a stage that already belongs to a view edits that view in place, and only a
 * combination nobody has saved yet becomes a new one.
 * @param next - the state about to be committed.
 * @returns the state with an updated view list and current view id.
 */
function mvSyncView(next: any): any {
  const views = next.views ?? []
  const worthy = mvViewWorthy(next.layout)
  if (next.captureSuppressed === true) {
    /* One commit after deleting the current split: keep the deletion, do not re-capture. */
    return { ...next, captureSuppressed: false }
  }
  const current = views.find((view) => view.id === next.currentViewId) ?? null
  if (!worthy) {
    if (current === null) return next
    /* The split no longer holds two Sessions: drop the view it belonged to. */
    return {
      ...next,
      views: views.filter((view) => view.id !== current.id),
      currentViewId: null,
    }
  }
  if (current !== null) {
    return {
      ...next,
      views: views.map((view) =>
        view.id === current.id
          ? {
              ...view,
              layout: next.layout,
              /* A name the user typed outranks the generated one. */
              name: typeof view.customName === 'string' ? view.customName : mvViewName(next.layout),
            }
          : view,
      ),
    }
  }
  const key = mvViewKey(next.layout)
  const existing = views.find((view) => view.id === key)
  if (existing !== undefined) {
    return {
      ...next,
      currentViewId: existing.id,
      views: views.map((view) =>
        view.id === existing.id
          ? {
              ...view,
              layout: next.layout,
              name: typeof view.customName === 'string' ? view.customName : mvViewName(next.layout),
            }
          : view,
      ),
    }
  }
  /* Same Sessions, different arrangement: adopt that saved split instead of adding a
     near-duplicate. Moving a pane should not grow the list. */
  const set = mvViewSet(next.layout)
  const sameSet = views.find((view) => mvViewSet(view.layout) === set)
  if (sameSet !== undefined) {
    return {
      ...next,
      currentViewId: sameSet.id,
      views: views.map((view) =>
        view.id === sameSet.id
          ? {
              ...view,
              layout: next.layout,
              name: typeof view.customName === 'string' ? view.customName : mvViewName(next.layout),
              savedAt: Date.now(),
            }
          : view,
      ),
    }
  }
  const created = { id: key, name: mvViewName(next.layout), layout: next.layout, savedAt: Date.now() }
  return { ...next, currentViewId: created.id, views: [created, ...views].slice(0, 12) }
}

/**
 * Replace the state through a producer and notify once.
 * @param produce - produces the next state, or the same object to skip.
 */
function mvCommit(produce: (current: any) => any): void {
  const produced = produce(mvState)
  if (produced === mvState || produced === null || produced === undefined) return
  mvState = mvSyncView(produced)
  mvScheduleSave()
  for (const listener of mvListeners) {
    try {
      listener()
    } catch (error) {
      console.error('dsh-multiview: state listener failed', error)
    }
  }
}

/** Repair one persisted view entry, or return null when it is unusable. */
function mvSanitizeView(raw: any): any {
  if (raw === null || typeof raw !== 'object') return null
  const layout = mvSanitize(raw.layout)
  if (layout === null || !mvViewWorthy(layout)) return null
  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : mvViewKey(layout),
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : T('viewsCurrent'),
    layout,
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
  }
}

/** Read the persisted shape; a corrupt or foreign document falls back to the preset. */
function mvHydrate(): void {
  let raw = null
  try {
    raw = JSON.parse(window.localStorage.getItem(MV_STORAGE_KEY) ?? 'null')
  } catch (error) {
    raw = null
  }
  if (raw === null || typeof raw !== 'object') return
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) return
  const layout = mvSanitize(raw.layout)
  if (layout === null) return
  const leaves = mvLeaves(layout)
  const focused = leaves.some((leaf) => leaf.id === raw.focused) ? raw.focused : leaves[0].id
  const views = mvNormalizeViews(
    Array.isArray(raw.views) ? raw.views.map(mvSanitizeView).filter((view) => view !== null) : [],
  )
  const currentViewId =
    typeof raw.currentViewId === 'string' && views.some((view) => view.id === raw.currentViewId)
      ? raw.currentViewId
      : null
  mvState = {
    layout,
    focused,
    maximized: null,
    preset: typeof raw.preset === 'number' ? raw.preset : leaves.length,
    seeded: raw.seeded === true,
    reconciled: false,
    views,
    currentViewId,
  }
}

/** Forget the saved stage and start from the two-pane preset, keeping the views. */
function mvReset(): void {
  const views = mvState.views
  mvCommit(() => ({ ...mvInitialState(), views, currentViewId: null }))
  try {
    window.localStorage.removeItem(MV_STORAGE_KEY)
  } catch (error) {
    /* Ignore: the in-memory reset already happened. */
  }
}

/**
 * Archived Sessions leave the split, every time the list changes.
 *
 * `mvReconcile` runs once per mount on purpose: right after a bind the list may not have
 * caught up, and clearing a pane the user just bound would fight them. The archived set has
 * no such lag — it is authoritative — so a Session that gets archived while the split is open
 * is dropped from its pane instead of lingering there until the next reload.
 */
function mvClearArchived(): void {
  try {
    const kept = mvReconcileTree(mvState.layout, (sessionId) => (mvIsArchived(sessionId) ? null : sessionId))
    if (kept === mvState.layout) return
    /* Panes are only emptied, never removed, so the focused pane id stays valid and focus
       needs no repair here (a fallback branch would be unreachable). */
    mvCommit((current) => ({ ...current, layout: kept }))
  } catch (error) {
    /* The archived set is optional; a host without it simply never clears anything. */
  }
}

/**
 * Drop bindings whose Session vanished or was archived, keeping pane positions.
 * Runs once per mount, after the controller list is ready.
 */
function mvReconcile(): void {
  if (mvState.reconciled) return
  try {
    const list = PTX.sessions.list.getSnapshot()
    if (list.phase !== 'ready') return
    const kept = mvReconcileTree(mvState.layout, (sessionId) => {
      const row = list.byId[sessionId]
      if (row === undefined || row.blank === true) return null
      if (mvIsArchived(sessionId)) return null
      return sessionId
    })
    /* Panes are emptied, never removed, so the pane the user is on always still exists. */
    mvCommit((current) => ({ ...current, layout: kept, reconciled: true }))
  } catch (error) {
    mvCommit((current) => ({ ...current, reconciled: true }))
  }
}

/**
 * Open the split for one Session: reuse the view that already holds it, or
 * start a fresh two-pane view for it. This is what keeps "click 分屏 from a
 * conversation" from hijacking an unrelated saved split.
 * @param sessionId - the conversation the user is in, if known.
 */
function mvOpenForSession(sessionId: string | null): void {
  if (sessionId === null) return
  mvCommit((current) => {
    const owners = current.views.filter((view) => mvViewKey(view.layout).split(',').includes(sessionId))
    const owner = owners[0]
    if (owner !== undefined) {
      if (current.currentViewId === owner.id && mvViewKey(current.layout) === mvViewKey(owner.layout)) return current
      /* Switching to a smaller saved split invalidates the focused pane id (p4 lives in the
         four-pane shape). An invalid focus leaves the whole split keyboard-dead, so repair it:
         keep the user's pane when it still exists, otherwise focus the pane holding the Session
         we were asked to open, otherwise the first pane. */
      const ownerLeaves = mvLeaves(owner.layout)
      const stillThere = ownerLeaves.some((leaf) => leaf.id === current.focused)
      const holder = ownerLeaves.find((leaf) => leaf.sessionId === sessionId)
      const focused = stillThere ? current.focused : holder !== undefined ? holder.id : ownerLeaves[0].id
      return {
        ...current,
        layout: owner.layout,
        focused,
        currentViewId: owner.id,
        maximized: null,
        preset: ownerLeaves.length,
      }
    }
    if (mvViewKey(current.layout).split(',').includes(sessionId)) {
      /* Already on stage in the ad-hoc split. Opening a conversation must land on its pane —
         doing nothing here made "open this Session" look broken. */
      const holder = mvLeaves(current.layout).find((leaf) => leaf.sessionId === sessionId)
      if (holder === undefined) return current
      if (current.focused === holder.id && current.currentViewId === null) return current
      return { ...current, focused: holder.id, maximized: null }
    }
    const layout = mvWithSession(mvPreset(2), 'p1', sessionId)
    return { ...current, layout, currentViewId: null, focused: 'p1', preset: 2, maximized: null }
  })
}

/** Which saved view (other than the current one) already holds a Session. */
function mvViewOwner(sessionId: string, views: any[], currentViewId: string | null): any | null {
  for (const view of views) {
    if (view.id === currentViewId) continue
    if (mvViewKey(view.layout).split(',').includes(sessionId)) return view
  }
  return null
}

/** Switch to a preset pane count, carrying bound Sessions in reading order. */
function mvSetShape(count: number): void {
  mvCommit((current) => {
    const layout = mvShapeTo(current.layout, count, current.focused)
    if (layout === current.layout) return current
    const leaves = mvLeaves(layout)
    const focused = leaves.some((leaf) => leaf.id === current.focused) ? current.focused : leaves[0].id
    return { ...current, layout, focused, preset: count, maximized: null, seeded: true }
  })
}

/** Bind one Session to one pane (deduplicating), or clear the pane. */
function mvBind(leafId: string, sessionId: string | null): void {
  mvCommit((current) => {
    const layout = mvWithSession(current.layout, leafId, sessionId)
    if (layout === current.layout) return current
    const focused = sessionId === null ? current.focused : leafId
    return { ...current, layout, focused, maximized: current.maximized === leafId ? null : current.maximized }
  })
}

/** Move focus to one pane. */
function mvFocus(leafId: string): void {
  mvCommit((current) => (current.focused === leafId ? current : { ...current, focused: leafId }))
}

/** Toggle the maximized pane. */
function mvToggleMaximize(leafId: string): void {
  mvCommit((current) =>
    current.maximized === leafId ? { ...current, maximized: null } : { ...current, maximized: leafId, focused: leafId },
  )
}

/** Restore the split from a maximized pane. */
function mvRestore(): void {
  mvCommit((current) => (current.maximized === null ? current : { ...current, maximized: null }))
}

/** Update one split ratio while dragging. */
function mvResizeSplit(splitId: string, ratio: number): void {
  mvCommit((current) => {
    const layout = mvResize(current.layout, splitId, ratio)
    return layout === current.layout ? current : { ...current, layout }
  })
}

/**
 * Exchange the focused pane's Session with its neighbour, wrapping around.
 *
 * Swapping was pointer-only, which made the arrangement incomplete for keyboard users
 * in a plugin whose point is keyboard parity.
 * @param leafId - pane to move.
 * @param delta - +1 for the next pane in reading order, -1 for the previous one.
 */
function mvSwapWithNeighbour(leafId: string, delta: number): void {
  const state = mvGetState()
  const other = mvNeighbour(state.layout, leafId, delta)
  if (other === leafId) return
  mvSwapLeaves(leafId, other)
}

/** Exchange two panes' Sessions. */
function mvSwapLeaves(aId: string, bId: string): void {
  mvCommit((current) => {
    const layout = mvSwapSessions(current.layout, aId, bId)
    return layout === current.layout ? current : { ...current, layout, maximized: null }
  })
}

/**
 * Close one pane: a bound pane goes back to the picker (the split keeps its
 * shape), an already empty pane is removed from the tree.
 */
function mvRemovePane(leafId: string): void {
  mvCommit((current) => {
    const leaf = mvLeafById(current.layout, leafId)
    if (leaf === null) return current
    if (leaf.sessionId !== null) {
      const cleared = mvWithSession(current.layout, leafId, null)
      return cleared === current.layout ? current : { ...current, layout: cleared, focused: leafId }
    }
    const leaves = mvLeaves(current.layout)
    if (leaves.length <= 1) return current
    const layout = mvRemoveLeaf(current.layout, leafId)
    if (layout === null) return current
    const nextLeaves = mvLeaves(layout)
    const focused = nextLeaves.some((item) => item.id === current.focused) ? current.focused : nextLeaves[0].id
    return {
      ...current,
      layout,
      focused,
      preset: nextLeaves.length,
      maximized: current.maximized === leafId ? null : current.maximized,
    }
  })
}

/**
 * Put one Session into the split and return the pane that now holds it.
 *
 * Preference order, least destructive first: the pane already holding it (just
 * focus), an empty pane, one new pane while under the cap, and only then a
 * replacement of the focused pane. The first three never disturb what the user
 * already has on screen.
 * @param sessionId - Session to place.
 * @returns the target pane id, or null when the id is unusable.
 */
function mvPutInPane(sessionId: string): string | null {
  if (typeof sessionId !== 'string' || sessionId === '') return null
  const state = mvGetState()
  const leaves = mvLeaves(state.layout)
  const holder = leaves.find((leaf) => leaf.sessionId === sessionId)
  if (holder !== undefined) {
    mvFocus(holder.id)
    return holder.id
  }
  const empty = leaves.find((leaf) => leaf.sessionId === null)
  if (empty !== undefined) {
    mvBind(empty.id, sessionId)
    return empty.id
  }
  if (leaves.length < MV_MAX_PANES) {
    const grown = mvShapeTo(state.layout, leaves.length + 1)
    const fresh = mvLeaves(grown).find((leaf) => leaf.sessionId === null)
    if (fresh !== undefined) {
      mvSetShape(leaves.length + 1)
      mvBind(fresh.id, sessionId)
      return fresh.id
    }
  }
  const fallback = leaves.find((leaf) => leaf.id === state.focused) ?? leaves[0]
  if (fallback === undefined) return null
  mvBind(fallback.id, sessionId)
  return fallback.id
}

/**
 * Name a saved split. An empty name hands it back to the generated title.
 * @param viewId - the saved split to rename.
 * @param name - user-chosen name, trimmed; empty clears the custom name.
 */
function mvRenameView(viewId: string, name: string): void {
  const trimmed = String(name ?? '').trim().slice(0, 60)
  mvCommit((current) => ({
    ...current,
    views: (current.views ?? []).map((view) =>
      view.id === viewId
        ? trimmed === ''
          ? { ...view, name: mvViewName(view.layout), customName: undefined }
          : { ...view, name: trimmed, customName: trimmed }
        : view,
    ),
  }))
}

/**
 * Drop bindings whose Session the host no longer has, keeping pane positions.
 *
 * Saved splits store Session ids forever, so an old split can name Sessions that were deleted
 * or archived. Applying such a split used to bind panes to them — the pane then renders as
 * unavailable, or the retain call fails. Pruning on apply keeps the shape and empties only the
 * panes that cannot be restored; because the applied layout becomes the current view, the
 * stored entry heals itself in the same step.
 * @param layout - a split tree, typically from a saved view.
 * @returns the same shape with dead bindings cleared (never removes panes).
 */
function mvLiveLayout(layout: any): any {
  try {
    const list = PTX.sessions.list.getSnapshot()
    if (list === undefined || list === null || list.phase !== 'ready') return layout
    return mvReconcileTree(layout, (sessionId) => {
      const row = list.byId[sessionId]
      if (row === undefined || row.blank === true) return null
      if (mvIsArchived(sessionId)) return null
      return sessionId
    })
  } catch (error) {
    return layout
  }
}

/** Restore a saved split by view id, pruning Sessions the host no longer has. */
function mvApplyView(viewId: string): void {
  mvCommit((current) => {
    const view = current.views.find((item) => item.id === viewId)
    if (view === undefined) return current
    const layout = mvLiveLayout(view.layout)
    const leaves = mvLeaves(layout)
    /* If pruning left fewer than two Sessions, the split cannot be a "current" arrangement any
       more — but the saved entry is the user's artifact and must not vanish just because one of
       its Sessions was archived. Apply the surviving shape and leave the library untouched. */
    const worthy = mvViewWorthy(layout)
    return {
      ...current,
      layout,
      focused: leaves[0].id,
      preset: leaves.length,
      maximized: null,
      currentViewId: worthy ? view.id : null,
      /* Keep the entry, but rewrite it to the shape that could actually be restored, so a
         Session archived today does not linger in the saved split forever. */
      views: current.views.map((item) => (item.id === view.id ? { ...item, layout } : item)),
    }
  })
}

/** Start an empty split: the next combination becomes its own view. */
function mvStartView(): void {
  mvCommit((current) => ({
    ...current,
    layout: mvPreset(2),
    focused: 'p1',
    preset: 2,
    maximized: null,
    currentViewId: null,
  }))
}

/** Forget one saved split. */
function mvDeleteView(viewId: string): void {
  mvCommit((current) => {
    if (!current.views.some((item) => item.id === viewId)) return current
    /* Deleting the split you are currently on must actually remove it. The layout still
       holds two Sessions, so the next sync would treat the committed state as a brand new
       worthy arrangement and re-capture it instantly — the entry would look undeletable.
       Suppress exactly one capture so the deletion sticks until the user changes something. */
    return {
      ...current,
      views: current.views.filter((item) => item.id !== viewId),
      currentViewId: current.currentViewId === viewId ? null : current.currentViewId,
      captureSuppressed: current.currentViewId === viewId,
    }
  })
}
