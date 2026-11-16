/**
 * Regression: "focus" on a sidebar row must land on the split that already holds
 * that Session — not grow the current stage into a brand-new split.
 *
 * Reported 2026-11-16: from an unsplit conversation A, clicking 聚焦 on Session B
 * (already inside a saved split) produced a *new* split containing A and B.
 * Two independent causes, both covered here:
 *   1. the row action placed B into the current stage instead of restoring B's view;
 *   2. the stage's mount effect then re-seeded from the mainView conversation A,
 *      discarding whatever the click had put on stage.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bootHost, createHarness, byClass, leavesOf, makeSessions } from './harness.mjs'

const leaf = (id, sessionId) => ({ kind: 'leaf', id, sessionId })
const split = (id, a, b, ratio = 0.5) => ({ kind: 'split', id, dir: 'row', ratio, a, b })

/** Two sessions on stage, a third pair saved as a view — the shape the user was in. */
function seedState() {
  return {
    version: 3,
    /* Current stage: an ad-hoc pair that is NOT the saved view. */
    layout: split('s-root', leaf('p1', 's1'), leaf('p2', 's4')),
    /* Focus sits on the pane the user last touched, which is NOT where the target lives. */
    focused: 'p2',
    preset: 2,
    seeded: true,
    views: [
      {
        id: 'v1',
        name: 'SAVED',
        layout: split('s-v', leaf('p1', 's2'), leaf('p2', 's3')),
        savedAt: 1,
      },
    ],
    currentViewId: null,
  }
}

const props = (list) => ({
  renderSlot: () => null,
  SessionProvider: ({ children }) => children,
  useSessions: (selector) => selector(list),
  useSessionStatus: (selector) => selector(new Map()),
})

function hostWithFixture() {
  const list = makeSessions(['s1', 's2', 's3', 's4', 's5'])
  /* The user is looking at s1 outside the split; that is what the mount effect reads. */
  list.byId.s1.retainedBy = { mainView: 1 }
  const harness = createHarness()
  /* The user is in a conversation, so the split panel is not the selected main view. */
  const host = bootHost({ sessions: list, seed: seedState(), activePanelId: null })
  return { list, harness, host }
}

test('聚焦 on a Session inside a saved split restores that split, it does not create one', () => {
  const { list, harness, host } = hostWithFixture()
  const action = host.entries.find((entry) => entry.name === 'sidebar.workspaces.session.row.action')
  assert.ok(action !== undefined, 'the sidebar row action is registered')

  /* Click 聚焦 for s2, which lives in the saved view "v1". */
  const tree = harness.render(action.component, { sessionId: 's2' })
  const button = byClass(tree, 'mv-row-action')[0]
  assert.equal(button.props['data-active'], 'true', 'the row action reports that s2 is already in a split')
  button.props.onClick()

  /* Opening the panel mounts the stage; the mount effect must not re-seed from s1. */
  harness.render(host.stage, props(list))

  const state = host.hook.state()
  assert.equal(state.currentViewId, 'v1', 'the saved split holding s2 is the current view')
  assert.equal(state.layout.a.sessionId, 's2', 'the stage shows the saved split, not the conversation we came from')
  assert.equal(state.layout.b.sessionId, 's3', 'both panes of the saved split come back')
  assert.equal(state.focused, 'p1', 'the pane holding s2 takes focus')
  assert.ok(
    host.hook.state().views.every((view) => view.id === 'v1'),
    'no extra split was captured from the conversation we came from',
  )
})

test('opening the split without an explicit target leaves the stage on the conversation you are in', () => {
  const { list, harness, host } = hostWithFixture()
  /* No row action first: this is the plain 分屏 click. The conversation is already on stage,
     so the rule is "land on its pane", not "rebuild around it". */
  harness.render(host.stage, props(list))
  const state = host.hook.state()
  assert.equal(state.layout.a.sessionId, 's1', 'the conversation you are in stays in the first pane')
  assert.equal(state.layout.b.sessionId, 's4', 'the rest of the stage is left alone')
  assert.equal(state.focused, 'p1', 'focus lands on the pane holding that conversation')
  assert.notEqual(state.currentViewId, 'v1', 'the saved split is not hijacked by an unrelated open')
})

test('a Session that is nowhere in the split is still added, not searched for', () => {
  const { list, harness, host } = hostWithFixture()
  const action = host.entries.find((entry) => entry.name === 'sidebar.workspaces.session.row.action')
  const tree = harness.render(action.component, { sessionId: 's5' })
  const button = byClass(tree, 'mv-row-action')[0]
  assert.equal(button.props['data-active'], 'false', 'an unknown Session reads as "add to split"')
  button.props.onClick()
  harness.render(host.stage, props(list))
  const state = host.hook.state()
  const ids = leavesOf(state.layout).map((pane) => pane.sessionId)
  assert.ok(ids.includes('s5'), 'the Session the user asked for is on stage')
  assert.ok(ids.includes('s1'), 'the conversation they came from is still there')
  assert.equal(ids[ids.indexOf('s5')] === 's5' ? state.focused : null, state.focused, 'focus is on a real pane')
})