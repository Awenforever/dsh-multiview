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
