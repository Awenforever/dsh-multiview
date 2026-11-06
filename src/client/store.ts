/**
 * The stage's single source of truth: layout tree, focus, maximized pane, saved
 * views and the persisted shape. React reads it through `useSyncExternalStore`;
 * every mutation goes through the pure helpers in `model.ts`.
 */

/** Stage state persisted per device. */
function mvInitialState(): any {
  return { layout: mvPreset(2), focused: 'p1', maximized: null, preset: 2, seeded: false, reconciled: false, views: [] }
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
        version: 2,
        layout: mvState.layout,
        focused: mvState.focused,
        preset: mvState.preset,
        seeded: mvState.seeded,
        views: mvState.views,
      }
      window.localStorage.setItem(MV_STORAGE_KEY, JSON.stringify(durable))
    } catch (error) {
      /* Storage may be unavailable or full; the stage still works in memory. */
    }
  }, 200)
}

/** Ordered Session ids that a layout currently shows; the identity of a view. */
function mvViewKey(layout: any): string {
  return mvLeaves(layout)
    .map((leaf) => leaf.sessionId)
    .filter((sessionId) => sessionId !== null)
    .join(',')
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

/**
 * Remember the current split whenever it shows two or more Sessions.
 * @param layout - the layout to capture.
 * @param views - the current view list.
 * @returns the view list, or null when nothing should change.
 */
function mvCaptureView(layout: any, views: any[]): any[] | null {
  const key = mvViewKey(layout)
  if (key === '' || key.indexOf(',') < 0) return null
  const existing = views.find((view) => view.id === key)
  if (existing !== undefined) {
    if (existing.layout === layout) return null
    return views.map((view) => (view.id === key ? { ...view, layout } : view))
  }
  const next = [{ id: key, name: mvViewName(layout), layout, savedAt: Date.now() }, ...views]
  return next.slice(0, 12)
}

/**
 * Replace the state through a producer and notify once.
 * @param produce - produces the next state, or the same object to skip.
 */
function mvCommit(produce: (current: any) => any): void {
  const produced = produce(mvState)
  if (produced === mvState || produced === null || produced === undefined) return
  let next = produced
  const captured = mvCaptureView(next.layout, next.views ?? [])
  if (captured !== null) next = { ...next, views: captured }
  mvState = next
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
  if (layout === null) return null
  const key = mvViewKey(layout)
  if (key === '' || key.indexOf(',') < 0) return null
  return {
    id: key,
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
  if (raw.version !== 1 && raw.version !== 2) return
  const layout = mvSanitize(raw.layout)
  if (layout === null) return
  const leaves = mvLeaves(layout)
  const focused = leaves.some((leaf) => leaf.id === raw.focused) ? raw.focused : leaves[0].id
  const views = Array.isArray(raw.views) ? raw.views.map(mvSanitizeView).filter((view) => view !== null) : []
  mvState = {
    layout,
    focused,
    maximized: null,
    preset: typeof raw.preset === 'number' ? raw.preset : leaves.length,
    seeded: raw.seeded === true,
    reconciled: false,
    views,
  }
}

/** Forget the saved stage and start from the two-pane preset. */
function mvReset(): void {
  const views = mvState.views
  mvCommit(() => ({ ...mvInitialState(), views }))
  try {
    window.localStorage.removeItem(MV_STORAGE_KEY)
  } catch (error) {
    /* Ignore: the in-memory reset already happened. */
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
    const leaves = mvLeaves(kept)
    const focused = leaves.some((leaf) => leaf.id === mvState.focused) ? mvState.focused : leaves[0].id
    mvCommit((current) => ({ ...current, layout: kept, focused, reconciled: true }))
  } catch (error) {
    mvCommit((current) => ({ ...current, reconciled: true }))
  }
}

/** Switch to a preset pane count, carrying bound Sessions in reading order. */
function mvSetShape(count: number): void {
  mvCommit((current) => {
    const layout = mvShapeTo(current.layout, count)
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

/** Exchange two panes' Sessions. */
function mvSwapLeaves(aId: string, bId: string): void {
  mvCommit((current) => {
    const layout = mvSwapSessions(current.layout, aId, bId)
    return layout === current.layout ? current : { ...current, layout, maximized: null }
  })
}

/**
 * Close one pane: a bound pane goes back to the picker (the split keeps its
 * shape), an already empty pane is removed from the tree. This is what keeps a
 * two-pane split from silently collapsing into one full-width conversation.
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
    return { ...current, layout, focused, preset: nextLeaves.length, maximized: current.maximized === leafId ? null : current.maximized }
  })
}

/** Restore a saved split by view id. */
function mvApplyView(viewId: string): void {
  mvCommit((current) => {
    const view = current.views.find((item) => item.id === viewId)
    if (view === undefined) return current
    const leaves = mvLeaves(view.layout)
    return {
      ...current,
      layout: view.layout,
      focused: leaves[0].id,
      preset: leaves.length,
      maximized: null,
    }
  })
}

/** Forget one saved split. */
function mvDeleteView(viewId: string): void {
  mvCommit((current) =>
    current.views.some((item) => item.id === viewId)
      ? { ...current, views: current.views.filter((item) => item.id !== viewId) }
      : current,
  )
}
