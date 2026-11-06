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
function MultiviewPanelIcon() {
  return h(
    'svg',
    { viewBox: '0 0 20 20', width: 20, height: 20, 'aria-hidden': true, fill: 'none' },
    h('rect', { x: 2.5, y: 3.5, width: 15, height: 13, rx: 3, stroke: 'currentColor', strokeWidth: 1.4 }),
    h('path', { d: 'M10 3.5v13', stroke: 'currentColor', strokeWidth: 1.2 }),
  )
}

/** Status dot state for one pane, derived from the shared Session status map. */
function mvDotState(status: any): string {
  if (status === undefined || status === null) return 'idle'
  if (status.pendingInteraction !== undefined) return 'waiting'
  if (status.running === true) return 'running'
  if (status.completionUnread === true) return 'unread'
  return 'idle'
}

/** Accessible label for a dot state. */
function mvDotLabel(state: string): string {
  if (state === 'running') return T('running')
  if (state === 'waiting') return T('waiting')
  if (state === 'unread') return T('unread')
  return ''
}

/** Session rows the picker may offer: non-blank, non-archived, newest first. */
function mvPickableRows(query: string): any[] {
  const need = query.trim().toLowerCase()
  try {
    const list = PTX.sessions.list.getSnapshot()
    const rows: any[] = []
    for (const id of list.ids) {
      const row = list.byId[id]
      if (row === undefined || row.blank === true) continue
      if (mvIsArchived(id)) continue
      const title = row.title === undefined || row.title === '' ? id : row.title
      if (need !== '' && !title.toLowerCase().includes(need) && !id.toLowerCase().includes(need)) continue
      rows.push({ id, title })
      if (rows.length >= 120) break
    }
    return rows
  } catch (error) {
    return []
  }
}

/** Empty-pane session picker: filter field plus the most recent sessions. */
function MvPanePicker(props) {
  const { onPick } = props
  const [query, setQuery] = React.useState('')
  const rows = mvPickableRows(query)
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
        if (event.key === 'Escape') event.currentTarget.blur()
      },
    }),
    h(
      'div',
      { className: 'mv-picker-list' },
      rows.length === 0
        ? h('div', { className: 'mv-picker-empty' }, T('pickEmpty'))
        : rows.map((row) =>
            h(
              'button',
              {
                key: row.id,
                type: 'button',
                className: 'mv-picker-item',
                title: row.title,
                onClick: () => onPick(row.id),
              },
              row.title,
            ),
          ),
    ),
  )
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
  // be dropped (observed on a real desktop window). Capturing the ratio here
  // also keeps the handler independent of re-renders.
  const beginDrag = (event: any) => {
    if (event.button !== 0) return
    event.preventDefault()
    setDragging(true)
    const dir = node.dir
    const splitId = node.id
    const move = (moveEvent: PointerEvent) => {
      const ratio = ratioAt(dir, moveEvent)
      lastRatio.current = ratio
      onResize(splitId, ratio)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      setDragging(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  return h('div', {
    ref,
    className: 'mv-divider',
    'data-dir': node.dir,
    'data-divider': node.id,
    'data-dragging': dragging ? 'true' : 'false',
    role: 'separator',
    'aria-orientation': node.dir === 'row' ? 'vertical' : 'horizontal',
    onPointerDown: beginDrag,
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
  const title = sessionId === null ? T('empty') : mvTitle(sessionId) ?? T('empty')
  const status = sessionId === null ? undefined : surface.statuses.get(sessionId)
  const dot = mvDotState(status)
  const maximized = state.maximized === leaf.id

  return h(
    'div',
    {
      className: 'mv-pane',
      'data-pane-id': leaf.id,
      'data-pane': '',
      'data-focused': focused ? 'true' : 'false',
      'data-drop': dragging.over === leaf.id && dragging.from !== null && dragging.from !== leaf.id ? 'true' : 'false',
      onPointerDownCapture: () => surface.onFocus(leaf.id),
      onFocusCapture: () => surface.onFocus(leaf.id),
    },
    h(
      'div',
      { className: 'mv-head', 'data-pane-head': '' },
      h('span', { className: 'mv-dot', 'data-state': dot, title: mvDotLabel(dot), 'aria-hidden': dot === 'idle' }),
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
        h(MvIconButton, {
          label: maximized ? T('restore') : T('maximize'),
          path: maximized ? MV_ICON.restore : MV_ICON.maximize,
          onClick: () => surface.onMaximize(leaf.id),
        }),
        sessionId === null
          ? null
          : h(MvIconButton, {
              label: T('openMain'),
              path: MV_ICON.external,
              onClick: () => surface.onOpenMain(sessionId),
            }),
        h(MvIconButton, { label: T('remove'), path: MV_ICON.close, onClick: () => surface.onRemove(leaf.id) }),
      ),
    ),
    h(
      'div',
      { className: 'mv-pane-body' },
      sessionId === null
        ? h(MvPanePicker, { onPick: (id) => surface.onBind(leaf.id, id) })
        : h(PaneHost, {
            sessionId,
            SessionProvider: surface.SessionProvider,
            renderSlot: surface.renderSlot,
          }),
    ),
  )
}

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
  if (update.status === 'error') return mvFormat(T('updateFailed'), { message: update.error ?? '' })
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
        'data-busy': update.status === 'checking' || update.status === 'installing' ? 'true' : 'false',
        title: caption,
        'aria-label': T('updateCheck'),
        onClick: () => {
          setOpen(true)
          if (update.available !== true) void mvUpdateCheck(true)
        },
      },
      MvGlyph(MV_ICON.refresh),
    ),
    open ? h(MvUpdateDialog, { update, caption, onClose: () => setOpen(false) }) : null,
  )
}

/** Confirm-and-run dialog for the market's own update operation. */
function MvUpdateDialog(props) {
  const { update, caption, onClose } = props
  const busy = update.status === 'installing'
  const canInstall = update.available === true && !busy && update.localOnly !== true
  const body = h(
    'div',
    { className: 'mv-dialog-body' },
    h('div', { className: 'mv-dialog-title' }, T('updateCheck')),
    h('div', { className: 'mv-dialog-text' }, caption),
    update.status === 'installing' && update.operationState !== null
      ? h('div', { className: 'mv-dialog-text' }, String(update.operationState))
      : null,
    update.status === 'done' && update.restartRequired === true && update.restartSupported === true
      ? h('div', { className: 'mv-dialog-text' }, T('updateDone'))
      : null,
  )
  const actions = h(
    'div',
    { className: 'mv-dialog-actions' },
    h('button', { type: 'button', className: 'mv-dialog-button', onClick: onClose }, T('cancel')),
    canInstall
      ? h(
          'button',
          {
            type: 'button',
            className: 'mv-dialog-button mv-dialog-button--primary',
            onClick: () => void mvUpdateInstall(),
          },
          T('updateInstall'),
        )
      : update.available !== true && update.status !== 'installing'
        ? h(
            'button',
            {
              type: 'button',
              className: 'mv-dialog-button',
              onClick: () => void mvUpdateCheck(true),
            },
            T('updateCheck'),
          )
        : null,
  )
  return h(
    'div',
    {
      className: 'mv-dialog-backdrop',
      onClick: (event: any) => {
        if (event.target === event.currentTarget) onClose()
      },
    },
    h('div', { className: 'mv-dialog', role: 'dialog', 'aria-label': T('updateCheck') }, body, actions),
  )
}

/** Saved splits: auto-captured whenever two or more panes are bound. */
function MvViewsButton(props) {
  const { views, currentKey } = props
  const [open, setOpen] = React.useState(false)
  return h(
    'div',
    { className: 'mv-views' },
    h(
      'button',
      {
        type: 'button',
        className: 'mv-chip mv-views-toggle',
        'data-active': open ? 'true' : 'false',
        title: T('views'),
        onClick: () => setOpen((value) => !value),
      },
      T('views'),
      views.length > 0 ? h('span', { className: 'mv-views-count' }, String(views.length)) : null,
    ),
    open
      ? h(
          'div',
          { className: 'mv-views-pop', role: 'menu', 'aria-label': T('views') },
          views.length === 0
            ? h('div', { className: 'mv-views-empty' }, T('viewsEmpty'))
            : views.map((view) =>
                h(
                  'div',
                  { key: view.id, className: 'mv-views-row', 'data-active': view.id === currentKey ? 'true' : 'false' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'mv-views-name',
                      title: T('viewsHint'),
                      onClick: () => {
                        mvApplyView(view.id)
                        setOpen(false)
                      },
                    },
                    view.name,
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'mv-views-del',
                      title: T('viewsDelete'),
                      'aria-label': T('viewsDelete'),
                      onClick: (event: any) => {
                        event.stopPropagation()
                        mvDeleteView(view.id)
                      },
                    },
                    '✕',
                  ),
                ),
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
  const state = useMvState()
  const rootRef = React.useRef(null)
  const [narrow, setNarrow] = React.useState(false)
  const [drag, setDrag] = React.useState({ from: null, over: null })
  const dragRef = React.useRef({ from: null, over: null, startX: 0, startY: 0, active: false })

  React.useEffect(() => {
    mvReconcile()
  }, [list])

  React.useEffect(() => {
    mvUpdateHydrate()
    mvUpdateMaybeAutoCheck()
  }, [])

  React.useEffect(() => {
    const element = rootRef.current
    if (element === null || typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(() => {
      setNarrow(element.clientWidth < 900 || element.clientHeight < 520)
    })
    observer.observe(element)
    return () => observer.disconnect()
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

  const surface = {
    state,
    statuses,
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
  const body = h(
    'div',
    { className: 'mv-body', 'data-mv-body': '' },
    renderMvNode(narrow ? visibleLeaf : maximizedLeaf === null ? state.layout : maximizedLeaf, surface),
  )

  const chips = narrow
    ? leaves.map((leaf) => {
        const title = leaf.sessionId === null ? T('empty') : mvTitle(leaf.sessionId) ?? T('empty')
        return h(
          'button',
          {
            key: 'chip-' + leaf.id,
            type: 'button',
            className: 'mv-chip',
            'data-active': leaf.id === focusedLeaf.id ? 'true' : 'false',
            title,
            onClick: () => mvFocus(leaf.id),
          },
          title.length > 14 ? title.slice(0, 14) + '…' : title,
        )
      })
    : []

  return h(
    'div',
    { ref: rootRef, className: 'mv-root', 'data-multiview': '' },
    h(
      'header',
      { className: 'mv-bar', 'data-window-drag': true },
      h('span', { className: 'mv-bar-title' }, T('title')),
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
      h(MvViewsButton, { views: state.views ?? [], currentKey: mvViewKey(state.layout) }),
      h('span', { className: 'mv-bar-spacer' }),
      h('div', { className: 'mv-strip' }, chips),
      h(MvUpdateButton, null),
    ),
    h(MvStageBoundary, null, body),
  )
}
