/**
 * Interaction tests: surfaces that only exist after a click.
 *
 * The render fuzz boots the bundle with hooks that do nothing, so anything behind `useState(false)`
 * (the Views popover, the update dialog, the rename input, the picker's search) never appeared in a
 * test. The shared harness supplies stateful hooks, so a click can be performed and the result
 * asserted here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bootHost,
  createHarness,
  byClass,
  byLabel,
  textOf,
  fakeEvent,
  collect,
  makeSessions,
} from './harness.mjs'

const SESSION_IDS = ['s1', 's2']
const LIST = makeSessions(SESSION_IDS)

test('the Views popover opens, applies a saved split, and closes again', () => {
  const { stage, hook } = bootHost({ sessions: LIST })
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
  const { stage, hook } = bootHost({ sessions: LIST })
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

test('the empty-pane picker filters as you type and binds on click', () => {
  const { stage, hook } = bootHost({ sessions: LIST })
  const harness = createHarness()
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(LIST),
    useSessionStatus: (selector) => selector(new Map()),
  }

  /* Two empty panes, so two pickers — every count below is scoped to one of them. */
  hook.bind('p1', null)
  hook.bind('p2', null)
  let tree = harness.render(stage, props)
  assert.equal(byClass(tree, 'mv-picker').length, 2, 'each empty pane offers a picker')

  const firstPicker = () => byClass(tree, 'mv-picker')[0]
  const itemsIn = (picker) => byClass(picker, 'mv-picker-item')
  assert.equal(itemsIn(firstPicker()).length, SESSION_IDS.length, 'every pickable Session is listed in one picker')

  /* Typing filters that picker only. */
  const searchIn = (picker) => byClass(picker, 'mv-picker-search')[0]
  searchIn(firstPicker()).props.onChange({ target: { value: 's1' } })
  tree = harness.render(stage, props)
  assert.equal(itemsIn(firstPicker()).length, 1, 'typing narrows the list')

  /* A filter that matches nothing explains itself with the no-match copy. */
  searchIn(firstPicker()).props.onChange({ target: { value: 'zzz' } })
  tree = harness.render(stage, props)
  const emptyNote = byClass(firstPicker(), 'mv-picker-empty')[0]
  assert.ok(emptyNote !== undefined, 'a filter with no match explains itself')
  assert.equal(textOf(emptyNote), 'pickEmpty', 'the no-match copy is used, not the first-run copy')

  /* Clear, then bind by clicking a row. */
  searchIn(firstPicker()).props.onChange({ target: { value: '' } })
  tree = harness.render(stage, props)
  const firstItem = itemsIn(firstPicker())[0]
  assert.ok(firstItem !== undefined, 'rows are clickable')
  firstItem.props.onClick(fakeEvent())
  tree = harness.render(stage, props)

  const leaves = []
  const walk = (node) => {
    if (node == null) return
    if (node.kind === 'leaf') { leaves.push(node); return }
    walk(node.a)
    walk(node.b)
  }
  walk(hook.state().layout)
  assert.equal(leaves.filter((leaf) => leaf.sessionId !== null).length, 1, 'clicking a row binds exactly one pane')
  assert.equal(byClass(tree, 'mv-picker').length, 1, 'the bound pane stops showing a picker')
})

test('the update dialog opens as a modal', () => {
  const { stage } = bootHost({ sessions: LIST })
  const harness = createHarness()
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(LIST),
    useSessionStatus: (selector) => selector(new Map()),
  }

  let tree = harness.render(stage, props)
  const button = byClass(tree, 'mv-update')[0]
  assert.ok(button !== undefined, 'the update control exists')
  assert.equal(button.props['aria-haspopup'], 'dialog', 'it announces a dialog')

  button.props.onClick(fakeEvent())
  tree = harness.render(stage, props)
  const dialogs = collect(tree, (node) => node.props && node.props.role === 'dialog')
  assert.equal(dialogs.length, 1, 'one click opens a single dialog')
  assert.equal(dialogs[0].props['aria-modal'], 'true', 'the dialog declares itself modal')
})

test('the picker says when a conversation is already on this split', () => {
  const list = makeSessions(['s1', 's2'])
  const { stage, hook } = bootHost({ sessions: list })
  const harness = createHarness()
  const render = () =>
    harness.render(stage, {
      renderSlot: () => null,
      SessionProvider: ({ children }) => children,
      useSessions: (selector) => selector(list),
      useSessionStatus: (selector) => selector(new Map()),
    })

  /* One conversation on stage, one empty pane, no saved split yet. */
  hook.bind('p1', 's1')
  let tree = render()
  const emptyPane = byClass(tree, 'mv-pane')[1]
  const rows = byClass(emptyPane, 'mv-picker-item')
  assert.equal(rows.length, 2, 'both conversations are offered')

  const onStageRow = rows.find((row) => textOf(row).startsWith('s1'.toUpperCase()))
  const freeRow = rows.find((row) => textOf(row).startsWith('s2'.toUpperCase()))
  assert.ok(onStageRow !== undefined && freeRow !== undefined, 'one row per conversation')

  /* The on-stage row stays pickable — moving a conversation is legitimate — but it explains itself. */
  assert.notEqual(onStageRow.props.disabled, true, 'moving a conversation stays possible')
  assert.equal(textOf(onStageRow), 'S1pickOnStage', 'the row is labelled as already on this split')
  assert.equal(textOf(freeRow), 'S2', 'a free conversation carries no such label')
})

test('the tooltip names the shortcut while the accessible name stays the action', () => {
  const list = makeSessions(['s1', 's2'])
  const { stage, hook } = bootHost({ sessions: list })
  const harness = createHarness()
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  const tree = harness.render(stage, {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(new Map()),
  })

  const maximize = byLabel(tree, 'maximize')[0]
  assert.ok(maximize !== undefined, 'the maximize control exists')
  assert.equal(maximize.props.title, 'maximize · Mod+Alt+M', 'the tooltip teaches the chord')
  assert.equal(maximize.props['aria-label'], 'maximize', 'a screen reader hears the action only')

  const remove = byLabel(tree, 'remove')[0]
  assert.ok(remove !== undefined, 'the clear control exists')
  assert.equal(remove.props.title, 'remove · Mod+Alt+W', 'the tooltip teaches the chord')
})

test('the picker says how many conversations it is hiding', () => {
  const ids = Array.from({ length: 300 }, (_, index) => 's' + String(index + 1).padStart(3, '0'))
  const list = makeSessions(ids)
  const { stage, hook } = bootHost({ sessions: list })
  const harness = createHarness()
  hook.bind('p1', null)

  let tree = harness.render(stage, {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(new Map()),
  })

  const picker = byClass(tree, 'mv-picker')[0]
  assert.equal(byClass(picker, 'mv-picker-item').length, 240, 'the list stops at the cap')
  const more = byClass(picker, 'mv-picker-more')[0]
  assert.ok(more !== undefined, 'the cut-off is stated, not silent')
  assert.equal(more.props['data-remaining'], '60', 'it says how many are hidden')

  /* Typing still searches the whole set, including rows past the cap. */
  const search = byClass(picker, 'mv-picker-search')[0]
  search.props.onChange({ target: { value: 's300' } })
  tree = harness.render(stage, {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(new Map()),
  })
  const narrowed = byClass(tree, 'mv-picker')[0]
  assert.equal(byClass(narrowed, 'mv-picker-item').length, 1, 'a hidden conversation is still findable')
  assert.equal(byClass(narrowed, 'mv-picker-more').length, 0, 'no notice when nothing is hidden')

  /* A short list never shows the notice. */
  const small = makeSessions(['s1', 's2'])
  const smallHost = bootHost({ sessions: small })
  const smallHarness = createHarness()
  smallHost.hook.bind('p1', null)
  const smallTree = smallHarness.render(smallHost.stage, {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(small),
    useSessionStatus: (selector) => selector(new Map()),
  })
  assert.equal(byClass(smallTree, 'mv-picker-more').length, 0, 'a short list carries no notice')
})

test('the picker asks the host index when the filter is a phrase', async () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const asked = []
  const { stage, hook } = bootHost({
    sessions: list,
    search: (query) => {
      asked.push(query)
      return Promise.resolve({ ok: true, value: { items: [{ sessionId: 's3', snippet: 'the WAL discussion' }], hasMore: false } })
    },
  })
  const harness = createHarness()
  hook.bind('p1', null)
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(new Map()),
  }

  let tree = harness.render(stage, props)
  const firstPicker = () => byClass(tree, 'mv-picker')[0]
  /* Two empty panes means two pickers; every count below is scoped to the first one. */
  assert.equal(byClass(firstPicker(), 'mv-picker-item').length, 3, 'the unfiltered list shows every conversation')
  assert.equal(asked.length, 0, 'no host query without a phrase')

  /* A single character is not worth a host round trip. */
  byClass(firstPicker(), 'mv-picker-search')[0].props.onChange({ target: { value: 'w' } })
  tree = harness.render(stage, props)
  await new Promise((resolve) => setTimeout(resolve, 200))
  assert.equal(asked.length, 0, 'one character stays local')

  /* A phrase asks the index; its hit appears even though the title does not match. */
  byClass(firstPicker(), 'mv-picker-search')[0].props.onChange({ target: { value: 'wal' } })
  tree = harness.render(stage, props)
  await new Promise((resolve) => setTimeout(resolve, 220))
  tree = harness.render(stage, props)
  assert.deepEqual(asked, ['wal'], 'the phrase is sent once, debounced')
  const rows = byClass(firstPicker(), 'mv-picker-item')
  assert.equal(rows.length, 1, 'only the content hit remains')
  assert.equal(textOf(rows[0]), 'S3the WAL discussion', 'the hit carries its snippet')
})

const searchProps = (list) => ({
  renderSlot: () => null,
  SessionProvider: ({ children }) => children,
  useSessions: (selector) => selector(list),
  useSessionStatus: (selector) => selector(new Map()),
})

test('search requests collapse while typing, and a late answer cannot win', async () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const calls = []
  const pending = new Map()
  const { stage, hook } = bootHost({
    sessions: list,
    search: (query) => {
      calls.push(query)
      return new Promise((resolve) => {
        pending.set(query, (items) => resolve({ ok: true, value: { items, hasMore: false } }))
      })
    },
  })
  const harness = createHarness()
  hook.bind('p1', null)
  const picker = (tree) => byClass(tree, 'mv-picker')[0]
  const render = () => harness.render(stage, searchProps(list))

  let tree = render()

  /* Two phrases inside one debounce window collapse to the last one. */
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'ab' } })
  tree = render()
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'abc' } })
  tree = render()
  await new Promise((resolve) => setTimeout(resolve, 220))
  assert.deepEqual(calls, ['abc'], 'only the settled phrase is requested')

  /* Answer it, then deliver the abandoned phrase's answer afterwards. */
  pending.get('abc')([{ sessionId: 's3', snippet: 'fresh hit' }])
  await new Promise((resolve) => setTimeout(resolve, 20))
  tree = render()
  assert.equal(textOf(byClass(picker(tree), 'mv-picker-item')[0]), 'S3fresh hit', 'the fresh answer is shown')

  /* A real stale request: start 'ab', let it be superseded, answer it late. */
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'ab' } })
  tree = render()
  await new Promise((resolve) => setTimeout(resolve, 220))
  assert.deepEqual(calls, ['abc', 'ab'], 'the second phrase reached the host')

  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'abcd' } })
  tree = render()
  await new Promise((resolve) => setTimeout(resolve, 220))
  assert.deepEqual(calls, ['abc', 'ab', 'abcd'], 'the third phrase reached the host')

  pending.get('abcd')([{ sessionId: 's3', snippet: 'newest hit' }])
  await new Promise((resolve) => setTimeout(resolve, 20))
  tree = render()
  pending.get('ab')([{ sessionId: 's2', snippet: 'stale hit' }])
  await new Promise((resolve) => setTimeout(resolve, 20))
  tree = render()
  const rows = byClass(picker(tree), 'mv-picker-item')
  assert.equal(rows.length, 1, 'exactly one answer is on screen')
  assert.equal(textOf(rows[0]), 'S3newest hit', 'the stale answer for an abandoned phrase is ignored')
})

test('a superseded search is aborted, and a failing search falls back to titles', async () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const signals = []
  let fail = false
  const { stage, hook } = bootHost({
    sessions: list,
    search: (query, signal) => {
      signals.push(signal)
      if (fail) return Promise.reject(new Error('index unavailable'))
      return Promise.resolve({ ok: true, value: { items: [], hasMore: false } })
    },
  })
  const harness = createHarness()
  hook.bind('p1', null)
  const picker = (tree) => byClass(tree, 'mv-picker')[0]

  let tree = harness.render(stage, searchProps(list))
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'alpha' } })
  tree = harness.render(stage, searchProps(list))
  await new Promise((resolve) => setTimeout(resolve, 220))
  assert.equal(signals.length, 1, 'the phrase was sent')
  assert.ok(signals[0] instanceof AbortSignal, 'the host receives a cancellation signal')

  /* Typing again supersedes the first request, which must be aborted. */
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'alphab' } })
  tree = harness.render(stage, searchProps(list))
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(signals[0].aborted, true, 'the superseded request is aborted')

  /* When the index fails, titles still filter and the list is not left saying "searching". */
  fail = true
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'S2' } })
  tree = harness.render(stage, searchProps(list))
  await new Promise((resolve) => setTimeout(resolve, 220))
  tree = harness.render(stage, searchProps(list))
  const rows = byClass(picker(tree), 'mv-picker-item')
  assert.equal(rows.length, 1, 'a failing index does not empty the list')
  assert.equal(textOf(rows[0]), 'S2', 'the local title filter still works')
  assert.equal(byClass(picker(tree), 'mv-picker-empty').length, 0, 'no misleading empty note')

  /* A phrase that matches no title must not stay stuck on "searching" after the index fails. */
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'nomatch' } })
  tree = harness.render(stage, searchProps(list))
  await new Promise((resolve) => setTimeout(resolve, 220))
  tree = harness.render(stage, searchProps(list))
  const note = byClass(picker(tree), 'mv-picker-empty')[0]
  assert.ok(note !== undefined, 'an empty result explains itself')
  assert.equal(textOf(note), 'pickEmpty', 'the state is "no match", not "still searching"')
})

test('a fresh answer with no hits clears them', async () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const answers = { wal: [{ sessionId: 's3', snippet: 'WAL discussion' }], zzz: [] }
  const { stage, hook } = bootHost({
    sessions: list,
    search: (query) => Promise.resolve({ ok: true, value: { items: answers[query] ?? [], hasMore: false } }),
  })
  const harness = createHarness()
  hook.bind('p1', null)
  const picker = (tree) => byClass(tree, 'mv-picker')[0]
  const render = () => harness.render(stage, searchProps(list))

  let tree = render()
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'wal' } })
  tree = render()
  await new Promise((resolve) => setTimeout(resolve, 220))
  tree = render()
  assert.equal(byClass(picker(tree), 'mv-picker-item').length, 1, 'the hit is listed')

  /* A later phrase with no hits must not leave the earlier hit on screen. */
  byClass(picker(tree), 'mv-picker-search')[0].props.onChange({ target: { value: 'zzz' } })
  tree = render()
  await new Promise((resolve) => setTimeout(resolve, 220))
  tree = render()
  assert.equal(byClass(picker(tree), 'mv-picker-item').length, 0, 'stale hits are cleared by an empty answer')
  assert.equal(textOf(byClass(picker(tree), 'mv-picker-empty')[0]), 'pickEmpty', 'and the list says there is no match')
})

test('a two-pane split can change a pane without deleting or growing', () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const { stage, hook } = bootHost({ sessions: list })
  const harness = createHarness()
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(new Map()),
  }
  const render = () => harness.render(stage, props)

  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  let tree = render()
  assert.equal(byClass(tree, 'mv-picker').length, 0, 'both panes show conversations')

  /* The change action exists on a bound pane even at the two-pane minimum. */
  const changes = byLabel(tree, 'paneChange')
  assert.equal(changes.length, 2, 'each bound pane offers it')

  /* Opening it swaps the body for a picker, leaving the other pane alone. */
  changes[0].props.onClick(fakeEvent())
  tree = render()
  assert.equal(byClass(tree, 'mv-picker').length, 1, 'one picker replaces one conversation')
  const panes = byClass(tree, 'mv-pane')
  assert.equal(byClass(panes[1], 'mv-picker').length, 0, 'the other pane is untouched')

  /* Picking a free conversation re-points the pane instead of adding one. */
  byClass(byClass(tree, 'mv-picker')[0], 'mv-picker-item')
    .find((row) => textOf(row) === 'S3')
    .props.onClick(fakeEvent())
  tree = render()
  const state = hook.state()
  const leaves = []
  const walk = (node) => {
    if (node === null || node === undefined) return
    if (node.kind === 'leaf') { leaves.push(node); return }
    walk(node.a)
    walk(node.b)
  }
  walk(state.layout)
  assert.equal(leaves.length, 2, 'the split did not grow')
  assert.deepEqual(leaves.map((leaf) => leaf.sessionId), ['s3', 's2'], 'only the chosen pane changed')
  assert.equal(byClass(tree, 'mv-picker').length, 0, 'the picker closes after choosing')
})

test('Escape cancels the change without touching the pane', () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const { stage, hook } = bootHost({ sessions: list })
  const harness = createHarness()
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(new Map()),
  }
  const render = () => harness.render(stage, props)

  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  let tree = render()
  byLabel(tree, 'paneChange')[1].props.onClick(fakeEvent())
  tree = render()
  assert.equal(byClass(tree, 'mv-picker').length, 1, 'the picker is open')

  const search = byClass(byClass(tree, 'mv-picker')[0], 'mv-picker-search')[0]
  search.props.onKeyDown({ key: 'Escape', currentTarget: { blur: () => {} }, preventDefault: () => {} })
  tree = render()
  assert.equal(byClass(tree, 'mv-picker').length, 0, 'Escape restores the conversation')

  const leaves = []
  const walk = (node) => {
    if (node === null || node === undefined) return
    if (node.kind === 'leaf') { leaves.push(node); return }
    walk(node.a)
    walk(node.b)
  }
  walk(hook.state().layout)
  assert.deepEqual(leaves.map((leaf) => leaf.sessionId), ['s1', 's2'], 'nothing was rebound')
})

test('a narrow stage shows one pane plus a switcher that carries status', () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const { stage, hook, resize } = bootHost({ sessions: list })
  const harness = createHarness()
  const statuses = new Map([
    ['s1', { completionUnread: true }],
    ['s3', { running: true }],
  ])
  const props = {
    renderSlot: () => null,
    SessionProvider: ({ children }) => children,
    useSessions: (selector) => selector(list),
    useSessionStatus: (selector) => selector(statuses),
  }
  const render = () => harness.render(stage, props)

  hook.shape(3)
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  hook.bind('p3', 's3')

  /* Wide: every pane is on screen and there is no switcher. */
  let tree = render()
  resize({ width: 1400, height: 900 })
  tree = render()
  assert.equal(byClass(tree, 'mv-pane').length, 3, 'a wide stage shows all three panes')
  const wideStrip = byClass(tree, 'mv-strip')[0]
  assert.equal(wideStrip === undefined ? 0 : byClass(wideStrip, 'mv-chip').length, 0, 'and needs no switcher')

  /* Narrow: one pane, and the other conversations survive as chips with their own status. */
  resize({ width: 700, height: 900 })
  tree = render()
  assert.equal(byClass(tree, 'mv-pane').length, 1, 'a narrow stage shows one pane')
  /* The switcher lives in the strip; its chips share a class with the shape buttons. */
  const strip = byClass(tree, 'mv-strip')[0]
  assert.ok(strip !== undefined, 'a narrow stage grows a switcher strip')
  const chips = byClass(strip, 'mv-chip')
  assert.equal(chips.length, 3, 'a chip per pane, so none of them becomes invisible')
  const states = chips.map((chip) => chip.props['data-state'])
  assert.deepEqual(states, ['unread', 'idle', 'running'], 'each chip reports its pane status')

  /* Focus already sits on the last bound pane, so click a *different* chip: the assertion only
     proves anything if the visible pane has to change. */
  assert.equal(textOf(byClass(tree, 'mv-head-title')[0]), 'S3', 'the focused pane is the one shown')
  chips[0].props.onClick(fakeEvent())
  tree = render()
  const headings = byClass(tree, 'mv-head-title').map(textOf)
  assert.deepEqual(headings, ['S1'], 'the clicked conversation is the one on screen')

  /* Back to wide, everything returns. */
  resize({ width: 1400, height: 900 })
  tree = render()
  assert.equal(byClass(tree, 'mv-pane').length, 3, 'widening restores the whole split')
})
