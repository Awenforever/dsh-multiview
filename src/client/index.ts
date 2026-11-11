/**
 * Client half entry: copy, styles, slot registrations, shortcuts and hydration.
 *
 * Registration is expressed through `slots.inject`, so this plugin waits for the
 * shipped declarations it contributes into instead of racing boot order.
 */

/** Services this plugin's apply body actually touches. */
const MV_INJECT = ['slots', 'sessions', 'workspaces', 'locale', 'layout', 'uiWorkspace', 'shortcuts']

/**
 * Shortcut defaults for the Desktop shells only.
 *
 * The registry validates every default against every runtime/platform pair,
 * including browser/Linux, whose push-to-talk style allow-list rejects almost
 * every combination. Omitting the web profiles leaves those unbound (the user
 * can still assign them in Settings 鈫?Shortcuts) instead of failing the command.
 * @param code - physical key code.
 */
function mvShortcutDefaults(code: string) {
  const binding = { code, modifiers: ['primary', 'alt'] }
  return {
    'desktop:macos': binding,
    'desktop:windows': binding,
    'desktop:linux': binding,
  }
}

/**
 * Register one pane command. A default key that collides with another plugin or
 * a reserved combination must not break the panel, so the command is retried
 * without a default binding and stays assignable from Settings 鈫?Shortcuts.
 * @param ctx - client root context.
 * @param spec - identity, label key and handler.
 */
function mvRegisterShortcut(ctx: any, spec: { id: string; labelKey: string; code: string; run: () => void }): void {
  const label = () => T(spec.labelKey)
  const resolve = () => {
    const info = (PTX as any).layout.panelInfo.getSnapshot()
    if (info.activePanelId !== MV_PANEL_ID) return { status: 'pass' }
    return {
      status: 'handled',
      run: () => {
        try {
          spec.run()
        } catch (error) {
          console.error('dsh-multiview: shortcut failed', spec.id, error)
        }
      },
    }
  }
  const base = { id: spec.id, label, aliases: ['multiview', 'split'], regions: ['page', 'editable'], modals: [], resolve }
  try {
    ctx.effect(() => ctx.shortcuts.register({ ...base, defaults: mvShortcutDefaults(spec.code) }), 'dsh-multiview: ' + spec.id)
  } catch (error) {
    console.warn('dsh-multiview: default binding rejected, registering without one:', spec.id, error)
    ctx.effect(() => ctx.shortcuts.register({ ...base, defaults: {} }), 'dsh-multiview: unbound ' + spec.id)
  }
}

/**
 * Focus one pane and hand the keyboard to its composer when the build exposes
 * that surface; visual focus alone is the documented fallback.
 * @param leafId - pane to focus.
 */
function mvFocusPane(leafId: string): void {
  mvFocus(leafId)
  const leaf = mvLeafById(mvGetState().layout, leafId)
  if (leaf !== undefined && leaf.sessionId !== null) mvFocusComposer(leaf.sessionId)
}

/**
 * Reveal the split panel. `layout.selectPanel` is the public navigation call;
 * the throw case is a panel that was never registered, which cannot happen while
 * this module is loaded but must not escape a click handler.
 */
function mvOpenPanel(): void {
  try {
    PTX.layout.selectPanel(MV_PANEL_ID)
  } catch (error) {
    console.error('dsh-multiview: selecting the panel failed', error)
  }
}

/**
 * Put a Session into the split from anywhere, then hand it the keyboard.
 * @param sessionId - Session chosen outside the split (sidebar row or menu).
 */
function mvOpenSessionInSplit(sessionId: string): void {
  const leafId = mvPutInPane(sessionId)
  mvOpenPanel()
  if (leafId !== null) mvFocusComposer(sessionId)
}

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

  mvHydrate()

  // The sidebar entry is registered from inside the `main` declaration so the
  // icon can never appear before the panel key is selectable.
  ctx.slots.inject('main', function* () {
    yield ctx.slots.register(
      {
        name: 'main',
        key: MV_PANEL_ID,
        locale: NS,
        children: {
          [MV_PANE_SLOT]: { kind: 'single', scope: 'session' },
        },
      },
      MultiviewStage,
    )
    yield ctx.slots.inject('sidebar.panellist', () =>
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
  })

  ctx.slots.inject(MV_PANE_SLOT, () => ctx.slots.register({ name: MV_PANE_SLOT, locale: NS }, PaneConversation))

  /* Sidebar Session rows: a hover action and a menu row, both public list slots
     declared by ui-workspace (`replaceRisk: none`). */
  ctx.slots.inject('sidebar.workspaces', function* () {
    yield ctx.slots.inject('sidebar.workspaces.session.row.action', () =>
      ctx.slots.register(
        {
          name: 'sidebar.workspaces.session.row.action',
          id: 'multiview',
          order: 150,
          locale: NS,
        },
        MvRowSplitAction,
      ),
    )
    yield ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
      ctx.slots.register(
        {
          name: 'sidebar.workspaces.session.menu.item',
          id: 'multiview',
          order: 150,
          locale: NS,
        },
        MvRowMenuAction,
      ),
    )
  })

  mvRegisterShortcut(ctx, {
    id: 'multiview.pane.focusPrev',
    labelKey: 'shortcutFocusPrev',
    code: 'BracketLeft',
    run: () => mvFocusPane(mvNeighbour(mvGetState().layout, mvGetState().focused, -1)),
  })
  mvRegisterShortcut(ctx, {
    id: 'multiview.pane.focusNext',
    labelKey: 'shortcutFocusNext',
    code: 'BracketRight',
    run: () => mvFocusPane(mvNeighbour(mvGetState().layout, mvGetState().focused, 1)),
  })
  mvRegisterShortcut(ctx, {
    id: 'multiview.pane.attention',
    labelKey: 'shortcutAttention',
    code: 'KeyJ',
    run: () => {
      const state = mvGetState()
      const next = mvNextAttention(state, mvStatusSnapshot())
      if (next !== null) mvFocusPane(next)
    },
  })
  mvRegisterShortcut(ctx, {
    id: 'multiview.pane.swapNext',
    labelKey: 'shortcutSwapNext',
    code: 'KeyS',
    run: () => {
      const state = mvGetState()
      mvSwapWithNeighbour(state.focused, 1)
    },
  })
  mvRegisterShortcut(ctx, {
    id: 'multiview.pane.maximize',
    labelKey: 'shortcutMaximize',
    code: 'KeyM',
    run: () => {
      const state = mvGetState()
      mvToggleMaximize(state.focused)
    },
  })
  mvRegisterShortcut(ctx, {
    id: 'multiview.pane.remove',
    labelKey: 'shortcutRemove',
    code: 'KeyW',
    run: () => {
      mvRemovePane(mvGetState().focused)
    },
  })

  /**
   * Loopback-only inspection hook for the CDP smoke runs: it exposes the same
   * read-only probes and pure edits the tests would otherwise duplicate. Never
   * installed on a non-loopback origin.
   */
  const host = typeof window === 'undefined' ? '' : window.location.hostname
  if (host === '127.0.0.1' || host === 'localhost') {
    window.__mvDebug = {
      version: MV_PLUGIN_VERSION,
      list: () => PTX.sessions.list.getSnapshot(),
      seed: (limit) => mvSeed(limit),
      live: () => mvConversationLive(),
      focusComposer: (sessionId) => mvFocusComposer(sessionId),
      state: () => mvGetState(),
      shape: (count) => mvSetShape(count),
      bind: (leafId, sessionId) => mvBind(leafId, sessionId),
      maximize: (leafId) => mvToggleMaximize(leafId),
      restore: () => mvRestore(),
      resize: (splitId, ratio) => mvResizeSplit(splitId, ratio),
      swap: (a, b) => mvSwapLeaves(a, b),
      remove: (leafId) => mvRemovePane(leafId),
      reset: () => mvReset(),
      neighbour: (leafId, delta) => mvNeighbour(mvGetState().layout, leafId, delta),
      mainKeys: () => (PTX.slots.entries('main') || []).map((entry) => entry.options.key),
      panelInfo: () => PTX.layout.panelInfo.getSnapshot(),
      paneEntries: () => (PTX.slots.entries(MV_PANE_SLOT) || []).length,
      open: () => PTX.layout.selectPanel(MV_PANEL_ID),
      close: () => PTX.layout.selectPanel(null),
      workspaces: () => PTX.workspaces.list.getSnapshot(),
      openFor: (sessionId) => mvOpenForSession(sessionId),
      startView: () => mvStartView(),
      applyView: (viewId) => mvApplyView(viewId),
      deleteView: (viewId) => mvDeleteView(viewId),
    }
  }
}
