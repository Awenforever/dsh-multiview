/**
 * dsh-multiview — Client half.
 * Generated from src/client/*.ts by scripts/build.mjs. Do not edit by hand.
 */
window.__ModuleLoader__.load({
  id: 'dsh-multiview',
  factory(require) {
    const React = require('react')
    const h = React.createElement
const NS = 'multiview';
const MV_PANEL_ID = 'multiview';
const MV_PANE_SLOT = 'multiview.pane';
const MV_STORAGE_KEY = 'dsh.multiview.v1';
const MV_ZH = {
    panel: '分屏',
    title: '分屏',
    empty: '选择一个会话',
    pick: '选择会话',
    loading: '正在打开会话…',
    openFailed: '打开会话失败：{message}',
    noContent: '当前 DSH 版本不支持在格内嵌入会话',
    paneCrashed: '这一格出错了：{message}',
    stageCrashed: '分屏面板出错了：{message}',
    paneLabel: '第 {n} 格',
    running: '运行中',
    waiting: '等待你处理',
    unread: '有新结果'
};
const MV_EN = {
    panel: 'Split',
    title: 'Split',
    empty: 'Pick a session',
    pick: 'Pick a session',
    loading: 'Opening session…',
    openFailed: 'Could not open this session: {message}',
    noContent: 'This DSH version cannot host a conversation in a pane',
    paneCrashed: 'This pane failed: {message}',
    stageCrashed: 'The split view failed: {message}',
    paneLabel: 'Pane {n}',
    running: 'Running',
    waiting: 'Waiting for you',
    unread: 'New result'
};
let PTX = null;
let T = function translateFallback(key) {
    return MV_ZH[key] === undefined ? key : MV_ZH[key];
};
function mvFormat(template, params) {
    if (params === undefined) return template;
    return template.replace(/\{(\w+)\}/g, (match, name)=>params[name] === undefined ? match : String(params[name]));
}

function mvConversationService() {
    try {
        const direct = PTX.conversation;
        if (direct !== undefined && direct !== null) return direct;
    } catch (error) {}
    try {
        const get = PTX.get;
        return typeof get === 'function' ? get.call(PTX, 'conversation') : undefined;
    } catch (error) {
        return undefined;
    }
}
function mvFocusComposer(sessionId) {
    if (sessionId === null || sessionId === undefined) return false;
    try {
        const scoped = PTX.sessions.scope(sessionId);
        if (scoped === undefined || scoped === null) return false;
        const conversation = mvConversationService();
        const resolver = conversation === undefined ? undefined : conversation.input;
        if (resolver === undefined || resolver === null || typeof resolver.for !== 'function') return false;
        const facade = resolver.for(scoped);
        if (facade === undefined || facade === null || typeof facade.focus !== 'function') return false;
        facade.focus();
        return true;
    } catch (error) {
        return false;
    }
}
function mvConversationLive() {
    try {
        const slots = PTX.slots;
        if (slots === undefined || slots === null) return false;
        if (typeof slots.spec === 'function' && slots.spec('conversation.session') !== undefined) return true;
        if (typeof slots.specDynamic === 'function' && slots.specDynamic('conversation.session') !== undefined) return true;
        return typeof slots.entries === 'function' && slots.entries('conversation.session').length > 0;
    } catch (error) {
        return false;
    }
}
function mvRow(sessionId) {
    if (sessionId === null || sessionId === undefined) return undefined;
    try {
        return PTX.sessions.list.getSnapshot().byId[sessionId];
    } catch (error) {
        return undefined;
    }
}
function mvTitle(sessionId) {
    const row = mvRow(sessionId);
    return row === undefined ? undefined : row.title;
}
function mvIsArchived(sessionId) {
    try {
        const archived = PTX.workspaces.list.getSnapshot().archivedSessionIds;
        return archived.includes(sessionId);
    } catch (error) {
        return false;
    }
}
function mvSeed(limit) {
    const picked = [];
    try {
        const list = PTX.sessions.list.getSnapshot();
        const current = list.ids.find((id)=>(list.byId[id]?.retainedBy?.mainView ?? 0) > 0);
        const ordered = current === undefined ? list.ids.slice() : [
            current,
            ...list.ids
        ];
        for (const id of ordered){
            if (picked.length >= limit) break;
            if (picked.includes(id)) continue;
            const row = list.byId[id];
            if (row === undefined || row.blank === true) continue;
            if (mvIsArchived(id)) continue;
            picked.push(id);
        }
    } catch (error) {}
    return picked;
}
function mvTopUp(current, limit) {
    const next = current.slice(0, limit);
    while(next.length < limit)next.push(null);
    let changed = next.length !== current.length;
    const used = new Set(next.filter((id)=>id !== null && id !== undefined));
    try {
        const list = PTX.sessions.list.getSnapshot();
        const current = list.ids.find((id)=>(list.byId[id]?.retainedBy?.mainView ?? 0) > 0);
        const ordered = current === undefined ? list.ids.slice() : [
            current,
            ...list.ids
        ];
        for(let index = 0; index < next.length; index += 1){
            if (next[index] !== null && next[index] !== undefined) continue;
            const candidate = ordered.find((id)=>{
                if (used.has(id)) return false;
                const row = list.byId[id];
                return row !== undefined && row.blank !== true && !mvIsArchived(id);
            });
            if (candidate === undefined) continue;
            next[index] = candidate;
            used.add(candidate);
            changed = true;
        }
    } catch (error) {}
    return changed ? next : current;
}

const MV_CSS = `
.mv-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.mv-bar{display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;flex:none;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.mv-bar-title{font-size:13px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mv-bar-spacer{flex:1;min-width:0}
.mv-body{display:flex;flex:1;min-height:0;min-width:0}
.mv-body[data-dir="row"]{flex-direction:row}
.mv-body[data-dir="col"]{flex-direction:column}
.mv-pane{display:flex;flex-direction:column;flex:1 1 0;min-width:0;min-height:0;position:relative}
.mv-pane + .mv-pane{border-left:.5px solid var(--dsw-alias-border-l3)}
.mv-body[data-dir="col"] > .mv-pane + .mv-pane{border-left:none;border-top:.5px solid var(--dsw-alias-border-l3)}
.mv-head{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;flex:none;color:var(--dsw-alias-label-tertiary)}
.mv-pane[data-focused="true"] .mv-head{color:var(--dsw-alias-label-primary)}
.mv-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.mv-dot[data-state="running"]{background:var(--dsw-alias-state-business-primary)}
.mv-dot[data-state="waiting"]{background:var(--dsw-alias-state-warn-primary)}
.mv-dot[data-state="unread"]{background:var(--dsw-alias-state-success-primary)}
.mv-head-title{flex:1;min-width:0;font-size:13px;line-height:16px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mv-head-actions{display:flex;align-items:center;gap:2px;flex:none;opacity:0;transition:none}
.mv-pane:hover .mv-head-actions,.mv-pane[data-focused="true"] .mv-head-actions,.mv-head-actions:focus-within{opacity:1}
.mv-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
.mv-icon:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-icon:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.mv-body-slot{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.mv-note{display:flex;align-items:center;justify-content:center;height:100%;padding:24px;font-size:13px;line-height:20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.mv-note[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
@media (prefers-reduced-motion: reduce){.mv-pane,.mv-body{transition:none !important}}
`;
function MvGlyph(props) {
    const { path } = props;
    return h('svg', {
        viewBox: '0 0 16 16',
        width: 16,
        height: 16,
        'aria-hidden': true,
        fill: 'none'
    }, h('path', {
        d: path,
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
    }));
}
function MvIconButton(props) {
    const { label, path, onClick } = props;
    return h('button', {
        type: 'button',
        className: 'mv-icon',
        title: label,
        'aria-label': label,
        onClick
    }, h(MvGlyph, {
        path
    }));
}
function MvNote(props) {
    const { error, children } = props;
    return h('div', {
        className: 'mv-note',
        'data-error': error === true ? 'true' : 'false'
    }, children);
}

function mvPhase(session, conversation, summaryBlank) {
    const targeted = conversation.activeTargets !== undefined && conversation.activeTargets.size > 0;
    const shellPhase = targeted || !session.blank && !session.awaitingFirstTurn || session.running === true ? 'active' : session.promptAttempted === true ? 'engaging' : 'blank';
    const subagent = session.subagent;
    const parentPending = subagent !== null && subagent !== undefined && subagent.address !== undefined && subagent.address.mode === 'continuable' && subagent.parentAvailable === undefined;
    const settling = shellPhase === 'blank' && session.openState === 'loading' && summaryBlank !== true || parentPending;
    const hero = shellPhase === 'blank' && (session.openState === 'open' || summaryBlank === true);
    return settling ? 'settling' : hero ? 'hero' : 'active';
}
function FixedChatView(props) {
    return h(React.Fragment, null, props.renderSlot('conversation.session', {
        view: 'chat'
    }));
}
function PaneConversation(props) {
    const { sessionId, useSession, useConversation, useSessions, renderFactorySlot } = props;
    const session = useSession((value)=>value);
    const conversation = useConversation((value)=>value);
    const summaryBlank = useSessions((state)=>sessionId === undefined ? undefined : state.byId[sessionId] === undefined ? undefined : state.byId[sessionId].blank);
    if (session === undefined || conversation === undefined) {
        return h(MvNote, null, T('loading'));
    }
    const phase = mvPhase(session, conversation, summaryBlank);
    const hero = phase === 'hero';
    return renderFactorySlot('conversation.content', {
        variant: 'embedded',
        phase,
        hero
    }, {
        slots: {
            views: FixedChatView
        },
        fallback: h(MvNote, {
            error: true
        }, T('noContent'))
    });
}
class MvPaneBoundary extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            failed: false,
            message: ''
        };
    }
    static getDerivedStateFromError(error) {
        return {
            failed: true,
            message: error instanceof Error ? error.message : String(error)
        };
    }
    componentDidCatch(error, info) {
        console.error('dsh-multiview: pane crashed', error, info === undefined ? '' : info.componentStack);
    }
    render() {
        if (this.state.failed) {
            return h(MvNote, {
                error: true
            }, mvFormat(T('paneCrashed'), {
                message: this.state.message
            }));
        }
        return this.props.children;
    }
}
function PaneHost(props) {
    const { sessionId, SessionProvider, renderSlot } = props;
    const [state, setState] = React.useState({
        reference: null,
        error: null
    });
    React.useEffect(()=>{
        if (sessionId === null || sessionId === undefined) {
            setState({
                reference: null,
                error: null
            });
            return undefined;
        }
        let reference = null;
        try {
            reference = PTX.sessions.retain(sessionId, {
                source: 'multiview'
            });
        } catch (error) {
            setState({
                reference: null,
                error: error instanceof Error ? error.message : String(error)
            });
            return undefined;
        }
        let cancelled = false;
        setState({
            reference,
            error: null
        });
        reference.ready.then(()=>{
            if (!cancelled) setState({
                reference,
                error: null
            });
        }, (error)=>{
            if (!cancelled) setState({
                reference: null,
                error: error instanceof Error ? error.message : String(error)
            });
        });
        return ()=>{
            cancelled = true;
            try {
                reference.release();
            } catch (error) {
                console.error('dsh-multiview: releasing a Session reference failed', error);
            }
        };
    }, [
        sessionId
    ]);
    if (sessionId === null || sessionId === undefined) {
        return h(MvNote, null, T('empty'));
    }
    if (state.error !== null) {
        return h(MvNote, {
            error: true
        }, mvFormat(T('openFailed'), {
            message: state.error
        }));
    }
    if (state.reference === null) {
        return h(MvNote, null, T('loading'));
    }
    return h(SessionProvider, {
        session: state.reference
    }, h(MvPaneBoundary, null, renderSlot(MV_PANE_SLOT, {})));
}

function MultiviewPanelIcon() {
    return h('svg', {
        viewBox: '0 0 20 20',
        width: 20,
        height: 20,
        'aria-hidden': true,
        fill: 'none'
    }, h('rect', {
        x: 2.5,
        y: 3.5,
        width: 15,
        height: 13,
        rx: 3,
        stroke: 'currentColor',
        strokeWidth: 1.4
    }), h('path', {
        d: 'M10 3.5v13',
        stroke: 'currentColor',
        strokeWidth: 1.2
    }));
}
function mvDotState(status) {
    if (status === undefined || status === null) return 'idle';
    if (status.pendingInteraction !== undefined) return 'waiting';
    if (status.running === true) return 'running';
    if (status.completionUnread === true) return 'unread';
    return 'idle';
}
function mvDotLabel(state) {
    if (state === 'running') return T('running');
    if (state === 'waiting') return T('waiting');
    if (state === 'unread') return T('unread');
    return '';
}
function PaneFrame(props) {
    const { index, sessionId, focused, SessionProvider, renderSlot, status, onFocus } = props;
    const title = mvTitle(sessionId);
    const dot = mvDotState(status);
    return h('div', {
        className: 'mv-pane',
        'data-pane-id': 'pane-' + String(index + 1),
        'data-focused': focused === true ? 'true' : 'false',
        onPointerDownCapture: ()=>onFocus(index),
        onFocusCapture: ()=>onFocus(index)
    }, h('div', {
        className: 'mv-head',
        'data-pane-head': ''
    }, h('span', {
        className: 'mv-dot',
        'data-state': dot,
        title: mvDotLabel(dot),
        'aria-hidden': dot === 'idle'
    }), h('span', {
        className: 'mv-head-title'
    }, title === undefined ? T('empty') : title)), h('div', {
        className: 'mv-body-slot'
    }, h(PaneHost, {
        sessionId,
        SessionProvider,
        renderSlot
    })));
}
class MvStageBoundary extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            failed: false,
            message: ''
        };
    }
    static getDerivedStateFromError(error) {
        return {
            failed: true,
            message: error instanceof Error ? error.message : String(error)
        };
    }
    componentDidCatch(error, info) {
        console.error('dsh-multiview: stage crashed', error, info === undefined ? '' : info.componentStack);
    }
    render() {
        if (this.state.failed) {
            return h('div', {
                className: 'mv-root'
            }, h(MvNote, {
                error: true
            }, mvFormat(T('stageCrashed'), {
                message: this.state.message
            })));
        }
        return this.props.children;
    }
}
function MultiviewStage(props) {
    const { renderSlot, SessionProvider, useSessions, useSessionStatus } = props;
    const list = useSessions((state)=>state);
    const statuses = useSessionStatus((state)=>state);
    const [focused, setFocused] = React.useState(0);
    const [panes, setPanes] = React.useState(()=>[
            null,
            null
        ]);
    React.useEffect(()=>{
        if (list.phase !== 'ready') return;
        setPanes((current)=>mvTopUp(current, 2));
    }, [
        list
    ]);
    const body = h('div', {
        className: 'mv-body',
        'data-dir': 'row',
        'data-mv-body': ''
    }, panes.map((sessionId, index)=>h(PaneFrame, {
            key: 'pane-' + String(index + 1),
            index,
            sessionId,
            focused: index === focused,
            SessionProvider,
            renderSlot,
            status: sessionId === null ? undefined : statuses.get(sessionId),
            onFocus: setFocused
        })));
    return h('div', {
        className: 'mv-root',
        'data-multiview': ''
    }, h('header', {
        className: 'mv-bar',
        'data-window-drag': true
    }, h('span', {
        className: 'mv-bar-title'
    }, T('title')), h('span', {
        className: 'mv-bar-spacer'
    })), h(MvStageBoundary, null, body));
}

const MV_INJECT = [
    'slots',
    'sessions',
    'workspaces',
    'locale'
];
function apply(ctx) {
    PTX = ctx;
    T = ctx.locale.bind(NS);
    ctx.effect(()=>ctx.locale.register(NS, {
            zh: MV_ZH,
            en: MV_EN
        }), 'dsh-multiview: dictionaries');
    ctx.effect(()=>{
        const tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-multiview';
        tag.dataset.pluginCss = 'dsh-multiview/styles';
        tag.textContent = MV_CSS;
        document.head.appendChild(tag);
        return ()=>{
            tag.remove();
        };
    }, 'dsh-multiview: styles');
    ctx.slots.inject('main', ()=>ctx.slots.register({
            name: 'main',
            key: MV_PANEL_ID,
            locale: NS,
            children: {
                [MV_PANE_SLOT]: {
                    kind: 'single',
                    scope: 'session'
                }
            }
        }, MultiviewStage));
    ctx.slots.inject('sidebar.panellist', ()=>ctx.slots.register({
            name: 'sidebar.panellist',
            id: MV_PANEL_ID,
            order: 30,
            label: ()=>T('panel'),
            locale: NS
        }, MultiviewPanelIcon));
    ctx.slots.inject(MV_PANE_SLOT, ()=>ctx.slots.register({
            name: MV_PANE_SLOT,
            locale: NS
        }, PaneConversation));
    const host = typeof window === 'undefined' ? '' : window.location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
        window.__mvDebug = {
            version: '0.1.0',
            list: ()=>PTX.sessions.list.getSnapshot(),
            seed: (limit)=>mvSeed(limit),
            topUp: (panes, limit)=>mvTopUp(panes, limit),
            live: ()=>mvConversationLive(),
            focus: (sessionId)=>mvFocusComposer(sessionId)
        };
    }
}

    return { inject: MV_INJECT, apply }
  },
})
