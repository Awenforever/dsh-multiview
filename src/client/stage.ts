/**
 * The stage: the panel's own chrome plus one entry per pane.
 *
 * M0 keeps the layout implicit (one row, two panes) so the mechanism can be
 * verified end to end; M1 replaces `mvLayoutOf` with the persisted tree.
 */

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
function mvDotState(status) {
  if (status === undefined || status === null) return 'idle'
  if (status.pendingInteraction !== undefined) return 'waiting'
  if (status.running === true) return 'running'
  if (status.completionUnread === true) return 'unread'
  return 'idle'
}

/** Accessible label for a dot state. */
function mvDotLabel(state) {
  if (state === 'running') return T('running')
  if (state === 'waiting') return T('waiting')
  if (state === 'unread') return T('unread')
  return ''
}

/**
 * One pane frame: the compact header this plugin owns, then the session body.
 * @param props - pane index, bound Session, and the framework seats.
 * @returns the pane element.
 */
function PaneFrame(props) {
  const { index, sessionId, focused, SessionProvider, renderSlot, status, onFocus } = props
  const title = mvTitle(sessionId)
  const dot = mvDotState(status)
  return h(
    'div',
    {
      className: 'mv-pane',
      'data-pane-id': 'pane-' + String(index + 1),
      'data-focused': focused === true ? 'true' : 'false',
      onPointerDownCapture: () => onFocus(index),
      onFocusCapture: () => onFocus(index),
    },
    h(
      'div',
      { className: 'mv-head', 'data-pane-head': '' },
      h('span', { className: 'mv-dot', 'data-state': dot, title: mvDotLabel(dot), 'aria-hidden': dot === 'idle' }),
      h('span', { className: 'mv-head-title' }, title === undefined ? T('empty') : title),
    ),
    h('div', { className: 'mv-body-slot' }, h(PaneHost, { sessionId, SessionProvider, renderSlot })),
  )
}

/** Panel-level failure containment: the main column keeps a readable note. */
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

/** Occupant of the `main` panel key: the whole split surface. */
function MultiviewStage(props) {
  const { renderSlot, SessionProvider, useSessions, useSessionStatus } = props
  const list = useSessions((state) => state)
  const statuses = useSessionStatus((state) => state)
  const [focused, setFocused] = React.useState(0)
  const [panes, setPanes] = React.useState(() => [null, null])

  React.useEffect(() => {
    if (list.phase !== 'ready') return
    setPanes((current) => mvTopUp(current, 2))
  }, [list])

  const body = h(
    'div',
    { className: 'mv-body', 'data-dir': 'row', 'data-mv-body': '' },
    panes.map((sessionId, index) =>
      h(PaneFrame, {
        key: 'pane-' + String(index + 1),
        index,
        sessionId,
        focused: index === focused,
        SessionProvider,
        renderSlot,
        status: sessionId === null ? undefined : statuses.get(sessionId),
        onFocus: setFocused,
      }),
    ),
  )

  return h(
    'div',
    { className: 'mv-root', 'data-multiview': '' },
    h(
      'header',
      { className: 'mv-bar', 'data-window-drag': true },
      h('span', { className: 'mv-bar-title' }, T('title')),
      h('span', { className: 'mv-bar-spacer' }),
    ),
    h(MvStageBoundary, null, body),
  )
}
