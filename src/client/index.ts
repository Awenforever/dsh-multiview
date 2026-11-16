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
    /* Already open means no mount will consume the target, and a stale one would steer the
       next unrelated open; drop it here rather than relying on a timer. */
    if (PTX.layout.panelInfo.getSnapshot().activePanelId === MV_PANEL_ID) mvSetMountTarget(null)
    PTX.layout.selectPanel(MV_PANEL_ID)
  } catch (error) {
    console.error('dsh-multiview: selecting the panel failed', error)
  }
}

/**
 * Put a Session into the split from anywhere, then hand it the keyboard.
 * @param sessionId - Session chosen outside the split (sidebar row or menu).
 */
/** Last real pointer press, used to stop a focus landing the moment the user takes over. */
let mvLastPointerAt = 0

/**
 * Land on one pane after the panel mounts.
 *
 * The host focuses its own composer while the split mounts, and the pane captures that focus,
 * which rewrites the focused pane and undoes the click. Re-assert until it sticks, with a hard
 * stop so a host that keeps stealing focus cannot pin us in a loop.
 * @param leafId - pane that must end up focused.
 * @param sessionId - Session whose composer should hold the caret.
 */
function mvLandOnPane(leafId: string, sessionId: string): void {
  const startedAt = Date.now()
  const deadline = startedAt + 800
  const attempt = (): void => {
    /* A click means the user chose something else; never fight that. */
    if (mvLastPointerAt > startedAt) return
    if (mvLeafById(mvGetState().layout, leafId) === undefined) return
    if (mvGetState().focused !== leafId) {
      mvFocus(leafId)
      mvFocusComposer(sessionId)
    }
    if (Date.now() < deadline && mvGetState().focused !== leafId) setTimeout(attempt, 40)
  }
  mvFocus(leafId)
  mvFocusComposer(sessionId)
  setTimeout(attempt, 40)
}

function mvOpenSessionInSplit(sessionId: string): void {
  /* A Session that already belongs to a split is *found*, not re-placed: growing the current
     stage would capture a second split around whatever was already on it, which reads as "it
     opened a new view instead of the one I asked for". */
  if (mvSessionInAnySplit(sessionId)) mvOpenForSession(sessionId, { focusHolder: true })
  else mvPutInPane(sessionId)
  /* Tell the stage why it is being mounted; without this the mount effect re-seeds from the
     conversation the user came from and undoes the line above. */
  mvSetMountTarget(sessionId)
  mvOpenPanel()
  const leaf = mvLeaves(mvGetState().layout).find((pane) => pane.sessionId === sessionId)
  if (leaf !== undefined) mvLandOnPane(leaf.id, sessionId)
  else mvFocusComposer(sessionId)
}

/**
 * Install the multiview panel.
 * @param ctx - client root context.
 */
function apply(ctx) {
  PTX = ctx
  T = ctx.locale.bind(NS)

  ctx.effect(() => ctx.locale.register(NS, { zh: MV_ZH, en: MV_EN }), 'dsh-multiview: dictionaries')

  /* Capture phase so a press anywhere counts, including one that stops propagation. Guarded
     because a host (or a test double) may not implement events; the clock is an optimisation,
     not a requirement — without it a landing simply cannot tell that the user took over. */
  ctx.effect(() => {
    if (typeof window.addEventListener !== 'function') return () => {}
    const onPointer = (): void => {
      mvLastPointerAt = Date.now()
    }
    window.addEventListener('pointerdown', onPointer, true)
    return () => window.removeEventListener('pointerdown', onPointer, true)
  }, 'dsh-multiview: pointer clock')

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
      /* Nothing is asking for the user. Moving on beats doing nothing: silence is
         indistinguishable from a broken shortcut, and this command only runs while the panel is
         the active one, so the movement is always on screen. */
      mvFocusPane(next !== null ? next : mvNeighbour(state.layout, state.focused, 1))
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
      reconcile: () => mvReconcile(),
      clearArchived: () => mvClearArchived(),
      neighbour: (leafId, delta) => mvNeighbour(mvGetState().layout, leafId, delta),
      mainKeys: () => (PTX.slots.entries('main') || []).map((entry) => entry.options.key),
      panelInfo: () => PTX.layout.panelInfo.getSnapshot(),
      paneEntries: () => (PTX.slots.entries(MV_PANE_SLOT) || []).length,
      open: () => PTX.layout.selectPanel(MV_PANEL_ID),
      close: () => PTX.layout.selectPanel(null),
      update: () => mvUpdateState,
      checkUpdate: (force) => mvUpdateCheck(force === true),
      workspaces: () => PTX.workspaces.list.getSnapshot(),
      openFor: (sessionId) => mvOpenForSession(sessionId),
      startView: () => mvStartView(),
      applyView: (viewId) => mvApplyView(viewId),
      renameView: (viewId, name) => mvRenameView(viewId, name),
      deleteView: (viewId) => mvDeleteView(viewId),
    }
  }
}
