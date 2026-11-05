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
    pickSearch: '搜索会话',
    pickEmpty: '没有匹配的会话',
    loading: '正在打开会话…',
    openFailed: '打开会话失败：{message}',
    noContent: '当前 DSH 版本不支持在格内嵌入会话',
    paneCrashed: '这一格出错了：{message}',
    stageCrashed: '分屏面板出错了：{message}',
    maximize: '最大化',
    restore: '还原',
    remove: '从分屏移除',
    openMain: '在原生视图打开',
    shape: '格数',
    shapeN: '{n} 格',
    running: '运行中',
    waiting: '等待你处理',
    unread: '有新结果',
    shortcutFocusPrev: '聚焦上一格',
    shortcutFocusNext: '聚焦下一格',
    shortcutMaximize: '最大化或还原当前格',
    shortcutRemove: '从分屏移除当前格'
};
const MV_EN = {
    panel: 'Split',
    title: 'Split',
    empty: 'Pick a session',
    pick: 'Pick a session',
    pickSearch: 'Search sessions',
    pickEmpty: 'No matching session',
    loading: 'Opening session…',
    openFailed: 'Could not open this session: {message}',
    noContent: 'This DSH version cannot host a conversation in a pane',
    paneCrashed: 'This pane failed: {message}',
    stageCrashed: 'The split view failed: {message}',
    maximize: 'Maximize',
    restore: 'Restore',
    remove: 'Remove from split',
    openMain: 'Open in native view',
    shape: 'Pane count',
    shapeN: '{n} panes',
    running: 'Running',
    waiting: 'Waiting for you',
    unread: 'New result',
    shortcutFocusPrev: 'Focus previous pane',
    shortcutFocusNext: 'Focus next pane',
    shortcutMaximize: 'Maximize or restore the current pane',
    shortcutRemove: 'Remove the current pane from the split'
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

const MV_MAX_PANES = 4;
const MV_MIN_RATIO = 0.22;
const MV_MAX_RATIO = 0.78;
function mvClampRatio(value) {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(MV_MAX_RATIO, Math.max(MV_MIN_RATIO, value));
}
function mvLeaf(id) {
    return {
        kind: 'leaf',
        id,
        sessionId: null
    };
}
function mvSplit(id, dir, ratio, a, b) {
    return {
        kind: 'split',
        id,
        dir,
        ratio: mvClampRatio(ratio),
        a,
        b
    };
}
function mvPreset(count) {
    if (count <= 2) return mvSplit('s1', 'row', 0.5, mvLeaf('p1'), mvLeaf('p2'));
    if (count === 3) {
        return mvSplit('s1', 'row', 0.55, mvLeaf('p1'), mvSplit('s2', 'col', 0.5, mvLeaf('p2'), mvLeaf('p3')));
    }
    return mvSplit('s1', 'row', 0.5, mvSplit('s2', 'col', 0.5, mvLeaf('p1'), mvLeaf('p2')), mvSplit('s3', 'col', 0.5, mvLeaf('p3'), mvLeaf('p4')));
}
function mvLeaves(node, out) {
    const list = out === undefined ? [] : out;
    if (node === undefined || node === null) return list;
    if (node.kind === 'leaf') {
        list.push(node);
        return list;
    }
    mvLeaves(node.a, list);
    mvLeaves(node.b, list);
    return list;
}
function mvLeafCount(node) {
    return mvLeaves(node).length;
}
function mvShapeTo(node, count) {
    const target = Math.max(2, Math.min(MV_MAX_PANES, count));
    const current = mvLeaves(node);
    if (current.length === target) return node;
    const sessions = current.map((leaf)=>leaf.sessionId);
    const next = mvPreset(target);
    const leaves = mvLeaves(next);
    for(let index = 0; index < leaves.length; index += 1)leaves[index].sessionId = sessions[index] ?? null;
    return next;
}
function mvMapLeaves(node, edit) {
    if (node.kind === 'leaf') return edit(node);
    const a = mvMapLeaves(node.a, edit);
    const b = mvMapLeaves(node.b, edit);
    if (a === node.a && b === node.b) return node;
    return {
        ...node,
        a,
        b
    };
}
function mvWithSession(node, leafId, sessionId) {
    return mvMapLeaves(node, (leaf)=>{
        if (leaf.id !== leafId && sessionId !== null && leaf.sessionId === sessionId) return {
            ...leaf,
            sessionId: null
        };
        if (leaf.id !== leafId) return leaf;
        if (leaf.sessionId === sessionId) return leaf;
        return {
            ...leaf,
            sessionId
        };
    });
}
function mvSwapSessions(node, aId, bId) {
    if (aId === bId) return node;
    const leaves = mvLeaves(node);
    const a = leaves.find((leaf)=>leaf.id === aId);
    const b = leaves.find((leaf)=>leaf.id === bId);
    if (a === undefined || b === undefined) return node;
    const aSession = a.sessionId;
    const bSession = b.sessionId;
    if (aSession === bSession) return node;
    return mvMapLeaves(node, (leaf)=>{
        if (leaf.id === aId) return {
            ...leaf,
            sessionId: bSession
        };
        if (leaf.id === bId) return {
            ...leaf,
            sessionId: aSession
        };
        return leaf;
    });
}
function mvResize(node, splitId, ratio) {
    if (node === null || node === undefined) return node;
    if (node.kind === 'leaf') return node;
    if (node.id === splitId) {
        const clamped = mvClampRatio(ratio);
        return clamped === node.ratio ? node : {
            ...node,
            ratio: clamped
        };
    }
    const a = mvResize(node.a, splitId, ratio);
    const b = mvResize(node.b, splitId, ratio);
    if (a === node.a && b === node.b) return node;
    return {
        ...node,
        a,
        b
    };
}
function mvRemoveLeaf(node, leafId) {
    if (node === null || node === undefined) return null;
    if (node.kind === 'leaf') return node.id === leafId ? null : node;
    const a = mvRemoveLeaf(node.a, leafId);
    const b = mvRemoveLeaf(node.b, leafId);
    if (a === null) return b;
    if (b === null) return a;
    if (a === node.a && b === node.b) return node;
    return {
        ...node,
        a,
        b
    };
}
function mvLeafById(node, leafId) {
    return mvLeaves(node).find((leaf)=>leaf.id === leafId);
}
function mvNeighbour(node, leafId, delta) {
    const leaves = mvLeaves(node);
    const index = leaves.findIndex((leaf)=>leaf.id === leafId);
    if (index < 0 || leaves.length < 2) return leafId;
    const next = (index + delta + leaves.length) % leaves.length;
    return leaves[next].id;
}
function mvIsLeaf(value) {
    return value !== null && typeof value === 'object' && value.kind === 'leaf' && typeof value.id === 'string' && (value.sessionId === null || typeof value.sessionId === 'string');
}
function mvIsSplit(value) {
    if (value === null || typeof value !== 'object' || value.kind !== 'split') return false;
    if (typeof value.id !== 'string') return false;
    if (value.dir !== 'row' && value.dir !== 'col') return false;
    if (typeof value.ratio !== 'number' || !Number.isFinite(value.ratio)) return false;
    return value.a !== null && value.b !== null && typeof value.a === 'object' && typeof value.b === 'object';
}
function mvNormalizeIds(node, seen) {
    if (node === null || node === undefined) return node;
    if (node.kind === 'leaf') {
        if (seen.has(node.id)) return {
            ...node,
            id: 'p' + String(seen.size + 1)
        };
        seen.add(node.id);
        return node;
    }
    const a = mvNormalizeIds(node.a, seen);
    const b = mvNormalizeIds(node.b, seen);
    const id = seen.has(node.id) ? 's' + String(seen.size + 1) : node.id;
    seen.add(id);
    if (a === node.a && b === node.b && id === node.id) return node;
    return {
        ...node,
        id,
        a,
        b
    };
}
function mvSanitize(raw) {
    const walk = (value, depth)=>{
        if (depth > 8) return null;
        if (mvIsLeaf(value)) return {
            kind: 'leaf',
            id: value.id,
            sessionId: value.sessionId
        };
        if (!mvIsSplit(value)) return null;
        const a = walk(value.a, depth + 1);
        const b = walk(value.b, depth + 1);
        if (a === null || b === null) return null;
        const leaves = mvLeaves(a).length + mvLeaves(b).length;
        if (leaves > MV_MAX_PANES) return a;
        return {
            kind: 'split',
            id: value.id,
            dir: value.dir,
            ratio: mvClampRatio(value.ratio),
            a,
            b
        };
    };
    const tree = walk(raw, 0);
    if (tree === null) return null;
    if (tree.kind === 'leaf') return tree;
    return mvNormalizeIds(tree, new Set());
}
function mvReconcileTree(node, reconcile) {
    return mvMapLeaves(node, (leaf)=>{
        if (leaf.sessionId === null) return leaf;
        const kept = reconcile(leaf.sessionId);
        if (kept === leaf.sessionId) return leaf;
        return {
            ...leaf,
            sessionId: kept
        };
    });
}

function mvInitialState() {
    return {
        layout: mvPreset(2),
        focused: 'p1',
        maximized: null,
        preset: 2,
        seeded: false,
        reconciled: false
    };
}
let mvState = mvInitialState();
const mvListeners = new Set();
let mvSaveTimer = 0;
function mvGetState() {
    return mvState;
}
function mvSubscribe(listener) {
    mvListeners.add(listener);
    return ()=>{
        mvListeners.delete(listener);
    };
}
function mvScheduleSave() {
    if (mvSaveTimer !== 0) clearTimeout(mvSaveTimer);
    mvSaveTimer = setTimeout(()=>{
        mvSaveTimer = 0;
        try {
            const durable = {
                version: 1,
                layout: mvState.layout,
                focused: mvState.focused,
                preset: mvState.preset,
                seeded: mvState.seeded
            };
            window.localStorage.setItem(MV_STORAGE_KEY, JSON.stringify(durable));
        } catch (error) {}
    }, 200);
}
function mvCommit(produce) {
    const next = produce(mvState);
    if (next === mvState || next === null || next === undefined) return;
    mvState = next;
    mvScheduleSave();
    for (const listener of mvListeners){
        try {
            listener();
        } catch (error) {
            console.error('dsh-multiview: state listener failed', error);
        }
    }
}
function mvHydrate() {
    let raw = null;
    try {
        raw = JSON.parse(window.localStorage.getItem(MV_STORAGE_KEY) ?? 'null');
    } catch (error) {
        raw = null;
    }
    if (raw === null || typeof raw !== 'object' || raw.version !== 1) return;
    const layout = mvSanitize(raw.layout);
    if (layout === null) return;
    const leaves = mvLeaves(layout);
    const focused = leaves.some((leaf)=>leaf.id === raw.focused) ? raw.focused : leaves[0].id;
    mvState = {
        layout,
        focused,
        maximized: null,
        preset: typeof raw.preset === 'number' ? raw.preset : leaves.length,
        seeded: raw.seeded === true,
        reconciled: false
    };
}
function mvReset() {
    mvCommit(()=>mvInitialState());
    try {
        window.localStorage.removeItem(MV_STORAGE_KEY);
    } catch (error) {}
}
function mvReconcile() {
    if (mvState.reconciled) return;
    let ready = false;
    try {
        const list = PTX.sessions.list.getSnapshot();
        ready = list.phase === 'ready';
        if (!ready) return;
        const kept = mvReconcileTree(mvState.layout, (sessionId)=>{
            const row = list.byId[sessionId];
            if (row === undefined || row.blank === true) return null;
            if (mvIsArchived(sessionId)) return null;
            return sessionId;
        });
        const leaves = mvLeaves(kept);
        const focused = leaves.some((leaf)=>leaf.id === mvState.focused) ? mvState.focused : leaves[0].id;
        mvCommit((current)=>({
                ...current,
                layout: kept,
                focused,
                reconciled: true
            }));
    } catch (error) {
        mvCommit((current)=>({
                ...current,
                reconciled: true
            }));
    }
}
function mvAutoFill() {
    if (mvState.seeded) return;
    try {
        const list = PTX.sessions.list.getSnapshot();
        if (list.phase !== 'ready') return;
        const used = new Set(mvLeaves(mvState.layout).map((leaf)=>leaf.sessionId).filter((id)=>id !== null));
        const ordered = (()=>{
            const current = list.ids.find((id)=>(list.byId[id]?.retainedBy?.mainView ?? 0) > 0);
            return current === undefined ? list.ids.slice() : [
                current,
                ...list.ids
            ];
        })();
        const next = mvMapLeaves(mvState.layout, (leaf)=>{
            if (leaf.sessionId !== null) return leaf;
            const candidate = ordered.find((id)=>{
                if (used.has(id)) return false;
                const row = list.byId[id];
                return row !== undefined && row.blank !== true && !mvIsArchived(id);
            });
            if (candidate === undefined) return leaf;
            used.add(candidate);
            return {
                ...leaf,
                sessionId: candidate
            };
        });
        const filled = mvLeaves(next).some((leaf)=>leaf.sessionId !== null);
        if (!filled) return;
        mvCommit((current)=>({
                ...current,
                layout: next,
                seeded: true
            }));
    } catch (error) {}
}
function mvSetShape(count) {
    mvCommit((current)=>{
        const layout = mvShapeTo(current.layout, count);
        if (layout === current.layout) return current;
        const leaves = mvLeaves(layout);
        const focused = leaves.some((leaf)=>leaf.id === current.focused) ? current.focused : leaves[0].id;
        return {
            ...current,
            layout,
            focused,
            preset: count,
            maximized: null,
            seeded: true
        };
    });
}
function mvBind(leafId, sessionId) {
    mvCommit((current)=>{
        const layout = mvWithSession(current.layout, leafId, sessionId);
        if (layout === current.layout) return current;
        const focused = sessionId === null ? current.focused : leafId;
        return {
            ...current,
            layout,
            focused,
            maximized: current.maximized === leafId ? null : current.maximized
        };
    });
}
function mvFocus(leafId) {
    mvCommit((current)=>current.focused === leafId ? current : {
            ...current,
            focused: leafId
        });
}
function mvToggleMaximize(leafId) {
    mvCommit((current)=>current.maximized === leafId ? {
            ...current,
            maximized: null
        } : {
            ...current,
            maximized: leafId,
            focused: leafId
        });
}
function mvRestore() {
    mvCommit((current)=>current.maximized === null ? current : {
            ...current,
            maximized: null
        });
}
function mvResizeSplit(splitId, ratio) {
    mvCommit((current)=>{
        const layout = mvResize(current.layout, splitId, ratio);
        return layout === current.layout ? current : {
            ...current,
            layout
        };
    });
}
function mvSwapLeaves(aId, bId) {
    mvCommit((current)=>{
        const layout = mvSwapSessions(current.layout, aId, bId);
        return layout === current.layout ? current : {
            ...current,
            layout,
            maximized: null
        };
    });
}
function mvRemovePane(leafId) {
    mvCommit((current)=>{
        const leaves = mvLeaves(current.layout);
        if (leaves.length <= 1) {
            const cleared = mvWithSession(current.layout, leafId, null);
            return cleared === current.layout ? current : {
                ...current,
                layout: cleared
            };
        }
        const layout = mvRemoveLeaf(current.layout, leafId);
        if (layout === null) return current;
        const nextLeaves = mvLeaves(layout);
        const focused = nextLeaves.some((leaf)=>leaf.id === current.focused) ? current.focused : nextLeaves[0].id;
        return {
            ...current,
            layout,
            focused,
            maximized: current.maximized === leafId ? null : current.maximized
        };
    });
}

const MV_CSS = `
.mv-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.mv-bar{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px 0 12px;flex:none;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.mv-bar-title{font-size:13px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap;margin-right:2px}
.mv-bar-spacer{flex:1;min-width:0}
.mv-seg{display:flex;align-items:center;gap:2px;flex:none}
.mv-chip{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;min-width:24px;padding:0 6px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;cursor:pointer;white-space:nowrap}
.mv-chip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-chip[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-chip:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.mv-body{display:flex;flex:1;min-height:0;min-width:0}
.mv-split{display:flex;flex:1 1 0;min-width:0;min-height:0}
.mv-split[data-dir="row"]{flex-direction:row}
.mv-split[data-dir="col"]{flex-direction:column}
.mv-slot{display:flex;min-width:0;min-height:0;flex-basis:0}
.mv-slot[data-dir="row"]{flex-direction:column}
.mv-divider{position:relative;flex:0 0 1px;background:var(--dsw-alias-border-l3);z-index:2}
.mv-divider[data-dir="row"]{cursor:col-resize}
.mv-divider[data-dir="col"]{cursor:row-resize}
.mv-divider::after{content:"";position:absolute;background:transparent}
.mv-divider[data-dir="row"]::after{top:0;bottom:0;left:-4px;right:-4px}
.mv-divider[data-dir="col"]::after{left:0;right:0;top:-4px;bottom:-4px}
.mv-divider:hover::before,.mv-divider[data-dragging="true"]::before{content:"";position:absolute;background:var(--dsw-alias-state-business-primary);opacity:.55;border-radius:2px}
.mv-divider[data-dir="row"]:hover::before,.mv-divider[data-dir="row"][data-dragging="true"]::before{top:0;bottom:0;left:-1px;width:2px}
.mv-divider[data-dir="col"]:hover::before,.mv-divider[data-dir="col"][data-dragging="true"]::before{left:0;right:0;top:-1px;height:2px}
.mv-divider[data-dragging="true"]{z-index:6}
.mv-pane{display:flex;flex-direction:column;flex:1 1 0;min-width:0;min-height:0;position:relative;background:var(--dsw-alias-bg-base)}
.mv-head{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px 0 12px;flex:none;color:var(--dsw-alias-label-tertiary);border-bottom:.5px solid transparent}
.mv-pane[data-focused="true"] .mv-head{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-border-l3)}
.mv-pane[data-drop="true"]::after{content:"";position:absolute;inset:0;border:1px solid var(--dsw-alias-state-business-primary);border-radius:8px;pointer-events:none;z-index:5}
.mv-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.mv-dot[data-state="running"]{background:var(--dsw-alias-state-business-primary)}
.mv-dot[data-state="waiting"]{background:var(--dsw-alias-state-warn-primary)}
.mv-dot[data-state="unread"]{background:var(--dsw-alias-state-success-primary)}
.mv-head-title{flex:1;min-width:0;font-size:13px;line-height:16px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:grab}
.mv-head-title:active{cursor:grabbing}
.mv-head-actions{display:flex;align-items:center;gap:2px;flex:none;opacity:0}
.mv-pane:hover .mv-head-actions,.mv-pane[data-focused="true"] .mv-head-actions,.mv-head-actions:focus-within{opacity:1}
.mv-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
.mv-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-icon:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.mv-pane-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.mv-note{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:24px;font-size:13px;line-height:20px;text-align:center;color:var(--dsw-alias-label-tertiary)}
.mv-note[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
.mv-note-action{height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer}
.mv-note-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-picker{display:flex;flex-direction:column;flex:1;min-height:0;padding:12px}
.mv-picker-search{height:30px;flex:none;margin:0 0 8px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;outline:none}
.mv-picker-search:focus{border-color:var(--dsw-alias-state-business-primary)}
.mv-picker-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.mv-picker-item{display:flex;flex-direction:column;gap:2px;align-items:flex-start;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;font-size:13px;line-height:18px}
.mv-picker-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-picker-empty{padding:12px 8px;font-size:13px;color:var(--dsw-alias-label-tertiary)}
@media (prefers-reduced-motion: reduce){*{transition:none !important;animation:none !important}}
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
const MV_ICON = {
    maximize: 'M3 6V3h3M13 10v3h-3M3 10v3h3M13 6V3h-3',
    restore: 'M6 6H3v3M10 10h3V7M10 6V3h3M6 10H3V7',
    close: 'M4 4l8 8M12 4l-8 8',
    external: 'M6 10L13 3M9 3h4v4'
};

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

function useMvState() {
    return React.useSyncExternalStore(mvSubscribe, mvGetState, mvGetState);
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
function mvPickableRows(query) {
    const need = query.trim().toLowerCase();
    try {
        const list = PTX.sessions.list.getSnapshot();
        const rows = [];
        for (const id of list.ids){
            const row = list.byId[id];
            if (row === undefined || row.blank === true) continue;
            if (mvIsArchived(id)) continue;
            const title = row.title === undefined || row.title === '' ? id : row.title;
            if (need !== '' && !title.toLowerCase().includes(need) && !id.toLowerCase().includes(need)) continue;
            rows.push({
                id,
                title
            });
            if (rows.length >= 120) break;
        }
        return rows;
    } catch (error) {
        return [];
    }
}
function MvPanePicker(props) {
    const { onPick } = props;
    const [query, setQuery] = React.useState('');
    const rows = mvPickableRows(query);
    return h('div', {
        className: 'mv-picker',
        'data-mv-picker': ''
    }, h('input', {
        className: 'mv-picker-search',
        type: 'search',
        value: query,
        placeholder: T('pickSearch'),
        'aria-label': T('pickSearch'),
        autoFocus: true,
        onChange: (event)=>setQuery(event.target.value),
        onKeyDown: (event)=>{
            if (event.key === 'Enter' && rows.length > 0) onPick(rows[0].id);
            if (event.key === 'Escape') event.currentTarget.blur();
        }
    }), h('div', {
        className: 'mv-picker-list'
    }, rows.length === 0 ? h('div', {
        className: 'mv-picker-empty'
    }, T('pickEmpty')) : rows.map((row)=>h('button', {
            key: row.id,
            type: 'button',
            className: 'mv-picker-item',
            title: row.title,
            onClick: ()=>onPick(row.id)
        }, row.title))));
}
function MvDivider(props) {
    const { node, onResize } = props;
    const [dragging, setDragging] = React.useState(false);
    const ref = React.useRef(null);
    const lastRatio = React.useRef(node.ratio);
    const ratioAt = (dir, event)=>{
        const element = ref.current;
        if (element === null) return lastRatio.current;
        const parent = element.parentElement;
        if (parent === null) return lastRatio.current;
        const rect = parent.getBoundingClientRect();
        const size = dir === 'row' ? rect.width : rect.height;
        if (size === 0) return lastRatio.current;
        const offset = dir === 'row' ? event.clientX - rect.left : event.clientY - rect.top;
        return offset / size;
    };
    const beginDrag = (event)=>{
        if (event.button !== 0) return;
        event.preventDefault();
        setDragging(true);
        const dir = node.dir;
        const splitId = node.id;
        const move = (moveEvent)=>{
            const ratio = ratioAt(dir, moveEvent);
            lastRatio.current = ratio;
            onResize(splitId, ratio);
        };
        const stop = ()=>{
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
            setDragging(false);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    };
    return h('div', {
        ref,
        className: 'mv-divider',
        'data-dir': node.dir,
        'data-divider': node.id,
        'data-dragging': dragging ? 'true' : 'false',
        role: 'separator',
        'aria-orientation': node.dir === 'row' ? 'vertical' : 'horizontal',
        onPointerDown: beginDrag
    });
}
function MvSplitView(props) {
    const { node, surface } = props;
    return h('div', {
        className: 'mv-split',
        'data-dir': node.dir
    }, h('div', {
        className: 'mv-slot',
        'data-dir': node.dir,
        style: {
            flexGrow: node.ratio
        }
    }, renderMvNode(node.a, surface)), h(MvDivider, {
        node,
        onResize: surface.onResize
    }), h('div', {
        className: 'mv-slot',
        'data-dir': node.dir,
        style: {
            flexGrow: 1 - node.ratio
        }
    }, renderMvNode(node.b, surface)));
}
function PaneFrame(props) {
    const { leaf, surface } = props;
    const { state, dragging } = surface;
    const focused = state.focused === leaf.id;
    const sessionId = leaf.sessionId;
    const title = sessionId === null ? T('empty') : mvTitle(sessionId) ?? T('empty');
    const status = sessionId === null ? undefined : surface.statuses.get(sessionId);
    const dot = mvDotState(status);
    const maximized = state.maximized === leaf.id;
    return h('div', {
        className: 'mv-pane',
        'data-pane-id': leaf.id,
        'data-pane': '',
        'data-focused': focused ? 'true' : 'false',
        'data-drop': dragging.over === leaf.id && dragging.from !== null && dragging.from !== leaf.id ? 'true' : 'false',
        onPointerDownCapture: ()=>surface.onFocus(leaf.id),
        onFocusCapture: ()=>surface.onFocus(leaf.id)
    }, h('div', {
        className: 'mv-head',
        'data-pane-head': ''
    }, h('span', {
        className: 'mv-dot',
        'data-state': dot,
        title: mvDotLabel(dot),
        'aria-hidden': dot === 'idle'
    }), h('span', {
        className: 'mv-head-title',
        title: sessionId === null ? T('empty') : title,
        onPointerDown: (event)=>surface.onHeadPointerDown(leaf.id, event)
    }, title), h('div', {
        className: 'mv-head-actions'
    }, h(MvIconButton, {
        label: maximized ? T('restore') : T('maximize'),
        path: maximized ? MV_ICON.restore : MV_ICON.maximize,
        onClick: ()=>surface.onMaximize(leaf.id)
    }), sessionId === null ? null : h(MvIconButton, {
        label: T('openMain'),
        path: MV_ICON.external,
        onClick: ()=>surface.onOpenMain(sessionId)
    }), h(MvIconButton, {
        label: T('remove'),
        path: MV_ICON.close,
        onClick: ()=>surface.onRemove(leaf.id)
    }))), h('div', {
        className: 'mv-pane-body'
    }, sessionId === null ? h(MvPanePicker, {
        onPick: (id)=>surface.onBind(leaf.id, id)
    }) : h(PaneHost, {
        sessionId,
        SessionProvider: surface.SessionProvider,
        renderSlot: surface.renderSlot
    })));
}
function renderMvNode(node, surface) {
    if (node.kind === 'leaf') return h(PaneFrame, {
        key: node.id,
        leaf: node,
        surface
    });
    return h(MvSplitView, {
        key: node.id,
        node,
        surface
    });
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
    const state = useMvState();
    const rootRef = React.useRef(null);
    const [narrow, setNarrow] = React.useState(false);
    const [drag, setDrag] = React.useState({
        from: null,
        over: null
    });
    const dragRef = React.useRef({
        from: null,
        over: null,
        startX: 0,
        startY: 0,
        active: false
    });
    React.useEffect(()=>{
        mvReconcile();
        mvAutoFill();
    }, [
        list
    ]);
    React.useEffect(()=>{
        const element = rootRef.current;
        if (element === null || typeof ResizeObserver !== 'function') return undefined;
        const observer = new ResizeObserver(()=>{
            setNarrow(element.clientWidth < 900 || element.clientHeight < 520);
        });
        observer.observe(element);
        return ()=>observer.disconnect();
    }, []);
    React.useEffect(()=>{
        const move = (event)=>{
            const record = dragRef.current;
            if (!record.active) return;
            const target = document.elementFromPoint(event.clientX, event.clientY);
            const pane = target === null ? null : target.closest('[data-pane]');
            const over = pane === null ? null : pane.getAttribute('data-pane-id');
            if (over === record.over) return;
            record.over = over;
            setDrag({
                from: record.from,
                over
            });
        };
        const up = ()=>{
            const record = dragRef.current;
            const from = record.from;
            const over = record.over;
            dragRef.current = {
                from: null,
                over: null,
                startX: 0,
                startY: 0,
                active: false
            };
            document.body.style.userSelect = '';
            setDrag({
                from: null,
                over: null
            });
            if (record.active && from !== null && over !== null && from !== over) mvSwapLeaves(from, over);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return ()=>{
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
    }, []);
    const surface = {
        state,
        statuses,
        SessionProvider,
        renderSlot,
        dragging: drag,
        onFocus: mvFocus,
        onResize: mvResizeSplit,
        onMaximize: mvToggleMaximize,
        onRemove: mvRemovePane,
        onBind: mvBind,
        onOpenMain: (sessionId)=>{
            try {
                PTX.uiWorkspace.openSession(sessionId);
            } catch (error) {
                console.error('dsh-multiview: opening the native view failed', error);
            }
        },
        onHeadPointerDown: (leafId, event)=>{
            if (event.button !== 0) return;
            dragRef.current = {
                from: leafId,
                over: null,
                startX: event.clientX,
                startY: event.clientY,
                active: false
            };
            const arm = (moveEvent)=>{
                const record = dragRef.current;
                if (record.from === null) return;
                if (record.active) return;
                const distance = Math.abs(moveEvent.clientX - record.startX) + Math.abs(moveEvent.clientY - record.startY);
                if (distance < 4) return;
                record.active = true;
                document.body.style.userSelect = 'none';
                setDrag({
                    from: leafId,
                    over: null
                });
            };
            window.addEventListener('pointermove', arm);
            window.addEventListener('pointerup', ()=>window.removeEventListener('pointermove', arm), {
                once: true
            });
        }
    };
    const leaves = mvLeaves(state.layout);
    const maximizedLeaf = state.maximized === null ? null : mvLeafById(state.layout, state.maximized);
    const focusedLeaf = leaves.find((leaf)=>leaf.id === state.focused) ?? leaves[0];
    const visibleLeaf = maximizedLeaf === null ? focusedLeaf : maximizedLeaf;
    const body = h('div', {
        className: 'mv-body',
        'data-mv-body': ''
    }, renderMvNode(narrow ? visibleLeaf : maximizedLeaf === null ? state.layout : maximizedLeaf, surface));
    const chips = narrow ? leaves.map((leaf)=>{
        const title = leaf.sessionId === null ? T('empty') : mvTitle(leaf.sessionId) ?? T('empty');
        return h('button', {
            key: 'chip-' + leaf.id,
            type: 'button',
            className: 'mv-chip',
            'data-active': leaf.id === focusedLeaf.id ? 'true' : 'false',
            title,
            onClick: ()=>mvFocus(leaf.id)
        }, title.length > 14 ? title.slice(0, 14) + '…' : title);
    }) : [];
    return h('div', {
        ref: rootRef,
        className: 'mv-root',
        'data-multiview': ''
    }, h('header', {
        className: 'mv-bar',
        'data-window-drag': true
    }, h('span', {
        className: 'mv-bar-title'
    }, T('title')), h('div', {
        className: 'mv-seg',
        role: 'group',
        'aria-label': T('shape')
    }, [
        2,
        3,
        4
    ].map((count)=>h('button', {
            key: 'shape-' + String(count),
            type: 'button',
            className: 'mv-chip',
            'data-active': leaves.length === count && maximizedLeaf === null ? 'true' : 'false',
            title: mvFormat(T('shapeN'), {
                n: count
            }),
            'aria-label': mvFormat(T('shapeN'), {
                n: count
            }),
            onClick: ()=>mvSetShape(count)
        }, String(count)))), state.maximized === null ? null : h('button', {
        type: 'button',
        className: 'mv-chip',
        'data-active': 'true',
        onClick: mvRestore
    }, T('restore')), h('span', {
        className: 'mv-bar-spacer'
    }), h('div', {
        className: 'mv-strip'
    }, chips)), h(MvStageBoundary, null, body));
}

const MV_INJECT = [
    'slots',
    'sessions',
    'workspaces',
    'locale',
    'layout',
    'uiWorkspace',
    'shortcuts'
];
function mvShortcutDefaults(code) {
    const binding = {
        code,
        modifiers: [
            'primary',
            'alt'
        ]
    };
    return {
        'desktop:macos': binding,
        'desktop:windows': binding,
        'desktop:linux': binding
    };
}
function mvRegisterShortcut(ctx, spec) {
    const label = ()=>T(spec.labelKey);
    const resolve = ()=>{
        const info = PTX.layout.panelInfo.getSnapshot();
        if (info.activePanelId !== MV_PANEL_ID) return {
            status: 'pass'
        };
        return {
            status: 'handled',
            run: ()=>{
                try {
                    spec.run();
                } catch (error) {
                    console.error('dsh-multiview: shortcut failed', spec.id, error);
                }
            }
        };
    };
    const base = {
        id: spec.id,
        label,
        aliases: [
            'multiview',
            'split'
        ],
        regions: [
            'page',
            'editable'
        ],
        modals: [],
        resolve
    };
    try {
        ctx.effect(()=>ctx.shortcuts.register({
                ...base,
                defaults: mvShortcutDefaults(spec.code)
            }), 'dsh-multiview: ' + spec.id);
    } catch (error) {
        console.warn('dsh-multiview: default binding rejected, registering without one:', spec.id, error);
        ctx.effect(()=>ctx.shortcuts.register({
                ...base,
                defaults: {}
            }), 'dsh-multiview: unbound ' + spec.id);
    }
}
function mvFocusPane(leafId) {
    mvFocus(leafId);
    const leaf = mvLeafById(mvGetState().layout, leafId);
    if (leaf !== undefined && leaf.sessionId !== null) mvFocusComposer(leaf.sessionId);
}
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
    mvHydrate();
    ctx.slots.inject('main', function*() {
        yield ctx.slots.register({
            name: 'main',
            key: MV_PANEL_ID,
            locale: NS,
            children: {
                [MV_PANE_SLOT]: {
                    kind: 'single',
                    scope: 'session'
                }
            }
        }, MultiviewStage);
        yield ctx.slots.inject('sidebar.panellist', ()=>ctx.slots.register({
                name: 'sidebar.panellist',
                id: MV_PANEL_ID,
                order: 30,
                label: ()=>T('panel'),
                locale: NS
            }, MultiviewPanelIcon));
    });
    ctx.slots.inject(MV_PANE_SLOT, ()=>ctx.slots.register({
            name: MV_PANE_SLOT,
            locale: NS
        }, PaneConversation));
    mvRegisterShortcut(ctx, {
        id: 'multiview.pane.focusPrev',
        labelKey: 'shortcutFocusPrev',
        code: 'BracketLeft',
        run: ()=>mvFocusPane(mvNeighbour(mvGetState().layout, mvGetState().focused, -1))
    });
    mvRegisterShortcut(ctx, {
        id: 'multiview.pane.focusNext',
        labelKey: 'shortcutFocusNext',
        code: 'BracketRight',
        run: ()=>mvFocusPane(mvNeighbour(mvGetState().layout, mvGetState().focused, 1))
    });
    mvRegisterShortcut(ctx, {
        id: 'multiview.pane.maximize',
        labelKey: 'shortcutMaximize',
        code: 'KeyM',
        run: ()=>{
            const state = mvGetState();
            mvToggleMaximize(state.focused);
        }
    });
    mvRegisterShortcut(ctx, {
        id: 'multiview.pane.remove',
        labelKey: 'shortcutRemove',
        code: 'KeyW',
        run: ()=>{
            mvRemovePane(mvGetState().focused);
        }
    });
    const host = typeof window === 'undefined' ? '' : window.location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
        window.__mvDebug = {
            version: '0.1.0',
            list: ()=>PTX.sessions.list.getSnapshot(),
            seed: (limit)=>mvSeed(limit),
            live: ()=>mvConversationLive(),
            focusComposer: (sessionId)=>mvFocusComposer(sessionId),
            state: ()=>mvGetState(),
            shape: (count)=>mvSetShape(count),
            bind: (leafId, sessionId)=>mvBind(leafId, sessionId),
            maximize: (leafId)=>mvToggleMaximize(leafId),
            restore: ()=>mvRestore(),
            resize: (splitId, ratio)=>mvResizeSplit(splitId, ratio),
            swap: (a, b)=>mvSwapLeaves(a, b),
            remove: (leafId)=>mvRemovePane(leafId),
            reset: ()=>mvReset(),
            neighbour: (leafId, delta)=>mvNeighbour(mvGetState().layout, leafId, delta),
            mainKeys: ()=>(PTX.slots.entries('main') || []).map((entry)=>entry.options.key),
            panelInfo: ()=>PTX.layout.panelInfo.getSnapshot(),
            paneEntries: ()=>(PTX.slots.entries(MV_PANE_SLOT) || []).length,
            open: ()=>PTX.layout.selectPanel(MV_PANEL_ID),
            close: ()=>PTX.layout.selectPanel(null)
        };
    }
}

    return { inject: MV_INJECT, apply }
  },
})
