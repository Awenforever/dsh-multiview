/**
 * The stage's single source of truth: layout tree, focus, maximized pane and the
 * persisted shape. React reads it through `useSyncExternalStore`; every mutation
 * goes through the pure helpers in `model.ts`.
 */

/** Stage state persisted per device. */
function mvInitialState(): any {
  return { layout: mvPreset(2), focused: 'p1', maximized: null, preset: 2, seeded: false, reconciled: false }
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
      const durable = { version: 1, layout: mvState.layout, focused: mvState.focused, preset: mvState.preset, seeded: mvState.seeded }
      window.localStorage.setItem(MV_STORAGE_KEY, JSON.stringify(durable))
    } catch (error) {
      /* Storage may be unavailable or full; the stage still works in memory. */
    }
  }, 200)
}

/**
 * Replace the state through a producer and notify once.
 * @param produce - produces the next state, or the same object to skip.
 */
function mvCommit(produce: (current: any) => any): void {
  const next = produce(mvState)
  if (next === mvState || next === null || next === undefined) return
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

/** Read the persisted shape; a corrupt or foreign document falls back to the preset. */
function mvHydrate(): void {
  let raw = null
  try {
    raw = JSON.parse(window.localStorage.getItem(MV_STORAGE_KEY) ?? 'null')
  } catch (error) {
    raw = null
  }
  if (raw === null || typeof raw !== 'object' || raw.version !== 1) return
  const layout = mvSanitize(raw.layout)
  if (layout === null) return
  const leaves = mvLeaves(layout)
  const focused = leaves.some((leaf) => leaf.id === raw.focused) ? raw.focused : leaves[0].id
  mvState = {
    layout,
    focused,
    maximized: null,
    preset: typeof raw.preset === 'number' ? raw.preset : leaves.length,
    seeded: raw.seeded === true,
    reconciled: false,
  }
}

/** Forget the saved stage and start from the two-pane preset. */
function mvReset(): void {
  mvCommit(() => mvInitialState())
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
  let ready = false
  try {
    const list = PTX.sessions.list.getSnapshot()
    ready = list.phase === 'ready'
    if (!ready) return
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

/**
 * Fill empty panes from the live list on first open only; a pane the user
 * emptied on purpose stays empty afterwards.
 */
function mvAutoFill(): void {
  if (mvState.seeded) return
  try {
    const list = PTX.sessions.list.getSnapshot()
    if (list.phase !== 'ready') return
    const used = new Set(mvLeaves(mvState.layout).map((leaf) => leaf.sessionId).filter((id) => id !== null))
    const ordered = (() => {
      const current = list.ids.find((id: string) => ((list.byId[id]?.retainedBy?.mainView ?? 0) as number) > 0)
      return current === undefined ? list.ids.slice() : [current, ...list.ids]
    })()
    const next = mvMapLeaves(mvState.layout, (leaf) => {
      if (leaf.sessionId !== null) return leaf
      const candidate = ordered.find((id: string) => {
        if (used.has(id)) return false
        const row = list.byId[id]
        return row !== undefined && row.blank !== true && !mvIsArchived(id)
      })
      if (candidate === undefined) return leaf
      used.add(candidate)
      return { ...leaf, sessionId: candidate }
    })
    const filled = mvLeaves(next).some((leaf) => leaf.sessionId !== null)
    if (!filled) return
    mvCommit((current) => ({ ...current, layout: next, seeded: true }))
  } catch (error) {
    /* Leave panes empty; the picker is still available. */
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

/** Remove one pane from the split; the last pane is cleared instead of removed. */
function mvRemovePane(leafId: string): void {
  mvCommit((current) => {
    const leaves = mvLeaves(current.layout)
    if (leaves.length <= 1) {
      const cleared = mvWithSession(current.layout, leafId, null)
      return cleared === current.layout ? current : { ...current, layout: cleared }
    }
    const layout = mvRemoveLeaf(current.layout, leafId)
    if (layout === null) return current
    const nextLeaves = mvLeaves(layout)
    const focused = nextLeaves.some((leaf) => leaf.id === current.focused) ? current.focused : nextLeaves[0].id
    return { ...current, layout, focused, maximized: current.maximized === leafId ? null : current.maximized }
  })
}
