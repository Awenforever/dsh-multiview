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
