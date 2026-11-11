/**
 * Boot smoke test: the client bundle must load, install its slots and render the
 * stage without throwing.
 *
 * This exists because two regressions shipped during development that no unit
 * test could catch: a stale identifier in the component body blanked the whole
 * panel, and a restructured pane body lost its wrapper element. Both were only
 * visible as a white screen. The test drives the real bundle with a fake host
 * (fake React, fake slots, fake sessions) so a render-body mistake fails in CI.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** Minimal element tree builder that records what the component asked for. */
function createElement(type, props, ...children) {
  return { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child != null) }
}

/** React surface used by the bundle, with hooks reduced to their initial values. */
const React = {
  createElement,
  Fragment: Symbol('Fragment'),
  memo: (component) => component,
  Component: class {
    constructor(props) {
      this.props = props
      this.state = {}
    }
    setState(next) {
      this.state = { ...this.state, ...next }
    }
    render() {
      return null
    }
  },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useReducer: (reducer, initial) => [initial, () => {}],
  useEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (factory) => factory(),
  useCallback: (callback) => callback,
  useRef: (initial) => ({ current: initial }),
  useContext: () => ({}),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  createContext: (value) => ({ Provider: null, _value: value }),
}

const SESSIONS = {
  phase: 'ready',
  ids: ['s1', 's2'],
  byId: {
    s1: { id: 's1', title: 'Alpha', blank: false },
    s2: { id: 's2', title: 'Beta', blank: false },
  },
}

function installDom(store) {
  const created = []
  const document = {
    head: {
      appendChild: (node) => {
        created.push(node)
        return node
      },
    },
    body: { appendChild: () => {}, removeChild: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } },
    documentElement: { style: {}, dataset: {} },
    createElement: (tag) => ({ tag, dataset: {}, style: {}, remove: () => {}, appendChild: () => {}, setAttribute: () => {} }),
    createTextNode: (text) => ({ text }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
  }
  const localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
  const window = {
    document,
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: (handle) => clearTimeout(handle),
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    location: { hostname: 'localhost', protocol: 'http:', search: '', href: 'http://localhost/' },
    navigator: { userAgent: 'node-test', platform: 'linux' },
  }
  Object.assign(globalThis, { window, document, localStorage, location: window.location })
  return { created }
}

/** Fake client context: records registrations, stubs every service the bundle touches. */
function createContext() {
  const registered = []
  registered.shortcuts = []
  const injected = []
  const slots = {
    register: (declaration, component) => {
      registered.push({ name: declaration.name, key: declaration.key, component })
      return { dispose: () => {} }
    },
    inject: (name, body) => {
      injected.push({ name })
      const isGenerator = typeof body === 'function' && body.constructor && body.constructor.name === 'GeneratorFunction'
      return isGenerator ? [...body()] : body()
    },
  }
  const ctx = {
    effect: (body) => {
      if (typeof body === 'function') body()
      return () => {}
    },
    locale: { register: () => {}, bind: () => (key) => key },
    slots,
    sessions: {
      list: { getSnapshot: () => SESSIONS },
      retain: () => ({ ready: Promise.resolve(), release: () => {} }),
      useList: (selector) => selector(SESSIONS),
    },
    workspaces: {
      list: { getSnapshot: () => ({ groups: [], workspaceId: 'default' }) },
      useList: (selector) => selector({ groups: [], workspaceId: 'default' }),
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: 'multiview' }) },
      usePanelInfo: (selector) => selector({ activePanelId: 'multiview' }),
    },
    uiWorkspace: { openSession: () => {} },
    shortcuts: {
      register: (entry) => {
        registered.shortcuts.push(entry)
        return () => {}
      },
    },
  }
  return { ctx, registered, injected }
}

/** Count element nodes whose class name matches, walking the recorded tree. */
function countClass(node, className) {
  if (node == null || typeof node !== 'object') return 0
  let total = 0
  if (node.props && node.props.className === className) total += 1
  for (const child of node.children ?? []) total += countClass(child, className)
  return total
}

/**
 * Shallow renderer: expand function components so the tree reflects what the
 * user would actually see. Hooks are stateless here, so one pass is enough.
 */
function expand(node, depth = 0) {
  if (node == null || depth > 40) return node
  if (Array.isArray(node)) return node.map((child) => expand(child, depth))
  if (typeof node !== 'object') return node
  if (typeof node.type === 'function') {
    const children = node.children.length <= 1 ? node.children[0] : node.children
    /* Class components (the pane boundary) are constructed, not called. */
    const isClass = node.type.prototype && node.type.prototype.render !== undefined
    if (isClass) {
      const instance = new node.type({ ...node.props, children })
      return expand(instance.render(), depth + 1)
    }
    const rendered = node.type({ ...node.props, children })
    return expand(rendered, depth + 1)
  }
  return { ...node, children: node.children.map((child) => expand(child, depth + 1)) }
}

test('the client bundle boots, installs its slots and renders the stage', () => {
  /* Two bound panes, seeded before boot so the store hydrates them. */
  const seeded = {
    version: 3,
    layout: {
      kind: 'split',
      id: 's1',
      dir: 'row',
      ratio: 0.5,
      a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
      b: { kind: 'leaf', id: 'p2', sessionId: 's2' },
    },
    focused: 'p1',
    preset: 2,
    seeded: true,
    views: [],
    currentViewId: null,
  }
  const dom = installDom({ 'dsh.multiview.v1': JSON.stringify(seeded) })
  const context = createContext()
  let loaded = null
  const host = globalThis

  host.__ModuleLoader__ = {
    load: (spec) => {
      loaded = spec
    },
  }

  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  new Function('window', 'document', 'localStorage', source)(host, dom.document ?? globalThis.document, globalThis.localStorage)

  assert.ok(loaded !== null, 'bundle did not call __ModuleLoader__.load')
  const module = loaded.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  })
  assert.ok(Array.isArray(module.inject), 'inject list missing')
  assert.ok(typeof module.apply === 'function', 'apply missing')

  module.apply(context.ctx)

  const main = context.registered.find((entry) => entry.name === 'main')
  assert.ok(main !== undefined, 'main panel was not registered')
  assert.equal(main.key, 'multiview')
  assert.ok(context.injected.some((entry) => entry.name === 'sidebar.panellist'), 'sidebar entry was not declared')
  assert.ok(context.registered.some((entry) => entry.name === 'multiview.pane'), 'pane slot was not registered')

  /* Every command the README documents must actually reach the host shortcut layer.
     Synthetic key events cannot exercise that layer in a real app, so registration is
     asserted here instead. */
  const commandIds = context.registered.shortcuts.map((entry) => entry.id).sort()
  assert.deepEqual(
    commandIds,
    [
      'multiview.pane.attention',
      'multiview.pane.focusNext',
      'multiview.pane.focusPrev',
      'multiview.pane.maximize',
      'multiview.pane.remove',
      'multiview.pane.swapNext',
    ],
    'the registered command set does not match what the README promises',
  )
  for (const entry of context.registered.shortcuts) {
    assert.equal(typeof entry.resolve, 'function', entry.id + ' has no resolve, so it can never run')
    assert.equal(typeof entry.label, 'function', entry.id + ' has no label')
    assert.ok(Array.isArray(entry.regions) && entry.regions.length > 0, entry.id + ' declares no regions')
  }
  /* The panel gate is what keeps these commands inert on the normal conversation. */
  const gated = context.registered.shortcuts[0].resolve()
  assert.equal(gated.status, 'handled', 'commands must resolve to handled on the split panel')

  const tree = main.component({
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(SESSIONS),
    useSessionStatus: (selector) => selector(new Map()),
  })

  assert.ok(tree !== null && tree !== undefined, 'stage rendered nothing (a render-body throw looks like this)')
  const rendered = expand(tree)
  if (countClass(rendered, 'mv-pane') !== 2) {
    const seen = new Set()
    const walk = (node) => {
      if (node == null || typeof node !== 'object') return
      if (node.props && typeof node.props.className === 'string') seen.add(node.props.className)
      if (node.props && typeof node.props['data-mv-body'] === 'string') seen.add('[mv-body]')
      for (const child of node.children ?? []) walk(child)
    }
    walk(rendered)
    console.error('rendered nodes: ' + JSON.stringify([...seen]))
    console.error('debug state: ' + JSON.stringify(globalThis.__mvDebug ? globalThis.__mvDebug.state() : 'no hook'))
  }
  assert.equal(countClass(rendered, 'mv-bar'), 1, 'toolbar missing')
  assert.equal(countClass(rendered, 'mv-pane'), 2, 'stage did not render one frame per bound pane')
  assert.equal(countClass(rendered, 'mv-pane-body'), 2, 'pane bodies are missing')
})

/** Every pane in the current split, in reading order. */
function leavesOf(hook) {
  const out = []
  const walk = (node) => {
    if (node === null || node === undefined) return
    if (node.kind === 'leaf') {
      out.push(node)
      return
    }
    walk(node.a)
    walk(node.b)
  }
  walk(hook.state().layout)
  return out
}

/** Depth-first search for element nodes carrying one class name. */
function findByClass(node, className, out = []) {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) findByClass(child, className, out)
    return out
  }
  const classes = node.props && typeof node.props.className === 'string' ? node.props.className.split(/\s+/) : []
  if (classes.includes(className)) out.push(node)
  for (const child of node.children ?? []) findByClass(child, className, out)
  return out
}

test('the sidebar icon badges attention, and stays quiet when nothing needs you', () => {
  const seeded = {
    version: 3,
    layout: {
      kind: 'split',
      id: 's1',
      dir: 'row',
      ratio: 0.5,
      a: { kind: 'leaf', id: 'p1', sessionId: 'session-a' },
      b: { kind: 'leaf', id: 'p2', sessionId: 'session-b' },
    },
    focused: 'p1',
    preset: 2,
    seeded: true,
    views: [],
    currentViewId: null,
  }
  const dom = installDom({ 'dsh.multiview.v1': JSON.stringify(seeded) })
  const context = createContext()
  let loaded = null
  const host = globalThis
  host.__ModuleLoader__ = { load: (spec) => { loaded = spec } }

  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  new Function('window', 'document', 'localStorage', source)(host, dom.document ?? globalThis.document, globalThis.localStorage)

  assert.ok(loaded !== null, 'bundle did not call __ModuleLoader__.load')
  const module = loaded.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  })
  module.apply(context.ctx)

  const icon = context.registered.find((entry) => entry.name === 'sidebar.panellist')
  assert.ok(icon !== undefined, 'the sidebar icon was not registered')
  assert.equal(typeof icon.component, 'function', 'the sidebar icon must be a component')

  /* One pane blocked on a question: the icon must carry a badge and announce it. */
  const waiting = new Map([['session-a', { pendingInteraction: {} }]])
  const busy = expand(icon.component({ size: 16, active: false, useSessionStatus: (selector) => selector(waiting) }))
  const badges = findByClass(busy, 'mv-icon-badge')
  assert.equal(badges.length, 1, 'a pane waiting for an answer should badge the sidebar icon')
  const labelled = findByClass(busy, 'mv-icon-badge-host')
  assert.equal(labelled.length, 1, 'the badge needs a host that carries the accessible label')
  /* The fake host binds no dictionaries, so T() yields the key itself here; accept either
     the key or the translated sentence, and assert the real copy separately below. */
  assert.match(
    String(labelled[0].props['aria-label']),
    /需要你|needs you|panelAttention/,
    'the badge must be announced, not only drawn',
  )
  const bundle = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.ok(bundle.includes('格需要你处理') && bundle.includes('panes need you'), 'the badge copy is missing from the dictionaries')

  /* Nothing waiting: no badge. */
  const calm = expand(icon.component({ size: 16, active: false, useSessionStatus: (selector) => selector(new Map()) }))
  assert.equal(findByClass(calm, 'mv-icon-badge').length, 0, 'no attention means no badge')

  /* A pane merely running is not attention, so it must not badge either. */
  const running = new Map([['session-a', { running: true }]])
  const busyRunning = expand(icon.component({ size: 16, active: false, useSessionStatus: (selector) => selector(running) }))
  assert.equal(findByClass(busyRunning, 'mv-icon-badge').length, 0, 'running is not attention')

  /* A host that stops providing the hook must still render the icon. */
  const bare = expand(icon.component({ size: 16, active: false }))
  assert.equal(findByClass(bare, 'mv-icon-badge').length, 0, 'missing hook must degrade to no badge')
  assert.ok(bare !== null && bare !== undefined, 'the icon must still render without the hook')
})

/**
 * Boot the bundle in the fake host and hand back the loopback debug hook, which exposes the
 * same pure edits the shipped UI uses.
 * @param seed - optional persisted multiview payload.
 * @returns the debug hook plus the host objects.
 */
function bootWithHook(seed, rawSeed) {
  const dom = installDom(rawSeed !== undefined ? { 'dsh.multiview.v1': rawSeed } : seed === undefined ? {} : { 'dsh.multiview.v1': JSON.stringify(seed) })
  const context = createContext()
  let loaded = null
  const host = globalThis
  host.__ModuleLoader__ = { load: (spec) => { loaded = spec } }
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  new Function('window', 'document', 'localStorage', source)(host, dom.document ?? globalThis.document, globalThis.localStorage)
  assert.ok(loaded !== null, 'bundle did not call __ModuleLoader__.load')
  const module = loaded.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  })
  module.apply(context.ctx)
  /* The bundle is invoked with globalThis as its `window`, so the hook lands there even
     though the DOM stub also defines a window object. Check both to stay honest. */
  const hook = host.__mvDebug ?? host.window?.__mvDebug
  assert.ok(hook !== undefined && hook !== null, 'the debug hook is missing on a loopback origin')
  return { hook, context, dom }
}

test('saved split library: capture, in-place edit, rename, silence, delete', () => {
  const { hook } = bootWithHook()

  /* One bound Session is not a split, so nothing is captured yet. */
  hook.bind('p1', 's1')
  assert.equal(hook.state().views.length, 0, 'a single bound pane must not be saved as a split')

  /* A second Session makes it a split, and it is captured automatically. */
  hook.bind('p2', 's2')
  let state = hook.state()
  assert.equal(state.views.length, 1, 'binding a second Session should capture the split')
  const saved = state.views[0]
  assert.equal(state.currentViewId, saved.id, 'the captured split becomes the current one')
  assert.ok(typeof saved.name === 'string' && saved.name.length > 0, 'a captured split needs a name')

  /* Swapping the two panes is the same working set: it must edit that entry, not add one. */
  hook.swap('p1', 'p2')
  state = hook.state()
  assert.equal(state.views.length, 1, 'swapping panes must not create a second entry')

  /* A typed name survives later edits. */
  hook.renameView(state.views[0].id, '盯盘 A 组')
  hook.swap('p1', 'p2')
  state = hook.state()
  assert.equal(state.views[0].name, '盯盘 A 组', 'a typed name must survive further edits')

  /* Clearing the name hands the title back to the generated one. */
  hook.renameView(state.views[0].id, '   ')
  state = hook.state()
  assert.notEqual(state.views[0].name, '盯盘 A 组', 'an empty rename should restore the generated name')
  assert.equal(state.views[0].customName, undefined, 'an empty rename clears the custom name')

  /* Unbinding back to a single Session removes the split from the library. */
  hook.remove('p2')
  state = hook.state()
  assert.equal(state.views.length, 0, 'a split that no longer holds two Sessions must not stay saved')
  assert.equal(state.currentViewId, null, 'no current view once the split is no longer worthy')
})

test('saved split library: deleting and restoring', () => {
  const { hook } = bootWithHook()
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  const viewId = hook.state().views[0].id

  hook.deleteView(viewId)
  let state = hook.state()
  assert.equal(state.views.length, 0, 'deleting removes the entry')
  assert.equal(state.currentViewId, null, 'deleting the current entry clears the pointer')

  /* Deleting is not a permanent off switch: the next layout change captures again. Ids are
     derived from the ordered Session list, so re-capturing the same working set legitimately
     reuses the same id — only the entry's presence matters here. */
  hook.shape(3)
  state = hook.state()
  assert.equal(state.views.length, 1, 'changing the layout after a deletion should capture the new arrangement')

  /* Applying an id that is no longer in the library must be a no-op, not a resurrection. */
  const beforeApply = state.views.length
  hook.deleteView(state.views[0].id)
  hook.applyView('no-such-view')
  state = hook.state()
  assert.equal(state.views.length, 0, 'applying an unknown view must not create entries')
  assert.ok(beforeApply >= 1)
})

test('a profile saved by an older build is de-duplicated on load', () => {
  const base = {
    version: 3,
    layout: {
      kind: 'split',
      id: 's1',
      dir: 'row',
      ratio: 0.5,
      a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
      b: { kind: 'leaf', id: 'p2', sessionId: 's2' },
    },
    focused: 'p1',
    preset: 2,
    seeded: true,
    currentViewId: null,
    views: [
      {
        id: 'ordered',
        name: 'Alpha | Beta',
        layout: {
          kind: 'split',
          id: 's1',
          dir: 'row',
          ratio: 0.5,
          a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
          b: { kind: 'leaf', id: 'p2', sessionId: 's2' },
        },
        savedAt: 10,
      },
      {
        id: 'swapped',
        name: 'Beta | Alpha',
        layout: {
          kind: 'split',
          id: 's1',
          dir: 'row',
          ratio: 0.5,
          a: { kind: 'leaf', id: 'p1', sessionId: 's2' },
          b: { kind: 'leaf', id: 'p2', sessionId: 's1' },
        },
        savedAt: 20,
      },
    ],
  }

  const { hook } = bootWithHook(base)
  const state = hook.state()
  assert.equal(state.views.length, 1, 'two arrangements of the same Sessions must collapse to one entry on load')
  assert.equal(state.views[0].id, 'swapped', 'the newer entry wins when neither carries a typed name')
})

test('edge cases of the shipped store', () => {
  const { hook } = bootWithHook()

  /* a Session appears at most once, and binding moves it into the target pane */
  hook.shape(2)
  hook.bind('p1', 's1')
  hook.bind('p2', 's1')
  const afterMove = leavesOf(hook)
  assert.equal(afterMove.filter((leaf) => leaf.sessionId === 's1').length, 1, 'a Session may not sit in two panes')
  assert.equal(afterMove.find((leaf) => leaf.id === 'p2').sessionId, 's1', 'binding moves the Session to the target pane')
  assert.equal(afterMove.find((leaf) => leaf.id === 'p1').sessionId, null, 'the source pane is cleared by the move')
  hook.bind('p2', null)
  assert.deepEqual(leavesOf(hook).map((leaf) => leaf.sessionId), [null, null], 'binding null clears the pane')

  /* resize stays inside the documented band */
  hook.resize('s1', 0.05)
  assert.equal(hook.state().layout.ratio, 0.22, 'resize clamps low')
  hook.resize('s1', 0.95)
  assert.equal(hook.state().layout.ratio, 0.78, 'resize clamps high')

  /* pane count stays inside 2..4 */
  hook.shape(1)
  assert.equal(leavesOf(hook).length, 2, 'shape(1) clamps to two panes')
  hook.shape(9)
  assert.equal(leavesOf(hook).length, 4, 'shape(9) clamps to four panes')

  /* removing a bound pane keeps the shape and leaves a hole */
  hook.shape(3)
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  hook.bind('p3', 's3')
  hook.remove('p2')
  assert.equal(leavesOf(hook).length, 3, 'removing a bound pane keeps the pane count')
  assert.deepEqual(leavesOf(hook).map((leaf) => leaf.sessionId), ['s1', null, 's3'], 'the removed pane is the only empty one')

  /* swapping with an empty pane moves the Session, not a null */
  hook.swap('p1', 'p2')
  assert.deepEqual(leavesOf(hook).map((leaf) => leaf.sessionId), [null, 's1', 's3'], 'swap with an empty pane moves the Session')

  /* maximize is cleared by anything that changes what is visible */
  hook.maximize('p2')
  assert.equal(hook.state().maximized, 'p2', 'maximize records the pane')
  hook.swap('p2', 'p3')
  assert.equal(hook.state().maximized, null, 'swap clears maximize')
  hook.maximize('p1')
  hook.remove('p1')
  assert.equal(hook.state().maximized, null, 'removing the maximized pane clears maximize')

  /* neighbour wraps in reading order */
  hook.shape(3)
  assert.equal(hook.neighbour('p3', 1), 'p1', 'neighbour wraps forward')
  assert.equal(hook.neighbour('p1', -1), 'p3', 'neighbour wraps backward')

  /* rename is bounded */
  hook.shape(2)
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  const viewId = hook.state().views[0].id
  hook.renameView(viewId, 'x'.repeat(200))
  assert.equal(hook.state().views[0].name.length, 60, 'a very long name is truncated')
})

test('a corrupted or impossible saved state is repaired on load', () => {
  /* Garbage JSON must not throw, and must still leave a usable split. */
  const garbage = bootWithHook(undefined, '{not json at all').hook
  assert.ok(leavesOf(garbage).length >= 2, 'corrupt saved state still boots into a split')

  const split = (ratio, panes) => {
    let node = { kind: 'leaf', id: panes[panes.length - 1].id, sessionId: panes[panes.length - 1].sessionId }
    for (let index = panes.length - 2; index >= 0; index -= 1) {
      node = { kind: 'split', id: 's' + (index + 1), dir: 'col', ratio, a: { kind: 'leaf', id: panes[index].id, sessionId: panes[index].sessionId }, b: node }
    }
    return node
  }
  const seedOf = (layout) => JSON.stringify({ version: 3, layout, focused: 'p1', preset: 4, seeded: true, views: [], currentViewId: null })

  /* Five panes exceed the cap. */
  const five = bootWithHook(undefined, seedOf(split(0.5, [
    { id: 'p1', sessionId: 's1' },
    { id: 'p2', sessionId: 's2' },
    { id: 'p3', sessionId: 's3' },
    { id: 'p4', sessionId: null },
    { id: 'p5', sessionId: null },
  ]))).hook
  assert.equal(leavesOf(five).length, 4, 'a saved split with five panes is truncated to four')

  /* The mirror shape: a right-deep chain must not collapse to its single leaf either. */
  const rightDeep = bootWithHook(undefined, seedOf({
    kind: 'split', id: 's1', dir: 'col', ratio: 0.5,
    a: { kind: 'split', id: 's2', dir: 'col', ratio: 0.5,
      a: { kind: 'split', id: 's3', dir: 'col', ratio: 0.5,
        a: { kind: 'split', id: 's4', dir: 'col', ratio: 0.5,
          a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
          b: { kind: 'leaf', id: 'p2', sessionId: 's2' } },
        b: { kind: 'leaf', id: 'p3', sessionId: 's3' } },
      b: { kind: 'leaf', id: 'p4', sessionId: null } },
    b: { kind: 'leaf', id: 'p5', sessionId: null },
  })).hook
  assert.equal(leavesOf(rightDeep).length, 4, 'a right-deep five-pane split keeps four panes, not one')

  /* Duplicate pane ids would collide as React keys. */
  const dup = bootWithHook(undefined, seedOf({
    kind: 'split', id: 's1', dir: 'row', ratio: 0.5,
    a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
    b: { kind: 'leaf', id: 'p1', sessionId: 's2' },
  })).hook
  const ids = leavesOf(dup).map((leaf) => leaf.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate pane ids are re-issued')

  /* A hand-edited ratio outside the band. */
  const wild = bootWithHook(undefined, seedOf({
    kind: 'split', id: 's1', dir: 'row', ratio: 9,
    a: { kind: 'leaf', id: 'p1', sessionId: 's1' },
    b: { kind: 'leaf', id: 'p2', sessionId: 's2' },
  })).hook
  assert.equal(wild.state().layout.ratio, 0.78, 'a nonsense ratio is clamped on load')

  /* A saved single pane is below the two-pane minimum and must be widened, not kept. */
  const lonely = bootWithHook(undefined, seedOf({ kind: 'leaf', id: 'p1', sessionId: 's1' })).hook
  assert.equal(leavesOf(lonely).length, 2, 'a saved single pane is widened to two')
  assert.equal(leavesOf(lonely)[0].sessionId, 's1', 'the saved Session keeps its place when widening')
})
