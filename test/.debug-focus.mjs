import { bootHost, createHarness, makeSessions } from './harness.mjs'
const leaf = (id, s) => ({ kind: 'leaf', id, sessionId: s })
const split = (id, a, b) => ({ kind: 'split', id, dir: 'row', ratio: 0.5, a, b })
const list = makeSessions(['s1','s2','s3','s4','s5'])
list.byId.s1.retainedBy = { mainView: 1 }
const seed = { version: 3, layout: split('s-root', leaf('p1','s1'), leaf('p2','s4')), focused: 'p2', preset: 2, seeded: true,
  views: [{ id: 'v1', name: 'SAVED', layout: split('s-v', leaf('p1','s2'), leaf('p2','s3')), savedAt: 1 }], currentViewId: null }
const harness = createHarness()
const host = bootHost({ sessions: list, seed, activePanelId: null })
console.log('before:', host.hook.state().focused, host.hook.state().currentViewId)
harness.render(host.stage, { renderSlot: () => null, SessionProvider: ({children}) => children, useSessions: (sel) => sel(list), useSessionStatus: (sel) => sel(new Map()) })
const s = host.hook.state()
console.log('after:', s.focused, s.currentViewId, s.layout.a.sessionId, s.layout.b.sessionId)
