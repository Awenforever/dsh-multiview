/**
 * Client half entry: copy, styles, and the three slot registrations.
 *
 * Registration is expressed through `slots.inject`, so this plugin waits for
 * the shipped declarations it contributes into instead of racing boot order.
 * The pane occupant is registered only after this plugin's own `main` entry has
 * declared the private slot, which also proves the conversation assembly loaded.
 */

/** Services this plugin's apply body actually touches. */
const MV_INJECT = ['slots', 'sessions', 'workspaces', 'locale']

/**
 * Install the multiview panel.
 * @param ctx - client root context.
 */
function apply(ctx) {
  PTX = ctx
  T = ctx.locale.bind(NS)

  ctx.effect(() => ctx.locale.register(NS, { zh: MV_ZH, en: MV_EN }), 'dsh-multiview: dictionaries')

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-multiview'
    tag.dataset.pluginCss = 'dsh-multiview/styles'
    tag.textContent = MV_CSS
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'dsh-multiview: styles')

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: MV_PANEL_ID,
        locale: NS,
        children: {
          [MV_PANE_SLOT]: { kind: 'single', scope: 'session' },
        },
      },
      MultiviewStage,
    ),
  )

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: MV_PANEL_ID,
        order: 30,
        label: () => T('panel'),
        locale: NS,
      },
      MultiviewPanelIcon,
    ),
  )

  ctx.slots.inject(MV_PANE_SLOT, () => ctx.slots.register({ name: MV_PANE_SLOT, locale: NS }, PaneConversation))

  /**
   * Loopback-only inspection hook for the CDP smoke runs: it exposes the same
   * read-only probes the tests would otherwise duplicate. Never installed on a
   * non-loopback origin.
   */
  const host = typeof window === 'undefined' ? '' : window.location.hostname
  if (host === '127.0.0.1' || host === 'localhost') {
    window.__mvDebug = {
      version: '0.1.0',
      list: () => PTX.sessions.list.getSnapshot(),
      seed: (limit) => mvSeed(limit),
      topUp: (panes, limit) => mvTopUp(panes, limit),
      live: () => mvConversationLive(),
      focus: (sessionId) => mvFocusComposer(sessionId),
    }
  }
}
