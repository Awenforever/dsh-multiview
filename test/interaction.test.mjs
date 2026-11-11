/**
 * Interaction tests: popovers that only exist after a click.
 *
 * The render fuzz boots the bundle with a fake host whose hooks do nothing, so anything behind
 * `useState(false)` (the Views popover, the update dialog, the rename input) never appeared in a
 * test. This file adds a small stateful hook runtime: components get real state, a setter marks the
 * tree dirty, and the harness re-renders until it settles — so a click can be performed and the
 * result asserted.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/* ---------- element tree ---------- */
function createElement(type, props, ...children) {
  return { type, props: props ?? {}, children: children.flat(Infinity).filter((child) => child != null) }
}

/* ---------- mutable React surface ----------
   The bundle captures this object once, so swapping its hook methods between passes is how the
   harness supplies live state without touching shipped code. */
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

/* ---------- stateful hook runtime ---------- */
function createHarness() {
  const slots = { state: [], refs: [] }
  let cursor = 0
  let dirty = false
  let effects = []

  const hooks = {
    useState(initial) {
      const index = cursor++
      if (slots.state[index] === undefined) {
        slots.state[index] = typeof initial === 'function' ? initial() : initial
      }
      const set = (next) => {
        const value = typeof next === 'function' ? next(slots.state[index]) : next
        if (value === slots.state[index]) return
        slots.state[index] = value
        dirty = true
      }
      return [slots.state[index], set]
    },
    useReducer(_reducer, initial) {
      const index = cursor++
      if (slots.state[index] === undefined) slots.state[index] = initial
      const dispatch = (next) => {
        slots.state[index] = typeof next === 'function' ? next(slots.state[index]) : next
        dirty = true
      }
      return [slots.state[index], dispatch]
    },
    useRef(initial) {
      const index = cursor++
      if (slots.refs[index] === undefined) slots.refs[index] = { current: initial }
      return slots.refs[index]
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
    try {
      return expand(component(props))
    } finally {
      for (const key of Object.keys(saved)) React[key] = saved[key]
    }
  }

  /** Render until the tree stops changing, running effects after each pass. */
  function render(component, props, maxPasses = 20) {
    let tree = renderOnce(component, props)
    for (let pass = 0; pass < maxPasses && dirty; pass += 1) {
      const pending = effects
      for (const effect of pending) {
        const cleanup = effect()
        if (typeof cleanup === 'function') cleanup()
      }
      tree = renderOnce(component, props)
    }
    return tree
  }

  return { render }
}

/* ---------- tree helpers ---------- */
function expand(node, depth = 0) {
  if (node == null || depth > 60) return node
  if (Array.isArray(node)) return node.map((child) => expand(child, depth))
  if (typeof node !== 'object') return node
  if (typeof node.type === 'function') {
    const children = node.children.length <= 1 ? node.children[0] : node.children
    const isClass = node.type.prototype && node.type.prototype.render !== undefined
    if (isClass) {
      const instance = new node.type({ ...node.props, children })
      return expand(instance.render(), depth + 1)
    }
    return expand(node.type({ ...node.props, children }), depth + 1)
  }
  return { ...node, children: (node.children ?? []).map((child) => expand(child, depth)) }
}

function collect(node, predicate, out = []) {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, predicate, out))
    return out
  }
  if (predicate(node)) out.push(node)
  for (const child of node.children ?? []) collect(child, predicate, out)
  return out
}

const byClass = (tree, className) =>
  collect(tree, (node) => {
    const value = node.props && node.props.className
    return typeof value === 'string' && value.split(/\s+/).includes(className)
  })
const byLabel = (tree, label) => collect(tree, (node) => node.props && node.props['aria-label'] === label)
/** Minimal event object: handlers in the bundle call these two methods. */
const fakeEvent = () => ({ stopPropagation: () => {}, preventDefault: () => {} })

const textOf = (node) => {
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

/* ---------- fake host ---------- */
const SESSION_IDS = ['s1', 's2']
const LIST = {
  phase: 'ready',
  ids: SESSION_IDS,
  byId: Object.fromEntries(SESSION_IDS.map((id) => [id, { id, title: id.toUpperCase(), blank: false }])),
}

function bootHost() {
  const store = {}
  const localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
  }
  const document = {
    head: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ dataset: {}, style: {}, appendChild: () => {}, remove: () => {}, setAttribute: () => {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { hasAttribute: () => false, setAttribute: () => {}, removeAttribute: () => {}, style: {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    documentElement: { style: {} },
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
  Object.assign(globalThis, { window, document, localStorage, location: window.location })

  const registered = []
  registered.shortcuts = []
  const context = {
    effect: (body) => { if (typeof body === 'function') body(); return () => {} },
    locale: { register: () => {}, bind: () => (key) => key },
    slots: {
      register: (declaration, component) => { registered.push({ name: declaration.name, key: declaration.key, component }); return { dispose: () => {} } },
      inject: (name, body) => {
        const isGenerator = typeof body === 'function' && body.constructor && body.constructor.name === 'GeneratorFunction'
        return isGenerator ? [...body()] : body()
      },
    },
    sessions: { list: { getSnapshot: () => LIST }, retain: () => ({ ready: Promise.resolve(), release: () => {} }), useList: (selector) => selector(LIST) },
    workspaces: { list: { getSnapshot: () => ({ groups: [], workspaceId: 'default' }) }, useList: (selector) => selector({ groups: [], workspaceId: 'default' }) },
    layout: { panelInfo: { getSnapshot: () => ({ activePanelId: 'multiview' }) }, usePanelInfo: (selector) => selector({ activePanelId: 'multiview' }) },
    uiWorkspace: { openSession: () => {} },
    shortcuts: { register: (entry) => { registered.shortcuts.push(entry); return () => {} } },
  }

  let loaded = null
  globalThis.__ModuleLoader__ = { load: (spec) => { loaded = spec } }
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  new Function('window', 'document', 'localStorage', source)(globalThis, document, localStorage)
  const module = loaded.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected require: ' + name)
  })
  module.apply(context)

  const main = registered.find((entry) => entry.name === 'main')
  assert.ok(main !== undefined, 'main panel was not registered')
  return { stage: main.component, hook: globalThis.__mvDebug }
}

/* ---------- tests ---------- */
test('the Views popover opens, applies a saved split, and closes again', () => {
  const { stage, hook } = bootHost()
  const harness = createHarness()
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(LIST),
    useSessionStatus: (selector) => selector(new Map()),
  }

  /* Start from a saved split so the popover has a row. */
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  const state = hook.state()
  assert.equal(state.views.length, 1, 'a two-Session split is captured')

  let tree = harness.render(stage, props)
  assert.equal(byClass(tree, 'mv-views-pop').length, 0, 'the popover starts closed')

  /* Open it. */
  const toggle = byClass(tree, 'mv-views-toggle')[0]
  assert.ok(toggle !== undefined, 'the Views toggle exists')
  toggle.props.onClick(fakeEvent())
  tree = harness.render(stage, props)
  assert.equal(byClass(tree, 'mv-views-pop').length, 1, 'one click opens the popover')
  assert.equal(byClass(tree, 'mv-views-row').length, state.views.length, 'every saved split has a row')

  /* Applying a row closes the popover and reports the split as current. */
  const applyButton = byClass(tree, 'mv-views-name')[0]
  assert.ok(applyButton !== undefined, 'each row has its apply button')
  applyButton.props.onClick(fakeEvent())
  tree = harness.render(stage, props)
  assert.equal(byClass(tree, 'mv-views-pop').length, 0, 'applying closes the popover')
  assert.equal(hook.state().currentViewId, state.views[0].id, 'the applied split becomes current')
  assert.equal(byClass(tree, 'mv-bar-view').length, 1, 'the bar now names the active split')
})

test('renaming a saved split through the popover writes a custom name', () => {
  const { stage, hook } = bootHost()
  const harness = createHarness()
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(LIST),
    useSessionStatus: (selector) => selector(new Map()),
  }

  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  const viewId = hook.state().views[0].id

  let tree = harness.render(stage, props)
  byClass(tree, 'mv-views-toggle')[0].props.onClick(fakeEvent())
  tree = harness.render(stage, props)

  const rename = byLabel(tree, 'viewsRename')[0]
  assert.ok(rename !== undefined, 'each row offers rename')
  rename.props.onClick(fakeEvent())
  tree = harness.render(stage, props)

  const input = byClass(tree, 'mv-views-input')[0]
  assert.ok(input !== undefined, 'rename opens an inline input')
  input.props.onChange({ target: { value: '盯盘 A 组' } })
  tree = harness.render(stage, props)
  const liveInput = byClass(tree, 'mv-views-input')[0]
  liveInput.props.onKeyDown({ key: 'Enter', preventDefault: () => {} })
  tree = harness.render(stage, props)

  const saved = hook.state().views.find((view) => view.id === viewId)
  assert.equal(saved.name, '盯盘 A 组', 'the typed name is stored')
  assert.equal(byClass(tree, 'mv-views-input').length, 0, 'committing closes the inline input')
})
