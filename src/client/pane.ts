/**
 * One pane's session plumbing: retain → bind → render the shipped Conversation.
 *
 * `PaneHost` owns the `SessionReference` and hands it to the framework's
 * `SessionProvider` seat, so every session-scoped slot inside the pane resolves
 * against this pane's Session instead of the app-wide current one.
 */

/**
 * Mirror of the shipped Conversation phase derivation (ConversationMainPanel).
 * @param session - current Session snapshot.
 * @param conversation - current assembled conversation snapshot.
 * @param summaryBlank - list row's blank flag, when the row is known.
 * @returns the presentation phase the embedded factory expects.
 */
function mvPhase(session: any, conversation: any, summaryBlank: boolean | undefined) {
  const targeted = conversation.activeTargets !== undefined && conversation.activeTargets.size > 0
  const shellPhase =
    targeted || (!session.blank && !session.awaitingFirstTurn) || session.running === true
      ? 'active'
      : session.promptAttempted === true
        ? 'engaging'
        : 'blank'
  const subagent = session.subagent
  const parentPending =
    subagent !== null &&
    subagent !== undefined &&
    subagent.address !== undefined &&
    subagent.address.mode === 'continuable' &&
    subagent.parentAvailable === undefined
  const settling =
    (shellPhase === 'blank' && session.openState === 'loading' && summaryBlank !== true) || parentPending
  const hero = shellPhase === 'blank' && (session.openState === 'open' || summaryBlank === true)
  return settling ? 'settling' : hero ? 'hero' : 'active'
}

/** Pin the factory's View position to Chat so a pane never grows its own tabs. */
function FixedChatView(props) {
  return h(React.Fragment, null, props.renderSlot('conversation.session', { view: 'chat' }))
}

/** Occupant of the private pane slot: the shipped Conversation, embedded. */
function PaneConversation(props) {
  const { sessionId, useSession, useConversation, useSessions, renderFactorySlot } = props
  const session = useSession((value) => value)
  const conversation = useConversation((value) => value)
  const summaryBlank = useSessions((state) =>
    sessionId === undefined ? undefined : state.byId[sessionId] === undefined ? undefined : state.byId[sessionId].blank,
  )
  if (session === undefined || conversation === undefined) {
    return h(MvNote, null, T('loading'))
  }
  const phase = mvPhase(session, conversation, summaryBlank)
  const hero = phase === 'hero'
  return renderFactorySlot(
    'conversation.content',
    { variant: 'embedded', phase, hero },
    {
      slots: {
        views: FixedChatView,
      },
      fallback: h(MvNote, { error: true }, T('noContent')),
    },
  )
}

/**
 * Contain one pane's render failure: an uncaught error would otherwise abdicate
 * the whole `main` occupant and blank the central column.
 */
class MvPaneBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { failed: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error, info) {
    console.error('dsh-multiview: pane crashed', error, info === undefined ? '' : info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return h(MvNote, { error: true }, mvFormat(T('paneCrashed'), { message: this.state.message }))
    }
    return this.props.children
  }
}

/**
 * Retain one Session for a pane and bind it around the pane slot.
 * The reference is released on unmount or when the pane switches Session.
 */
function PaneHost(props) {
  const { sessionId, SessionProvider, renderSlot, useSessions } = props
  const [state, setState] = React.useState({ reference: null, error: null })
  /* Retaining before the controller list settles throws 'unknown session'; wait
     for the list to be ready instead of showing a dead error on a cold start. */
  const ready = useSessions === undefined ? true : useSessions((snapshot) => snapshot.phase === 'ready')

  React.useEffect(() => {
    if (sessionId === null || sessionId === undefined || ready !== true) return undefined
    let reference = null
    try {
      reference = PTX.sessions.retain(sessionId, { source: 'multiview' })
    } catch (error) {
      setState({ reference: null, error: error instanceof Error ? error.message : String(error) })
      return undefined
    }
    let cancelled = false
    setState({ reference, error: null })
    reference.ready.then(
      () => {
        if (!cancelled) setState({ reference, error: null })
      },
      (error) => {
        if (!cancelled) setState({ reference: null, error: error instanceof Error ? error.message : String(error) })
      },
    )
    return () => {
      cancelled = true
      try {
        reference.release()
      } catch (error) {
        console.error('dsh-multiview: releasing a Session reference failed', error)
      }
    }
  }, [sessionId, ready])

  if (sessionId === null || sessionId === undefined) {
    return h(MvNote, null, T('empty'))
  }
  if (state.error !== null) {
    return h(MvNote, { error: true }, mvFormat(T('openFailed'), { message: state.error }))
  }
  if (state.reference === null) {
    return h(MvNote, null, T('loading'))
  }
  return h(
    SessionProvider,
    { session: state.reference },
    h(MvPaneBoundary, null, renderSlot(MV_PANE_SLOT, {})),
  )
}
