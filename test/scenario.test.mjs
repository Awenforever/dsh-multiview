/**
 * Scenario test: the target situation end to end — three conversations watched at once.
 *
 * This is the acceptance test for the product's stated purpose: one person, 2-4 conversations making
 * progress on their own, who must notice the moment one needs them. It ties together injection, pane
 * binding, attention, the sidebar badge, the saved-split library and its name in the bar.
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
  leavesOf,
  makeSessions,
} from './harness.mjs'

const props = (list, statuses) => ({
  renderSlot: () => null,
  SessionProvider: ({ children }) => children,
  useSessions: (selector) => selector(list),
  useSessionStatus: (selector) => selector(statuses ?? new Map()),
})

test('watching three conversations: attention, badge, saved split and focus jump', () => {
  const list = makeSessions(['s1', 's2', 's3'])
  const { stage, icon, hook, shortcuts } = bootHost({ sessions: list })
  const harness = createHarness()

  /* 1. Put three conversations on stage, the way a user would. */
  hook.shape(3)
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  hook.bind('p3', 's3')
  const state = hook.state()
  assert.deepEqual(leavesOf(state.layout).map((leaf) => leaf.sessionId), ['s1', 's2', 's3'], 'three panes hold three conversations')
  assert.equal(state.views.length, 1, 'the working set is remembered as a saved split')

  /* 2. Statuses: one blocked on a question, one finished unread, one merely running. */
  const statuses = new Map([
    ['s1', { pendingInteraction: {} }],
    ['s2', { completionUnread: true }],
    ['s3', { running: true }],
  ])

  /* The sidebar icon counts two panes that want the user — running does not count. */
  const iconTree = harness.render(icon, { size: 16, active: false, useSessionStatus: (selector) => selector(statuses) })
  const badges = byClass(iconTree, 'mv-icon-badge')
  assert.equal(badges.length, 1, 'the sidebar icon shows a badge')
  assert.equal(badges[0].props['data-count'], '2', 'the badge counts exactly the two panes that need the user')

  /* 3. The stage marks those two panes and leaves the running one quiet. */
  const tree = harness.render(stage, props(list, statuses))
  const dots = collectDots(tree)
  assert.deepEqual(dots.map((dot) => dot.props['data-state']), ['waiting', 'unread', 'running'], 'each pane reports its own state')

  /* Every non-idle dot is clickable (clicking focuses its pane); what "needs the user" changes is
     the badge count asserted above, not whether the dot can be clicked. */
  const dotButtons = byClass(tree, 'mv-dot-action')
  assert.equal(dotButtons.length, 3, 'each active pane dot is a button that focuses its pane')

  /* 4. The attention shortcut skips the running pane. */
  const attention = shortcuts.find((entry) => entry.id === 'multiview.pane.attention')
  assert.ok(attention !== undefined, 'the attention command is registered')
  const handled = attention.resolve()
  assert.equal(handled.status, 'handled', 'the command is live on the split panel')
  harness.render(stage, props(list, statuses))

  /* Focus starts on the last bound pane; jumping must land on a pane that needs the user. */
  const before = hook.state().focused
  assert.equal(before, 'p3', 'binding the third conversation focused it')
  handled.run()
  const after = hook.state().focused
  assert.ok(after === 'p1' || after === 'p2', 'the jump lands on a pane that wants the user, never the running one')

  /* 5. The saved split carries the working set, and its name reaches the bar once applied. */
  const view = hook.state().views[0]
  hook.renameView(view.id, '盯盘 A 组')
  hook.applyView(view.id)
  const named = harness.render(stage, props(list, statuses))
  assert.deepEqual(byClass(named, 'mv-bar-view').map((node) => textOf(node)), ['盯盘 A 组'], 'the bar names the split you are in')

  /* 6. Archiving a conversation empties its pane and drops it from the badge count. */
  const saved = hook.state()
  const payload = {
    version: 3,
    layout: saved.layout,
    focused: saved.focused,
    preset: saved.preset,
    seeded: true,
    views: saved.views,
    currentViewId: saved.currentViewId,
  }
  const archivedHost = bootHost({ sessions: list, archived: ['s2'], seed: payload })
  archivedHost.hook.clearArchived()
  const remaining = leavesOf(archivedHost.hook.state().layout).map((leaf) => leaf.sessionId)
  assert.deepEqual(remaining, ['s1', null, 's3'], 'the archived conversation leaves its pane, the others stay put')
})

/** Every pane's status dot, in reading order. */
function collectDots(tree) {
  const panes = byClass(tree, 'mv-pane')
  return panes.flatMap((pane) => byClass(pane, 'mv-dot'))
}

test('the attention shortcut always moves the user, even when nothing waits', () => {
  /* Silence is indistinguishable from a broken key. With nothing asking for the user the command
     walks to the next pane instead of spending the keystroke on nothing. It only runs while the
     split is the active panel, so the movement is always on screen. */
  const list = makeSessions(['s1', 's2', 's3'])
  const { stage, hook, shortcuts } = bootHost({ sessions: list })
  const harness = createHarness()

  hook.shape(3)
  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  hook.bind('p3', 's3')

  const attention = shortcuts.find((entry) => entry.id === 'multiview.pane.attention')
  assert.ok(attention !== undefined, 'the attention command is registered')

  /* Everything idle: nothing wants the user. */
  const idle = new Map([
    ['s1', {}],
    ['s2', {}],
    ['s3', {}],
  ])
  harness.render(stage, props(list, idle))

  const answer = attention.resolve()
  assert.equal(answer.status, 'handled', 'the command owns its keystroke on the split panel')

  const before = hook.state().focused
  answer.run()
  const after = hook.state().focused
  assert.notEqual(after, before, 'the keystroke moves the user somewhere')

  /* And with a pane waiting, it still lands there rather than merely moving on. */
  const waiting = new Map([
    ['s1', { pendingInteraction: {} }],
    ['s2', {}],
    ['s3', {}],
  ])
  harness.render(stage, props(list, waiting))
  attention.resolve().run()
  assert.equal(hook.state().focused, 'p1', 'a pane that needs the user wins over walking onward')
})

test('focus never lands on a pane the user cannot see', () => {
  /* While a pane is maximized only that pane is on screen, so moving focus elsewhere would leave the
     focused pane invisible — and the next keystroke (close, maximize) would act on something the user
     cannot see. Focusing a different pane therefore leaves the maximized view. */
  const list = makeSessions(['s1', 's2'])
  const { stage, hook, shortcuts } = bootHost({ sessions: list })
  const harness = createHarness()

  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  hook.maximize('p1')
  assert.equal(hook.state().maximized, 'p1', 'the pane is maximized')

  const focusNext = shortcuts.find((entry) => entry.id === 'multiview.pane.focusNext')
  assert.ok(focusNext !== undefined, 'the focus command is registered')
  harness.render(stage, props(list, new Map()))

  focusNext.resolve().run()
  const state = hook.state()
  assert.notEqual(state.focused, state.maximized, 'the focused pane is the visible pane')
  assert.equal(state.maximized, null, 'moving focus leaves the maximized view')
  assert.equal(state.focused, 'p2', 'and lands on the neighbouring pane')
})

test('an archived conversation cannot leave its pane maximized and empty', () => {
  /* Maximizing an empty pane is refused on the way in, but a pane could be maximized first and emptied
     afterwards. The stage would then show a full-screen picker hiding everything else. */
  const list = makeSessions(['s1', 's2'])
  /* The fixture reads the archive list by reference, so it can change between renders. */
  const archive = []
  const { stage, hook } = bootHost({ sessions: list, archived: archive })
  const harness = createHarness()

  hook.bind('p1', 's1')
  hook.bind('p2', 's2')
  hook.maximize('p1')
  assert.equal(hook.state().maximized, 'p1', 'p1 is maximized')

  /* The host reports s1 as archived; the pane empties under the maximized claim. */
  archive.push('s1')
  hook.clearArchived()
  harness.render(stage, props(list, new Map()))

  const state = hook.state()
  const pane = leavesOf(state.layout).find((leaf) => leaf.id === 'p1')
  assert.equal(pane.sessionId, null, 'the archived conversation left its pane')
  assert.equal(state.maximized, null, 'so the maximized claim is dropped too')
})
