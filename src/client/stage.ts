/**
 * The stage: panel chrome, the recursive split renderer, the pane frame and the
 * session picker.
 *
 * Layout state lives in `store.ts`; this file only renders it and turns pointer
 * gestures into the store's pure edits.
 */

/** Stage state subscription for React 18's external-store hook. */
function useMvState(): any {
  return React.useSyncExternalStore(mvSubscribe, mvGetState, mvGetState)
}

/** Sidebar panel-list icon; inherits `currentColor` from the rail. */
/**
 * The sidebar's Split icon, carrying a badge when a pane needs the user.
 *
 * Watching several conversations is only useful if you find out about a blocked one while
 * you are somewhere else. The dot states exist per pane, but they are inside the panel; the
 * icon is the one place visible from every other view, so it mirrors attention here.
 *
 * Uses the slot's own `useSessionStatus` standard prop; if a future host stops providing it
 * the icon still renders, just without the badge.
 */
function MultiviewPanelIcon(props: any) {
  const state = useMvState()
  const readStatuses = typeof props?.useSessionStatus === 'function' ? props.useSessionStatus : null
  const statuses = readStatuses === null ? null : readStatuses((snapshot) => snapshot)
  const count =
    statuses === null || statuses === undefined || typeof statuses.get !== 'function'
      ? 0
      : mvAttentionPanes(state.layout, (sessionId) => mvSessionState(statuses.get(sessionId))).length
  const label =
    count === 0 ? T('panel') : count === 1 ? T('panelAttentionOne') : T('panelAttention').replace('{count}', String(count))
  /* With something waiting, the icon also says how to get there without opening the split. */
  const iconTitle = count === 0 ? label : label + ' · ' + mvShortcutHint('KeyJ')
  /* 16×16 with the shipped rows' own stroke weight, so the glyph sits on the
     same optical grid as 插件 / 自动化任务 / 更多 instead of nudging the label. */
  /* Owner props include `size`: the requested square edge. A fixed 16px glyph would sit a pixel or
     two off the shipped panel icons when the host asks for something else. */
  const edge = typeof props?.size === 'number' && props.size > 0 && props.size <= 48 ? props.size : 16
  return h(
    'span',
    { className: 'mv-icon-badge-host', 'aria-label': label, title: iconTitle, role: count === 0 ? undefined : 'img' },
    h(
      'svg',
      { viewBox: '0 0 16 16', width: edge, height: edge, 'aria-hidden': true, fill: 'none' },
      h('rect', { x: 1.75, y: 2.75, width: 12.5, height: 10.5, rx: 2.5, stroke: 'currentColor', strokeWidth: 1.4 }),
      h('path', { d: 'M8 2.75v10.5', stroke: 'currentColor', strokeWidth: 1.2 }),
    ),
    count === 0
      ? null
      : h('span', {
          className: 'mv-icon-badge',
          'data-attention': 'true',
          'data-count': String(count),
          'aria-hidden': true,
        }),
  )
}

/** Status dot state for one pane. The classification lives in `model.ts` so the pane header,
 *  the collapsed switcher and the sidebar badge cannot drift apart. */
const mvDotState = mvSessionState

/** Accessible label for a dot state. */
function mvDotLabel(state: string): string {
  if (state === 'running') return T('running')
  if (state === 'waiting') return T('waiting')
  if (state === 'unread') return T('unread')
  return ''
}

/** Session rows the picker may offer: non-blank, non-archived, newest first. */
/**
 * Sessions a pane can be bound to, ordered like the sidebar does it: most
 * recently active first, with child sessions nested (indented) under the
 * conversation they were spawned from.
 * @param query - free text matched against title and id.
 * @returns rows with a `depth` for the picker's indent.
 */
function mvPickableRows(
  query: string,
  views: any[] = [],
  currentViewId: string | null = null,
  onStage: string[] = [],
): any[] {
  const need = query.trim().toLowerCase()
  try {
    const list = PTX.sessions.list.getSnapshot()
    const rows = new Map<string, any>()
    for (const id of list.ids) {
      const row = list.byId[id]
      if (row === undefined || row.blank === true) continue
      if (mvIsArchived(id)) continue
      rows.set(id, row)
    }

    /* Workspace grouping follows the sidebar's own order, default workspace first. */
    const snapshot = PTX.workspaces.list.getSnapshot()
    const items = Array.isArray(snapshot?.items) ? snapshot.items : []
    const workspaceOf = new Map<string, string>()
    for (const item of items) {
      for (const id of item.sessionIds ?? []) workspaceOf.set(id, item.workspaceId)
    }
    const groups: { key: string; label: string; ids: string[] }[] = []
    for (const item of items) {
      const ids = (item.sessionIds ?? []).filter((id: string) => rows.has(id))
      if (ids.length === 0) continue
      const label = mvWorkspaceLabel(item)
      groups.push({ key: String(item.workspaceId), label: String(label), ids })
    }
    const loose = [...rows.keys()].filter((id) => !workspaceOf.has(id))
    if (loose.length > 0) groups.push({ key: '__loose__', label: '', ids: loose })
    if (groups.length === 0) return []

    const rank = (id: string): number => {
      const value = rows.get(id)?.updatedAt
      return typeof value === 'number' ? value : 0
    }
    const out: any[] = []
    const multiple = groups.filter((group) => group.ids.length > 0 && group.label !== '').length > 1

    for (const group of groups) {
      const scoped = new Set(group.ids)
      const children = new Map<string, string[]>()
      const roots: string[] = []
      const orphan = new Set<string>()
      for (const id of group.ids) {
        const parentId = rows.get(id)?.parentId
        if (typeof parentId !== 'string' || parentId === id) {
          roots.push(id)
          continue
        }
        if (scoped.has(parentId)) {
          const bucket = children.get(parentId)
          if (bucket === undefined) children.set(parentId, [id])
          else bucket.push(id)
        } else {
          orphan.add(id)
          roots.push(id)
        }
      }
      const byRank = (left: string, right: string): number => rank(right) - rank(left)
      roots.sort(byRank)
      for (const bucket of children.values()) bucket.sort(byRank)

      const before = out.length
      const append = (id: string, depth: number): void => {
        const row = rows.get(id)
        if (row === undefined) return
        const raw = row.title === undefined || row.title === '' ? id : row.title
        const shown = orphan.has(id) ? Math.max(depth, 1) : depth
        const title = shown > 0 ? '↳ ' + raw : raw
        const matched = need === '' || raw.toLowerCase().includes(need) || id.toLowerCase().includes(need)
        const owner = mvViewOwner(id, views, currentViewId)
      if (matched) {
        out.push({
          id,
          title,
          depth: shown,
          owner: owner === null ? null : owner.name,
          /* Already on this split: picking it moves it rather than adding it. */
          onStage: onStage.includes(id),
        })
      }
        for (const childId of children.get(id) ?? []) append(childId, Math.min(shown + 1, 3))
      }
      for (const id of roots) append(id, 0)
      if (multiple && out.length > before && group.label !== '') {
        out.splice(before, 0, { kind: 'group', id: group.key, title: group.label })
      }
    }
    /* A long sidebar must not become a silent cut-off: past the cap the list says how many are
       hidden, and typing still narrows against the full set because the cap is applied last. */
    const cap = 240
    if (out.length > cap) {
      const kept = out.slice(0, cap)
      kept.push({ kind: 'more', id: '__more__', remaining: out.length - cap })
      return kept
    }
    return out
  } catch (error) {
    return []
  }
}

/** Empty-pane session picker: filter field plus the most recent sessions. */
function MvPanePicker(props) {
  const { onPick, views, currentViewId, onStage } = props
  const [query, setQuery] = React.useState('')
  /* Content hits arrive asynchronously; `state` lets the list say "searching" without a spinner. */
  const [content, setContent] = React.useState<any>({ query: '', hits: [], hasMore: false, state: 'idle' })
  React.useEffect(() => {
    const text = String(query ?? '').trim()
    const search = PTX !== null && typeof PTX.sessions?.search === 'function' ? PTX.sessions.search : null
    if (search === null || text.length < 2) {
      setContent({ query: text, hits: [], hasMore: false, state: 'idle' })
      return undefined
    }
    let live = true
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    setContent((current) => ({ ...current, query: text, state: 'searching' }))
    /* Debounced: a keystroke should not start a host request per character. */
    const timer = setTimeout(() => {
      Promise.resolve(search(text, controller === null ? undefined : controller.signal))
        .then((answer) => {
          if (!live) return
          const items = answer?.ok === true ? answer.value?.items : Array.isArray(answer?.items) ? answer.items : []
          setContent({
            query: text,
            hits: Array.isArray(items) ? items : [],
            hasMore: answer?.ok === true ? answer.value?.hasMore === true : answer?.hasMore === true,
            state: 'ready',
          })
        })
        .catch(() => {
          if (live) setContent({ query: text, hits: [], hasMore: false, state: 'failed' })
        })
    }, 160)
    return () => {
      live = false
      clearTimeout(timer)
      if (controller !== null) controller.abort()
    }
  }, [query])
  const titleRows = mvPickableRows(query, views ?? [], currentViewId ?? null, onStage ?? [])
  /* Only hits for sessions this host still lists: a snippet from an archived or deleted session
     cannot be opened from here. */
  const snapshot = (() => {
    try {
      return PTX === null ? null : PTX.sessions.list.getSnapshot()
    } catch (error) {
      return null
    }
  })()
  const titleOf = (id: string): string | null => {
    const row = snapshot === null ? undefined : snapshot.byId?.[id]
    if (row === undefined || row === null) return null
    if (row.blank === true) return null
    return typeof row.title === 'string' && row.title !== '' ? row.title : id
  }
  const usableHits = (content.hits ?? []).filter((hit: any) => titleOf(hit?.sessionId) !== null)
  const rows = usableHits.length === 0 ? titleRows : mvMergeSearchRows(titleRows, usableHits, titleOf, 240)
  const searching = content.state === 'searching' && content.query === String(query ?? '').trim()
  return h(
    'div',
    { className: 'mv-picker', 'data-mv-picker': '' },
    h('input', {
      className: 'mv-picker-search',
      type: 'search',
      value: query,
      placeholder: T('pickSearch'),
      'aria-label': T('pickSearch'),
      autoFocus: true,
      onChange: (event) => setQuery(event.target.value),
      onKeyDown: (event) => {
        if (event.key === 'Enter' && rows.length > 0) onPick(rows[0].id)
        if (event.key === 'Escape') {
          if (typeof props.onCancel === 'function') props.onCancel()
          else event.currentTarget.blur()
        }
      },
    }),
    h(
      'div',
      { className: 'mv-picker-list' },
      rows.length === 0
        ? h(
            'div',
            { className: 'mv-picker-empty' },
            /* Two different situations, two different sentences: a filter that matches nothing
               versus a host where no conversation exists yet. "No matches" is misleading for a
               first run, where there is nothing to match in the first place. */
            searching
              ? T('pickSearching')
              : query.trim() === ''
              ? T('pickNone')
              : T('pickEmpty'),
          )
        : rows.map((row) =>
            row.kind === 'group'
              ? h('div', { key: 'group-' + row.id, className: 'mv-picker-group', role: 'presentation' }, row.title)
              : row.kind === 'more'
              ? h(
                  'div',
                  {
                    key: 'more',
                    className: 'mv-picker-more',
                    'data-remaining': String(row.remaining),
                  },
                  mvFormat(T('pickMore'), { count: String(row.remaining) }),
                )
              : h(
                  'button',
                  {
                    key: row.id,
                    type: 'button',
                    className: 'mv-picker-item',
                    'data-depth': String(row.depth ?? 0),
                    'data-owned': row.owner === null || row.owner === undefined ? undefined : 'true',
                    disabled: row.owner !== null && row.owner !== undefined,
                    style: row.depth === 0 ? undefined : { paddingLeft: String(8 + row.depth * 14) + 'px' },
                    title:
                      row.owner === null || row.owner === undefined
                        ? row.onStage === true
                          ? row.title + ' · ' + T('pickOnStage')
                          : row.title
                        : row.title + ' · ' + T('views') + ': ' + row.owner,
                    onClick: () => onPick(row.id),
                  },
                  h('span', { className: 'mv-picker-title' }, row.title),
                  row.owner === null || row.owner === undefined
                    ? row.onStage === true
                      ? h('span', { className: 'mv-picker-owner' }, T('pickOnStage'))
                      : typeof row.snippet === 'string' && row.snippet !== ''
                      ? h('span', { className: 'mv-picker-snippet' }, row.snippet)
                      : null
                    : h('span', { className: 'mv-picker-owner' }, row.owner),
                ),
          ),
    ),
  )
}

/**
 * Open a file chip from a pane in the session's native view.
 *
 * File previews go through the right sidebar, which ships no session surface
 * while any main panel is active — clicking a file inside a pane would raise
 * "sidebarRight: no session surface is mounted" and dead-end in a dialog.
 * Instead: leave the split for that Session, then click the same chip in the
 * native conversation once it has rendered.
 * @param sessionId - the pane's Session.
 * @param label - the chip's visible path, used to find it again.
 */
function mvOpenFileInNative(sessionId: string, label: string): void {
  try {
    PTX.uiWorkspace.openSession(sessionId)
  } catch (error) {
    console.error('dsh-multiview: switching to the native view failed', error)
    return
  }
  const attempt = (remaining: number): void => {
    if (remaining <= 0) return
    const chips = document.querySelectorAll('button[class*="fileLink"], a[class*="fileLink"]')
    for (const chip of chips) {
      if (chip.closest('[data-multiview]') !== null) continue
      if ((chip.textContent ?? '').trim() !== label) continue
      ;(chip as HTMLElement).click()
      return
    }
    setTimeout(() => attempt(remaining - 1), 120)
  }
  setTimeout(() => attempt(14), 140)
}

/** One draggable split boundary. */
function MvDivider(props) {
  const { node, onResize } = props
  const [dragging, setDragging] = React.useState(false)
  const ref = React.useRef(null)
  const lastRatio = React.useRef(node.ratio)

  /**
   * Ratio under the pointer, measured against the split container.
   * @param dir - split axis.
   * @param event - pointer event.
   * @returns the requested ratio, or the last accepted one when unmeasurable.
   */
  const ratioAt = (dir: string, event: any): number => {
    const element = ref.current
    if (element === null) return lastRatio.current
    const parent = element.parentElement
    if (parent === null) return lastRatio.current
    const rect = parent.getBoundingClientRect()
    const size = dir === 'row' ? rect.width : rect.height
    if (size === 0) return lastRatio.current
    const offset = dir === 'row' ? event.clientX - rect.left : event.clientY - rect.top
    return offset / size
  }

  // Listeners are attached inside pointerdown, not from an effect: an effect
  // commits after paint, so the first pointermove frames of a fast drag would
  // be dropped (observed on a real desktop window). The sibling slots are moved
  // directly while dragging and the store is updated once on release, so a drag
  // never re-renders the transcripts.
  const beginDrag = (event: any) => {
    if (event.button !== 0) return
    event.preventDefault()
    setDragging(true)
    const dir = node.dir
    const splitId = node.id
    const divider = ref.current
    const first = divider === null ? null : divider.previousElementSibling
    const second = divider === null ? null : divider.nextElementSibling
    let latest = node.ratio
    const move = (moveEvent: PointerEvent) => {
      latest = mvClampRatio(ratioAt(dir, moveEvent))
      lastRatio.current = latest
      if (first !== null) first.style.flexGrow = String(latest)
      if (second !== null) second.style.flexGrow = String(1 - latest)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      setDragging(false)
      if (latest !== node.ratio) onResize(splitId, latest)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  /* Arrow keys move the boundary, so the layout is reachable without a pointer;
     Shift takes 5% steps for a wide layout, and Enter/Space/Home restore an even
     split. The separator reports its current split either way. */
  const onKeyDown = (event) => {
    const decrease = node.dir === 'row' ? 'ArrowLeft' : 'ArrowUp'
    const increase = node.dir === 'row' ? 'ArrowRight' : 'ArrowDown'
    if (event.key === 'Home' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onResize(node.id, 0.5)
      return
    }
    if (event.key !== decrease && event.key !== increase) return
    event.preventDefault()
    const size = event.shiftKey ? 0.05 : 0.02
    onResize(node.id, node.ratio + (event.key === increase ? size : -size))
  }
  return h('div', {
    ref,
    className: 'mv-divider',
    'data-dir': node.dir,
    'data-divider': node.id,
    'data-dragging': dragging ? 'true' : 'false',
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': node.dir === 'row' ? 'vertical' : 'horizontal',
    'aria-label': T('divider'),
    'aria-valuenow': String(Math.round(node.ratio * 100)),
    'aria-valuemin': '22',
    'aria-valuemax': '78',
    onPointerDown: beginDrag,
    onKeyDown,
  })
}

/** Render one split node: two sized slots around a draggable boundary. */
function MvSplitView(props) {
  const { node, surface } = props
  return h(
    'div',
    { className: 'mv-split', 'data-dir': node.dir },
    h('div', { className: 'mv-slot', 'data-dir': node.dir, style: { flexGrow: node.ratio } }, renderMvNode(node.a, surface)),
    h(MvDivider, { node, onResize: surface.onResize }),
    h('div', { className: 'mv-slot', 'data-dir': node.dir, style: { flexGrow: 1 - node.ratio } }, renderMvNode(node.b, surface)),
  )
}

/** Render one pane frame. */
function PaneFrame(props) {
  const { leaf, surface } = props
  const { state, dragging } = surface
  const focused = state.focused === leaf.id
  const sessionId = leaf.sessionId
  const title = sessionId === null ? T('empty') : mvDisplayTitle(mvTitle(sessionId), T('untitled'), T('empty'))
  const status = sessionId === null ? undefined : surface.statuses.get(sessionId)
  const dot = mvDotState(status)
  const maximized = state.maximized === leaf.id
  /* A bound pane's ✕ clears it; an empty pane's ✕ removes the pane, which is impossible at the
     two-pane minimum. Hide the button rather than offering an action that cannot happen. */
  const removable = sessionId !== null || mvLeaves(state.layout).length > 2

  return h(
    'div',
    {
      className: 'mv-pane',
      'data-pane-id': leaf.id,
      'data-pane': '',
      'data-focused': focused ? 'true' : 'false',
      'data-drop': dragging.over === leaf.id && dragging.from !== null && dragging.from !== leaf.id ? 'true' : 'false',
      'data-drag-source': dragging.from === leaf.id ? 'true' : 'false',
      onPointerDownCapture: () => surface.onFocus(leaf.id),
      onFocusCapture: () => surface.onFocus(leaf.id),
    },
    h(
      'div',
      { className: 'mv-head', 'data-pane-head': '' },
      dot === 'idle'
        ? h('span', { className: 'mv-dot', 'data-state': dot, 'aria-hidden': true })
        : /* A pane that wants the user is the one thing worth clicking in this header:
             the dot focuses its own pane instead of asking the reader to aim at the body. */
          h('button', {
            type: 'button',
            className: 'mv-dot mv-dot-action',
            'data-state': dot,
            /* The dot is where a reader looks when a pane wants them, which makes it the one
               honest place to mention the chord that walks between such panes. */
            title: mvDotLabel(dot) + ' · ' + mvShortcutHint('KeyJ'),
            'aria-label': mvDotLabel(dot),
            onClick: () => surface.onFocus(leaf.id),
          }),
      h(
        'span',
        {
          className: 'mv-head-title',
          title: sessionId === null ? T('empty') : title,
          onPointerDown: (event) => surface.onHeadPointerDown(leaf.id, event),
        },
        title,
      ),
      h(
        'div',
        { className: 'mv-head-actions' },
        /* Maximizing an empty pane would fill the stage with a picker and hide every other
           conversation, so the control only exists where it does something useful. */
        sessionId === null
          ? null
          : h(MvIconButton, {
              label: maximized ? T('restore') : T('maximize'),
              hint: mvShortcutHint('KeyM'),
              path: maximized ? MV_ICON.restore : MV_ICON.maximize,
              onClick: () => surface.onMaximize(leaf.id),
            }),
        sessionId === null
          ? null
          : h(MvIconButton, {
              label: T('paneChange'),
              path: MV_ICON.change,
              onClick: () => surface.onRepick(leaf.id),
            }),
        sessionId === null
          ? null
          : h(MvIconButton, {
              label: T('openMain'),
              path: MV_ICON.external,
              onClick: () => surface.onOpenMain(sessionId),
            }),
        removable
          ? h(MvIconButton, {
              label: T('remove'),
              hint: mvShortcutHint('KeyW'),
              path: MV_ICON.close,
              onClick: () => surface.onRemove(leaf.id),
            })
          : null,
      ),
    ),
    h(
      'div',
      { className: 'mv-pane-body' },
      sessionId !== null && surface.repicking === leaf.id
        ? h(MvPanePicker, {
            onPick: (id) => {
              /* Binding to this pane swaps its conversation; picking one that already lives in
                 another pane moves it, which is the same rule as everywhere else. */
              surface.onBind(leaf.id, id)
              surface.onRepick(leaf.id)
            },
            onCancel: () => surface.onRepick(leaf.id),
            views: surface.state.views,
            currentViewId: surface.state.currentViewId,
            onStage: mvLeaves(surface.state.layout)
              .map((item) => item.sessionId)
              .filter((id) => id !== null),
          })
        : sessionId === null
        ? h(MvPanePicker, {
          onPick: (id) => surface.onBind(leaf.id, id),
          views: surface.state.views,
          currentViewId: surface.state.currentViewId,
          /* Which conversations are already on this split, so the picker can say so. */
          onStage: mvLeaves(surface.state.layout)
            .map((item) => item.sessionId)
            .filter((id) => id !== null),
        })
        : h(MvPaneHost, {
              sessionId,
              SessionProvider: surface.SessionProvider,
              renderSlot: surface.renderSlot,
              useSessions: surface.useSessions,
            }),
    ),
  )
}

/* The status map is produced by a hook inside the stage; shortcuts and menu
   actions run outside React, so the stage publishes the latest map here. */
let mvStatusMirror: any = null

/** Latest per-Session status map, or null before the stage first rendered. */
function mvStatusSnapshot(): any {
  return mvStatusMirror
}

/**
 * Panes that want the user right now, in reading order. The rule itself lives in
 * `model.ts` so it can be tested without a renderer; this only supplies the status map.
 * @param state - current multiview state.
 * @param statuses - per-Session status map.
 * @returns pane ids in a stable order.
 */
function mvAttentionLeaves(state: any, statuses: any): string[] {
  return mvAttentionPanes(state.layout, (sessionId) =>
    mvDotState(statuses === undefined || statuses === null ? undefined : statuses.get(sessionId)),
  )
}

/**
 * The next pane wanting attention after the focused one, wrapping around.
 * @param state - current multiview state.
 * @param statuses - per-Session status map.
 * @returns the pane to focus, or null when nothing is waiting.
 */
function mvNextAttention(state: any, statuses: any): string | null {
  return mvNextAttentionPane(state.layout, state.focused, (sessionId) =>
    mvDotState(statuses === undefined || statuses === null ? undefined : statuses.get(sessionId)),
  )
}

/**
 * The conversation inside a pane, memoized on its identity: focus changes,
 * dragging and other chrome updates re-render the frame, never the transcript.
 */
const MvPaneHost = React.memo(
  function MvPaneHost(props) {
    return h(PaneHost, {
      sessionId: props.sessionId,
      SessionProvider: props.SessionProvider,
      renderSlot: props.renderSlot,
      useSessions: props.useSessions,
    })
  },
  (previous, next) =>
    previous.sessionId === next.sessionId &&
    previous.SessionProvider === next.SessionProvider &&
    previous.renderSlot === next.renderSlot &&
    previous.useSessions === next.useSessions,
)


/** Dispatch one tree node to its renderer. */
function renderMvNode(node: any, surface: any): any {
  if (node.kind === 'leaf') return h(PaneFrame, { key: node.id, leaf: node, surface })
  return h(MvSplitView, { key: node.id, node, surface })
}

/** Panel-level failure containment: the central column keeps a readable note. */
class MvStageBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { failed: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error, info) {
    console.error('dsh-multiview: stage crashed', error, info === undefined ? '' : info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return h('div', { className: 'mv-root' }, h(MvNote, { error: true }, mvFormat(T('stageCrashed'), { message: this.state.message })))
    }
    return this.props.children
  }
}

/** Live update snapshot. */
function useMvUpdate() {
  return React.useSyncExternalStore(mvUpdateSubscribe, mvUpdateGetState, mvUpdateGetState)
}

/** Short one-line status for the update button's tooltip. */
function mvUpdateCaption(update: any): string {
  if (update.status === 'checking') return T('updateChecking')
  if (update.status === 'installing') return T('updateInstalling')
  if (update.status === 'done') return T('updateDone')
  if (update.status === 'unsupported') return T('updateUnsupported')
  if (update.status === 'error') return mvFirstText([update.error], T('updateTitleFailed'))
  if (update.available === true) return mvFormat(T('updateAvailable'), { version: update.latest ?? '' })
  if (update.localOnly === true) return T('updateLocal')
  if (update.checkedAt > 0) return mvFormat(T('updateLatest'), { version: update.installed ?? MV_PLUGIN_VERSION })
  return T('updateIdle')
}

/** Update surface: one icon, a red dot when a release exists, a confirm dialog. */
function MvUpdateButton() {
  const update = useMvUpdate()
  const [open, setOpen] = React.useState(false)
  const caption = mvUpdateCaption(update)
  return h(
    React.Fragment,
    null,
    h(
      'button',
      {
        type: 'button',
        className: 'mv-icon mv-update',
        'data-has-update': update.available === true ? 'true' : 'false',
        'aria-haspopup': 'dialog',
        'data-busy': update.status === 'checking' || update.status === 'installing' ? 'true' : 'false',
        title: caption,
        'aria-label': T('updateCheck'),
        onClick: () => {
          setOpen(true)
          /* A cached "update available" can be hours old, and a failed check
             leaves nothing to show; both deserve a fresh answer. */
          const stale =
            update.checkedAt === 0 ||
            Date.now() - update.checkedAt > MV_UPDATE_STALE ||
            update.status === 'error' ||
            update.status === 'unsupported'
          if (update.available !== true || stale) void mvUpdateCheck(true)
        },
      },
      h(MvGlyph, { path: update.available === true ? MV_ICON.updateInstall : MV_ICON.updateCheck }),
    ),
    open ? h(MvUpdateDialog, { update, caption, onClose: () => setOpen(false) }) : null,
  )
}

/** Confirm-and-run dialog for the market's own update operation. */
function MvUpdateDialog(props) {
  const { update, caption, onClose } = props
  const dialogRef = React.useRef(null)
  const returnRef = React.useRef(null)

  /* Move focus into the dialog, contain Tab, let Escape close, and give focus
     back to whatever opened the dialog when it unmounts. */
  React.useEffect(() => {
    const previous = document.activeElement
    returnRef.current = previous
    const dialog = dialogRef.current
    if (dialog !== null) {
      const first = dialog.querySelector('button:not(:disabled)')
      if (first !== null) first.focus()
      else dialog.focus()
    }
    return () => {
      const target = returnRef.current
      if (target !== null && typeof target.focus === 'function') {
        try {
          target.focus()
        } catch (error) {
          /* The trigger may have been removed; losing focus beats throwing. */
        }
      }
    }
  }, [])

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (dialog === null) return
    const focusable = [...dialog.querySelectorAll('button:not(:disabled)')]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  const busy = update.status === 'installing'
  const checking = update.status === 'checking'
  const failed = update.status === 'error'
  const canInstall = update.available === true && !busy && update.canAutoInstall === true && update.localOnly !== true

  /* The dialog opens because the user already asked; a second "check" action in
     here would only ask them to repeat themselves. */
  const title =
    update.status === 'available'
      ? mvFormat(T('updateTitleAvailable'), { version: update.latest ?? '' })
      : checking
        ? T('updateTitleChecking')
        : failed
          ? T('updateTitleFailed')
          : update.status === 'unsupported'
            ? T('updateTitleUnsupported')
          : busy
            ? T('updateTitleInstalling')
            : update.checkedAt > 0
              ? T('updateTitleIdle')
              : T('updateTitleChecking')

  const body = h(
    'div',
    { className: 'mv-dialog-body' },
    h('div', { className: 'mv-dialog-title' }, title),
    h('div', { className: 'mv-dialog-text' }, caption),
    canInstall ? h('div', { className: 'mv-dialog-text mv-dialog-hint' }, T('updateConfirmHint')) : null,
    (update.available === true && update.canAutoInstall !== true) || failed || update.status === 'unsupported'
      ? h('div', { className: 'mv-dialog-text' }, T('updateManual'))
      : null,
    busy && update.operationState !== null ? h('div', { className: 'mv-dialog-text' }, String(update.operationState)) : null,
    update.status === 'done' && update.restartRequired === true && update.restartSupported === true
      ? h('div', { className: 'mv-dialog-text' }, T('updateDone'))
      : null,
  )

  const actions = h(
    'div',
    { className: 'mv-dialog-actions' },
    canInstall
      ? h('button', { type: 'button', className: 'mv-dialog-button', onClick: onClose }, T('updateLater'))
      : null,
    failed
      ? h('button', { type: 'button', className: 'mv-dialog-button', onClick: () => void mvUpdateCheck(true) }, T('updateRetry'))
      : null,
    h(
      'button',
      {
        type: 'button',
        className: 'mv-dialog-button mv-dialog-button--primary',
        disabled: busy,
        onClick: canInstall ? () => void mvUpdateInstall() : onClose,
      },
      canInstall ? T('updateInstall') : T('updateClose'),
    ),
  )
  return h(
    'div',
    {
      className: 'mv-dialog-backdrop',
      onClick: (event: any) => {
        if (event.target === event.currentTarget) onClose()
      },
    },
    h(
      'div',
      {
        ref: dialogRef,
        className: 'mv-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
        tabIndex: -1,
        onKeyDown,
      },
      body,
      actions,
    ),
  )
}

/**
 * Sidebar row action: put this Session into the split without leaving it.
 *
 * The host renders one icon button per Session row and owns the hover strip; this
 * occupant only decides the glyph, the state and the action. Both this and the menu
 * row below register into public list slots (`replaceRisk: none`).
 */
function MvRowSplitAction(props) {
  const { sessionId } = props
  const state = useMvState()
  const holder = mvLeaves(state.layout).find((leaf) => leaf.sessionId === sessionId)
  const label = holder === undefined ? T('rowActionAdd') : T('rowActionFocus')
  return h(
    'button',
    {
      type: 'button',
      className: 'mv-row-action',
      'data-active': holder === undefined ? 'false' : 'true',
      title: label,
      'aria-label': label,
      onClick: () => mvOpenSessionInSplit(sessionId),
    },
    h(MvGlyph, { path: MV_ICON.split }),
  )
}

/**
 * The same action as a menu row, for touch and keyboard users: the row's hover
 * strip is hidden on hoverless devices, so the Session menu is the second entry.
 */
function MvRowMenuAction(props) {
  const { sessionId } = props
  const closeMenu = typeof props.useMenuOpenState === 'function' ? props.useMenuOpenState()[1] : null
  return h(
    'button',
    {
      type: 'button',
      role: 'menuitem',
      className: 'mv-menu-row',
      onClick: () => {
        mvOpenSessionInSplit(sessionId)
        if (typeof closeMenu === 'function') closeMenu(false)
      },
    },
    h(MvGlyph, { path: MV_ICON.split }),
    h('span', null, T('rowActionMenu')),
  )
}

/**
 * One saved split: apply it, rename it in place, or delete it.
 *
 * Renaming matters because the automatic name is derived from session titles, and Long
 * Session Titles About Something. make the list hard to scan.
 */
function MvViewsRow(props) {
  const { view, active, onApply, onDelete } = props
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(view.name)
  const open = () => {
    setDraft(typeof view.customName === 'string' ? view.customName : view.name)
    setEditing(true)
  }
  const commit = () => {
    mvRenameView(view.id, draft)
    setEditing(false)
  }
  if (editing) {
    return h(
      'div',
      { className: 'mv-views-row', 'data-active': active ? 'true' : 'false' },
      h('input', {
        className: 'mv-views-input',
        value: draft,
        autoFocus: true,
        'aria-label': T('viewsRename'),
        onChange: (event) => setDraft(event.target.value),
        onBlur: commit,
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setEditing(false)
          }
        },
      }),
    )
  }
  return h(
    'div',
    {
      className: 'mv-views-row',
      'data-active': active ? 'true' : 'false',
      'aria-current': active ? 'true' : undefined,
    },
    h(
      'button',
      {
        type: 'button',
        className: 'mv-views-name',
        title: T('viewsHint'),
        onClick: onApply,
      },
      view.name,
    ),
    h(
      'button',
      {
        type: 'button',
        className: 'mv-views-del',
        title: T('viewsRename'),
        'aria-label': T('viewsRename'),
        onClick: (event) => {
          event.stopPropagation()
          open()
        },
      },
      '✎',
    ),
    h(
      'button',
      {
        type: 'button',
        className: 'mv-views-del',
        title: T('viewsDelete'),
        'aria-label': T('viewsDelete'),
        onClick: (event) => {
          event.stopPropagation()
          onDelete()
        },
      },
      '✕',
    ),
  )
}

/** Saved splits: auto-captured whenever two or more panes are bound. */
function MvViewsButton(props) {
  const { views, currentId } = props
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef(null)

  /* A disclosure that cannot be dismissed from the keyboard is a trap; close it
     on Escape and on any pointer press outside the popover. */
  React.useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event) => {
      const wrap = wrapRef.current
      if (wrap !== null && event.target instanceof Node && !wrap.contains(event.target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, [open])
  return h(
    'div',
    { className: 'mv-views', ref: wrapRef },
    h(
      'button',
      {
        type: 'button',
        className: 'mv-icon mv-views-toggle',
        'data-active': open ? 'true' : 'false',
        'data-count': views.length > 0 ? String(views.length) : undefined,
        'aria-expanded': open ? 'true' : 'false',
        'aria-haspopup': 'true',
        title: T('views'),
        'aria-label': T('views'),
        onClick: () => setOpen((value) => !value),
      },
      h(MvGlyph, { path: MV_ICON.views }),
      views.length > 0 ? h('span', { className: 'mv-views-count' }, String(views.length)) : null,
    ),
    open
      ? h(
          'div',
          /* A disclosure popover, not a menu: each row carries several separate actions
             (apply, rename, delete), which `menuitem` cannot express. Declaring `menu` here
             would promise arrow-key menu semantics that plain buttons do not implement. */
          { className: 'mv-views-pop', role: 'group', 'aria-label': T('views') },
          views.length === 0
            ? h('div', { className: 'mv-views-empty' }, T('viewsEmpty'))
            : views.map((view) =>
                h(MvViewsRow, {
                  key: view.id,
                  view,
                  active: view.id === currentId,
                  onApply: () => {
                    mvApplyView(view.id)
                    setOpen(false)
                  },
                  onDelete: () => mvDeleteView(view.id),
                }),
              ),
        )
      : null,
  )
}

/** Occupant of the `main` panel key: the whole split surface. */
function MultiviewStage(props) {
  const { renderSlot, SessionProvider, useSessions, useSessionStatus } = props
  const list = useSessions((state) => state)
  const statuses = useSessionStatus((state) => state)
  mvStatusMirror = statuses
  const state = useMvState()
  const rootRef = React.useRef(null)
  const [narrow, setNarrow] = React.useState(false)
  const [drag, setDrag] = React.useState({ from: null, over: null })
  const dragRef = React.useRef({ from: null, over: null, startX: 0, startY: 0, active: false })

  const openedRef = React.useRef(false)

  React.useEffect(() => {
    mvReconcile()
    mvClearArchived()
    if (openedRef.current) return
    try {
      const snapshot = PTX.sessions.list.getSnapshot()
      if (snapshot.phase !== 'ready') return
      const current = snapshot.ids.find((id) => ((snapshot.byId[id]?.retainedBy?.mainView ?? 0) as number) > 0)
      openedRef.current = true
      if (typeof current === 'string') mvOpenForSession(current)
    } catch (error) {
      openedRef.current = true
    }
  }, [list])

  React.useEffect(() => {
    mvUpdateHydrate()
    mvUpdateMaybeAutoCheck()
  }, [])

  React.useEffect(() => {
    const element = rootRef.current
    if (element === null) return undefined
    const onClick = (event: any): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      const chip = target.closest('button[class*="fileLink"], a[class*="fileLink"]')
      if (chip === null) return
      const pane = chip.closest('[data-pane]')
      const leafId = pane === null ? null : pane.getAttribute('data-pane-id')
      const leaf = leafId === null ? null : mvLeafById(mvGetState().layout, leafId)
      const sessionId = leaf === null ? null : leaf.sessionId
      if (sessionId === null) return
      event.preventDefault()
      event.stopPropagation()
      mvOpenFileInNative(sessionId, (chip.textContent ?? '').trim())
    }
    element.addEventListener('click', onClick, true)
    return () => element.removeEventListener('click', onClick, true)
  }, [])

  React.useEffect(() => {
    const element = rootRef.current
    if (element === null || typeof ResizeObserver !== 'function') return undefined
    /* Committing state from inside the observer callback makes the collapse happen during
       the same resize pass, which browsers report as "ResizeObserver loop completed with
       undelivered notifications" — a warning that looks like a crash in a user console.
       Deferring to the next frame keeps the measurement and the update in separate passes,
       and the last-value guard keeps a resize storm from queueing renders. */
    let pending = false
    /* Starts as "unknown" on purpose: the component mounts assuming a wide stage, so a
       stage that is already narrow when it appears must still get its first correction
       (seeding this from the measurement would make that first correction a no-op). */
    let last = null
    let frame = 0
    const measure = () => {
      pending = false
      const next = element.clientWidth < 900 || element.clientHeight < 520
      if (next === last) return
      last = next
      setNarrow(next)
    }
    const observer = new ResizeObserver(() => {
      if (pending) return
      pending = true
      frame = requestAnimationFrame(measure)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [])

  React.useEffect(() => {
    const move = (event: PointerEvent) => {
      const record = dragRef.current
      if (!record.active) return
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const pane = target === null ? null : target.closest('[data-pane]')
      const over = pane === null ? null : pane.getAttribute('data-pane-id')
      if (over === record.over) return
      record.over = over
      setDrag({ from: record.from, over })
    }
    const up = () => {
      const record = dragRef.current
      const from = record.from
      const over = record.over
      dragRef.current = { from: null, over: null, startX: 0, startY: 0, active: false }
      document.body.style.userSelect = ''
      setDrag({ from: null, over: null })
      if (record.active && from !== null && over !== null && from !== over) mvSwapLeaves(from, over)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  /* Which pane is being re-pointed at another conversation, if any. Replace-in-place exists so a
     two-pane split can swap a conversation without first deleting a pane (which is impossible
     there) or growing the split. */
  const [repicking, setRepicking] = React.useState(null)

  const surface = {
    useSessions,
    state,
    statuses,
    repicking,
    onRepick: (leafId) => setRepicking((current) => (current === leafId ? null : leafId)),
    SessionProvider,
    renderSlot,
    dragging: drag,
    onFocus: mvFocus,
    onResize: mvResizeSplit,
    onMaximize: mvToggleMaximize,
    onRemove: mvRemovePane,
    onBind: mvBind,
    onOpenMain: (sessionId: string) => {
      try {
        PTX.uiWorkspace.openSession(sessionId)
      } catch (error) {
        console.error('dsh-multiview: opening the native view failed', error)
      }
    },
    onHeadPointerDown: (leafId: string, event: any) => {
      if (event.button !== 0) return
      dragRef.current = { from: leafId, over: null, startX: event.clientX, startY: event.clientY, active: false }
      const arm = (moveEvent: PointerEvent) => {
        const record = dragRef.current
        if (record.from === null) return
        if (record.active) return
        const distance = Math.abs(moveEvent.clientX - record.startX) + Math.abs(moveEvent.clientY - record.startY)
        if (distance < 4) return
        record.active = true
        document.body.style.userSelect = 'none'
        setDrag({ from: leafId, over: null })
      }
      window.addEventListener('pointermove', arm)
      window.addEventListener('pointerup', () => window.removeEventListener('pointermove', arm), { once: true })
    },
  }

  const leaves = mvLeaves(state.layout)
  const maximizedLeaf = state.maximized === null ? null : mvLeafById(state.layout, state.maximized)
  const focusedLeaf = leaves.find((leaf) => leaf.id === state.focused) ?? leaves[0]
  const visibleLeaf = maximizedLeaf === null ? focusedLeaf : maximizedLeaf
  const activeView =
    state.currentViewId === null || state.currentViewId === undefined
      ? null
      : (state.views ?? []).find((view) => view.id === state.currentViewId) ?? null
  const currentViewName = activeView === null ? null : String(activeView.name ?? '').trim() || null
  const body = h(
    'div',
    { className: 'mv-body', 'data-mv-body': '' },
    renderMvNode(narrow ? visibleLeaf : maximizedLeaf === null ? state.layout : maximizedLeaf, surface),
  )

  /* Collapsed to one pane, the switcher is the only view of the other conversations, so
     it carries their status: a pane waiting for an answer or finished unread is marked
     here, otherwise the narrow layout hides exactly the thing the split exists for. */
  const chips = narrow
    ? leaves.map((leaf) => {
        const title = leaf.sessionId === null ? T('empty') : mvDisplayTitle(mvTitle(leaf.sessionId), T('untitled'), T('empty'))
        const dot = leaf.sessionId === null ? 'idle' : mvDotState(statuses.get(leaf.sessionId))
        return h(
          'button',
          {
            key: 'chip-' + leaf.id,
            type: 'button',
            className: 'mv-chip',
            'data-active': leaf.id === focusedLeaf.id ? 'true' : 'false',
            'data-state': dot,
            title: dot === 'idle' ? title : title + ' — ' + mvDotLabel(dot),
            'aria-label': dot === 'idle' ? title : title + ' — ' + mvDotLabel(dot),
            onClick: () => mvFocus(leaf.id),
          },
          dot === 'idle' ? null : h('span', { className: 'mv-dot', 'data-state': dot, 'aria-hidden': true }),
          mvClip(title, 14, '…'),
        )
      })
    : []

  return h(
    'div',
    { ref: rootRef, className: 'mv-root', 'data-multiview': '' },
    h(
      'header',
      { className: 'mv-bar', 'data-window-drag': true },
      h('span', { className: 'mv-bar-title', title: mvHostTitle() }, T('title')),
      /* Which saved split is on stage is state, not decoration: it appears only while one is
         active. Without it the name is only visible inside the Views popover, so the user cannot
         tell where they are after restoring a layout. */
      currentViewName === null
        ? null
        : h('span', { className: 'mv-bar-view', title: currentViewName }, currentViewName),
      h(
        'div',
        { className: 'mv-seg', role: 'group', 'aria-label': T('shape') },
        [2, 3, 4].map((count) =>
          h(
            'button',
            {
              key: 'shape-' + String(count),
              type: 'button',
              className: 'mv-chip',
              'data-active': leaves.length === count && maximizedLeaf === null ? 'true' : 'false',
              'aria-pressed': leaves.length === count && maximizedLeaf === null ? 'true' : 'false',
              title: mvFormat(T('shapeN'), { n: count }),
              'aria-label': mvFormat(T('shapeN'), { n: count }),
              onClick: () => mvSetShape(count),
            },
            String(count),
          ),
        ),
      ),
      state.maximized === null
        ? null
        : h('button', { type: 'button', className: 'mv-chip', 'data-active': 'true', onClick: mvRestore }, T('restore')),
      h(MvViewsButton, { views: state.views ?? [], currentId: state.currentViewId ?? null }),
      h(MvUpdateButton, null),
      h('span', { className: 'mv-bar-spacer' }),
      h('div', { className: 'mv-strip' }, chips),
    ),
    h(MvStageBoundary, null, body),
  )
}
