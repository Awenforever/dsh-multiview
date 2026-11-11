/**
 * Shared test harness: a fake host that boots the real bundle, plus a stateful hook runtime so
 * components behind `useState` can be opened, clicked and re-rendered.
 *
 * Extracted from the interaction tests once a second file needed it; duplicating the host is how
 * the two copies drift apart and start disagreeing about what the bundle is given.
 */
import { readFileSync } from 'node:fs'

/* ---------- element tree ---------- */
export function createElement(type, props, ...children) {
  return { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child != null) }
}

/* ---------- mutable React surface ----------
   The bundle captures this object once, so swapping its hook methods between passes is how the
   harness supplies live state without touching shipped code. */
export const React = {
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

/* ---------- stateful hook runtime ---------- */
const componentIds = new WeakMap()
let nextComponentId = 1
/** Stable identity for a function component. */
function idFor(type) {
  const existing = componentIds.get(type)
  if (existing !== undefined) return existing
  const assigned = nextComponentId++
  componentIds.set(type, assigned)
  return assigned
}

/* Set by expand()/renderOnce() so hooks know which instance is rendering. */
let currentKey = 'root'

export function createHarness() {
  const slots = { state: new Map(), refs: new Map() }
  let cursor = 0
  let dirty = false
  let effects = []
  const cleanups = []

  const hooks = {
    useState(initial) {
      const key = currentKey + ':' + String(cursor++)
      if (!slots.state.has(key)) slots.state.set(key, typeof initial === 'function' ? initial() : initial)
      const set = (next) => {
        const current = slots.state.get(key)
        const value = typeof next === 'function' ? next(current) : next
        if (value === current) return
        slots.state.set(key, value)
        dirty = true
      }
      return [slots.state.get(key), set]
    },
    useReducer(_reducer, initial) {
      const key = currentKey + ':' + String(cursor++)
      if (!slots.state.has(key)) slots.state.set(key, initial)
      const dispatch = (next) => {
        const current = slots.state.get(key)
        slots.state.set(key, typeof next === 'function' ? next(current) : next)
        dirty = true
      }
      return [slots.state.get(key), dispatch]
    },
    useRef(initial) {
      const key = currentKey + ':' + String(cursor++)
      if (!slots.refs.has(key)) slots.refs.set(key, { current: initial })
      return slots.refs.get(key)
    },
    useEffect(effect) {
      effects.push(effect)
    },
    useLayoutEffect(effect) {
      effects.push(effect)
    },
    useMemo(factory) {
      return factory()
    },
    useCallback(callback) {
      return callback
    },
    useContext() {
      return {}
    },
    useSyncExternalStore(_subscribe, getSnapshot) {
      return getSnapshot()
    },
    createContext(value) {
      return { Provider: null, _value: value }
    },
  }

  function renderOnce(component, props) {
    cursor = 0
    dirty = false
    effects = []
    const saved = {}
    for (const key of Object.keys(hooks)) {
      saved[key] = React[key]
      React[key] = hooks[key]
    }
    const savedKey = currentKey
    currentKey = String(idFor(component)) + '@root'
    try {
      return expand(component(props))
    } finally {
      currentKey = savedKey
      for (const key of Object.keys(saved)) React[key] = saved[key]
    }
  }

  /**
   * Render until the tree stops changing, then start the final pass's effects.
   *
   * Effects of the last pass must run too: a debounced search or an interval is *registered* during
   * that pass, and skipping it means the scheduled work never starts, which looks like a component
   * that ignores its input.
   */
  function render(component, props, maxPasses = 20) {
    let tree = renderOnce(component, props)
    let pass = 0
    while (dirty && pass < maxPasses) {
      const pending = effects
      effects = []
      for (const effect of pending) {
        const cleanup = effect()
        if (typeof cleanup === 'function') cleanups.push(cleanup)
      }
      tree = renderOnce(component, props)
      pass += 1
    }
    for (const effect of effects) {
      const cleanup = effect()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    }
    return tree
  }

  return { render }
}

/* ---------- tree helpers ---------- */
export function expand(node, depth = 0, path = 'r') {
  if (node == null || depth > 60) return node
  if (Array.isArray(node)) return node.map((child, index) => expand(child, depth, path + '.' + String(index)))
  if (typeof node !== 'object') return node
  if (typeof node.type === 'function') {
    const children = node.children.length <= 1 ? node.children[0] : node.children
    const isClass = node.type.prototype && node.type.prototype.render !== undefined
    const saved = currentKey
    /* The path makes two instances of one component distinct; the id keeps components apart. */
    currentKey = String(idFor(node.type)) + '@' + path
    try {
      if (isClass) {
        const instance = new node.type({ ...node.props, children })
        return expand(instance.render(), depth + 1, path)
      }
      return expand(node.type({ ...node.props, children }), depth + 1, path)
    } finally {
      currentKey = saved
    }
  }
  return { ...node, children: (node.children ?? []).map((child, index) => expand(child, depth, path + '.' + String(index))) }
}

export function collect(node, predicate, out = []) {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, predicate, out))
    return out
  }
  if (predicate(node)) out.push(node)
  for (const child of node.children ?? []) collect(child, predicate, out)
  return out
}

export const byClass = (tree, className) =>
  collect(tree, (node) => {
    const value = node.props && node.props.className
    return typeof value === 'string' && value.split(/\s+/).includes(className)
  })

export const byLabel = (tree, label) => collect(tree, (node) => node.props && node.props['aria-label'] === label)

export function textOf(node) {
  let text = ''
  const walk = (value) => {
    if (value == null) return
    if (typeof value === 'string' || typeof value === 'number') { text += String(value); return }
    if (Array.isArray(value)) { value.forEach(walk); return }
    if (typeof value === 'object') walk(value.children ?? [])
  }
  walk(node)
  return text.trim()
}

/** Minimal event object: handlers in the bundle call these two methods. */
export const fakeEvent = () => ({ stopPropagation: () => {}, preventDefault: () => {} })

/* ---------- fake host ---------- */
export const SESSION_IDS = ['s1', 's2', 's3']

export function makeSessions(ids = SESSION_IDS) {
  return {
    phase: 'ready',
    ids,
    byId: Object.fromEntries(ids.map((id) => [id, { id, title: id.toUpperCase(), blank: false }])),
  }
}

/**
 * Boot the real bundle against a fake host.
 * @param options - `sessions` snapshot, `archived` ids, and a persisted `seed` payload.
 * @returns the registered main component, the debug hook and the shortcut catalog.
 */
export function bootHost(options = {}) {
  const list = options.sessions ?? makeSessions()
  const archived = options.archived ?? []
  const store = {}
  const localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  if (options.seed !== undefined) store['dsh.multiview.v1'] = JSON.stringify(options.seed)

  const document = {
    head: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ dataset: {}, style: {}, appendChild: () => {}, remove: () => {}, setAttribute: () => {}, focus: () => {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { hasAttribute: () => false, setAttribute: () => {}, removeAttribute: () => {}, style: {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    documentElement: { style: {} },
    activeElement: null,
  }
  const window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    cancelAnimationFrame: (handle) => clearTimeout(handle),
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 1,
    location: { hostname: 'localhost', protocol: 'http:', search: '', href: 'http://localhost/' },
    navigator: { userAgent: 'node', platform: 'linux' },
  }
  /* The bundle reads storage through `window`, so the fake window has to carry the same objects. */
  window.localStorage = localStorage
  window.document = document
  window.window = window
  Object.assign(globalThis, { window, document, localStorage, location: window.location })

  const registered = []
  registered.shortcuts = []
  const context = {
    effect: (body) => { if (typeof body === 'function') body(); return () => {} },
    locale: { register: () => {}, bind: () => (key) => key },
    slots: {
      register: (declaration, component) => {
        registered.push({ name: declaration.name, key: declaration.key, component })
        return { dispose: () => {} }
      },
      inject: (name, body) => {
        const isGenerator = typeof body === 'function' && body.constructor && body.constructor.name === 'GeneratorFunction'
        return isGenerator ? [...body()] : body()
      },
    },
    sessions: {
      list: { getSnapshot: () => list },
      retain: () => ({ ready: Promise.resolve(), release: () => {} }),
      useList: (selector) => selector(list),
      /* Content search: the happy path by default; a test can override it through options.search. */
      search: options.search ?? (() => Promise.resolve({ ok: true, value: { items: [], hasMore: false } })),
    },
    workspaces: {
      list: { getSnapshot: () => ({ groups: [], workspaceId: 'default', archivedSessionIds: archived }) },
      useList: (selector) => selector({ groups: [], workspaceId: 'default' }),
    },
    layout: {
      panelInfo: { getSnapshot: () => ({ activePanelId: 'multiview' }) },
      usePanelInfo: (selector) => selector({ activePanelId: 'multiview' }),
    },
    uiWorkspace: { openSession: () => {} },
    shortcuts: { register: (entry) => { registered.shortcuts.push(entry); return () => {} } },
  }

  let loaded = null
  const loader = { load: (spec) => { loaded = spec } }
  /* The bundle reads `window` for listeners and for the loader, so it must receive the fake window
     rather than globalThis: Node's globalThis has no addEventListener, and any effect that listens
     would throw only once effects actually run. */
  window.__ModuleLoader__ = loader
  globalThis.__ModuleLoader__ = loader
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  new Function('window', 'document', 'localStorage', source)(window, document, localStorage)
  const module = loaded.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  })
  module.apply(context)

  const main = registered.find((entry) => entry.name === 'main')
  const icon = registered.find((entry) => entry.name === 'sidebar.panellist')
  return {
    stage: main === undefined ? undefined : main.component,
    icon: icon === undefined ? undefined : icon.component,
    hook: window.__mvDebug ?? globalThis.__mvDebug,
    shortcuts: registered.shortcuts,
    context,
  }
}

/** Pane leaves of the given layout in reading order. */
export function leavesOf(node, out = []) {
  if (node == null) return out
  if (node.kind === 'leaf') {
    out.push(node)
    return out
  }
  leavesOf(node.a, out)
  leavesOf(node.b, out)
  return out
}
