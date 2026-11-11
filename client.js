/**
 * dsh-multiview 鈥?Client half.
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
const MV_PLUGIN_VERSION = '0.1.88';
const MV_ZH = {
    panel: '分屏',
    panelAttention: '{count} 格需要你处理',
    panelAttentionOne: '有 1 格需要你处理',
    title: '分屏',
    empty: '选择一个会话',
    pick: '选择会话',
    pickSearch: '搜索会话',
    pickEmpty: '没有匹配的会话',
    pickSearching: '正在检索对话内容…',
    pickMore: '还有 {count} 个会话，输入关键词可继续筛选',
    pickOnStage: '已在分屏中',
    pickNone: '还没有会话，先在左侧新建一个',
    loading: '正在打开会话…',
    openFailed: '打开会话失败：{message}',
    noContent: '当前 DSH 版本不支持在格内嵌入会话',
    paneCrashed: '这一格出错了：{message}',
    stageCrashed: '分屏面板出错了：{message}',
    maximize: '最大化',
    restore: '还原',
    remove: '清空这一格',
    divider: '调整窗格大小（方向键可调）',
    hostUnverified: 'DSH {version} 尚未验证',
    rowActionAdd: '在分屏中打开',
    rowActionFocus: '已在分屏中，点击聚焦',
    rowActionMenu: '在分屏中打开',
    paneChange: '换一个对话',
    openMain: '在原生视图打开',
    shape: '格数',
    shapeN: '{n} 格',
    running: '运行中',
    waiting: '等待你处理',
    unread: '有新结果',
    views: '视图',
    viewsEmpty: '还没有保存的视图。绑定两个以上会话后会自动记住。',
    viewsCurrent: '当前分屏',
    viewsDelete: '删除视图',
    viewsRename: '重命名这套布局',
    viewsHint: '点击恢复这个分屏',
    updateCheck: '检查更新',
    updateChecking: '正在检查更新…',
    updateLatest: '已是最新版本（{version}）',
    updateAvailable: '发现新版本 {version}',
    updateInstall: '立即更新',
    updateInstalling: '正在更新…',
    updateDone: '更新完成，重启 DSH 后生效',
    updateRestart: '重启 DSH',
    updateFailed: '检查更新失败：{message}',
    updateUnsupported: '未检测到插件市场，无法自动更新',
    updateLocal: '当前为本地链接安装，自动更新不可用',
    updateIdle: '尚未检查更新',
    updateTitleChecking: '检查更新',
    updateTitleAvailable: '发现新版本 {version}',
    updateTitleIdle: '已是最新版本',
    updateTitleFailed: '检查更新失败',
    updateTitleUnsupported: '未检测到插件市场',
    updateTitleInstalling: '正在更新',
    updateConfirmHint: '确认后会通过插件市场下载并安装。',
    updateLater: '稍后',
    updateClose: '关闭',
    updateRetry: '重试',
    updateTimeout: '{label}响应超时（{seconds} 秒）',
    updateUnreachable: '无法连接{label}',
    updateManual: '插件市场暂不可用，请用 dsh plugin add dsh-multiview 或插件页升级。',
    updateNoVersion: '插件市场未返回版本号',
    serviceMarket: '插件市场',
    cancel: '取消',
    close: '关闭',
    shortcutFocusPrev: '聚焦上一格',
    shortcutFocusNext: '聚焦下一格',
    shortcutAttention: '跳到下一个需要你处理的格',
    shortcutMaximize: '最大化或还原当前格',
    shortcutSwapNext: '和下一格交换位置',
    shortcutRemove: '从分屏移除当前格'
};
const MV_EN = {
    panel: 'Split',
    panelAttention: '{count} panes need you',
    panelAttentionOne: '1 pane needs you',
    title: 'Split',
    empty: 'Pick a session',
    pick: 'Pick a session',
    pickSearch: 'Search sessions',
    pickEmpty: 'No matching session',
    pickSearching: 'Searching conversations…',
    pickMore: '{count} more conversations — type to narrow',
    pickOnStage: 'On this split',
    pickNone: 'No conversations yet — create one in the sidebar first',
    loading: 'Opening session…',
    openFailed: 'Could not open this session: {message}',
    noContent: 'This DSH version cannot host a conversation in a pane',
    paneCrashed: 'This pane failed: {message}',
    stageCrashed: 'The split view failed: {message}',
    maximize: 'Maximize',
    restore: 'Restore',
    remove: 'Clear this pane',
    divider: 'Resize panes (arrow keys)',
    hostUnverified: 'DSH {version} is not verified',
    rowActionAdd: 'Open in split view',
    rowActionFocus: 'Already in the split — click to focus',
    rowActionMenu: 'Open in split view',
    paneChange: 'Change conversation',
    openMain: 'Open in native view',
    shape: 'Pane count',
    shapeN: '{n} panes',
    running: 'Running',
    waiting: 'Waiting for you',
    unread: 'New result',
    views: 'Views',
    viewsEmpty: 'No saved views yet. A split with two or more sessions is remembered automatically.',
    viewsCurrent: 'Current split',
    viewsDelete: 'Delete view',
    viewsRename: 'Rename this split',
    viewsHint: 'Restore this split',
    updateCheck: 'Check for updates',
    updateChecking: 'Checking for updates…',
    updateLatest: 'Up to date ({version})',
    updateAvailable: 'Version {version} is available',
    updateInstall: 'Update now',
    updateInstalling: 'Updating…',
    updateDone: 'Updated — restart DSH to apply',
    updateRestart: 'Restart DSH',
    updateFailed: 'Update check failed: {message}',
    updateUnsupported: 'No plugin market detected; automatic updates unavailable',
    updateLocal: 'Installed from a local link; automatic updates unavailable',
    updateIdle: 'Not checked yet',
    updateTitleChecking: 'Check for updates',
    updateTitleAvailable: 'Version {version} is available',
    updateTitleIdle: 'Up to date',
    updateTitleFailed: 'Update check failed',
    updateTitleUnsupported: 'No plugin market detected',
    updateTitleInstalling: 'Updating',
    updateConfirmHint: 'This downloads and installs through the plugin market.',
    updateLater: 'Later',
    updateClose: 'Close',
    updateRetry: 'Retry',
    updateTimeout: '{label} timed out after {seconds}s',
    updateUnreachable: 'Could not reach {label}',
    updateManual: 'The plugin market is unavailable — update with dsh plugin add dsh-multiview, or from the Plugins page.',
    updateNoVersion: 'The plugin market returned no version',
    serviceMarket: 'the plugin market',
    cancel: 'Cancel',
    close: 'Close',
    shortcutFocusPrev: 'Focus previous pane',
    shortcutFocusNext: 'Focus next pane',
    shortcutAttention: 'Jump to the pane that needs you',
    shortcutMaximize: 'Maximize or restore the current pane',
    shortcutSwapNext: 'Swap places with the next pane',
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
        return Array.isArray(archived) ? archived.includes(sessionId) : false;
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
const MV_MIN_PANES = 2;
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
function mvSessionSet(node) {
    const ids = mvLeaves(node).map((leaf)=>leaf.sessionId).filter((sessionId)=>sessionId !== null && sessionId !== undefined && sessionId !== '');
    return [
        ...new Set(ids)
    ].sort().join(',');
}
function mvArrangementKey(node) {
    return mvSessionSet(node) + '@' + String(mvLeaves(node).length);
}
function mvSessionState(status) {
    if (status === undefined || status === null) return 'idle';
    const pending = status.pendingInteraction;
    if (pending !== undefined && pending !== null) return 'waiting';
    if (status.running === true) return 'running';
    if (status.completionUnread === true) return 'unread';
    return 'idle';
}
function mvNeedsAttention(state) {
    return state === 'waiting' || state === 'unread';
}
function mvAttentionPanes(node, statusOf) {
    const out = [];
    for (const leaf of mvLeaves(node)){
        if (leaf.sessionId === null || leaf.sessionId === undefined || leaf.sessionId === '') continue;
        const state = statusOf(leaf.sessionId);
        if (mvNeedsAttention(state)) out.push(leaf.id);
    }
    return out;
}
function mvNextAttentionPane(node, focusedId, statusOf) {
    const candidates = mvAttentionPanes(node, statusOf);
    if (candidates.length === 0) return null;
    const order = mvLeaves(node).map((leaf)=>leaf.id);
    const from = order.indexOf(focusedId);
    const after = candidates.filter((id)=>order.indexOf(id) > from);
    return after.length > 0 ? after[0] : candidates[0];
}
function mvDedupeViews(views) {
    const best = new Map();
    const order = [];
    for (const view of views){
        if (view === null || view === undefined || view.layout === null || view.layout === undefined) continue;
        const key = mvArrangementKey(view.layout);
        if (mvSessionSet(view.layout) === '' || mvSessionSet(view.layout).indexOf(',') < 0) continue;
        const seen = best.get(key);
        if (seen === undefined) {
            best.set(key, view);
            order.push(key);
            continue;
        }
        const seenNamed = typeof seen.customName === 'string';
        const viewNamed = typeof view.customName === 'string';
        let preferred;
        if (seenNamed && !viewNamed) preferred = seen;
        else if (!seenNamed && viewNamed) preferred = view;
        else preferred = (view.savedAt ?? 0) > (seen.savedAt ?? 0) ? view : seen;
        best.set(key, preferred);
    }
    return order.map((key)=>best.get(key));
}
function mvLeafCount(node) {
    return mvLeaves(node).length;
}
function mvShapeTo(node, count, focusedId) {
    const target = Math.max(2, Math.min(MV_MAX_PANES, count));
    const current = mvLeaves(node);
    if (current.length === target) return node;
    const sessions = current.map((leaf)=>leaf.sessionId);
    if (target < current.length && focusedId !== undefined) {
        const index = current.findIndex((leaf)=>leaf.id === focusedId);
        if (index > target - 1) {
            const watched = sessions[index];
            sessions.splice(index, 1);
            sessions.unshift(watched);
        }
    }
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
    if (mvLeafCount(node) <= MV_MIN_PANES) return node;
    return mvRemoveLeafIn(node, leafId);
}
function mvRemoveLeafIn(node, leafId) {
    if (node === null || node === undefined) return null;
    if (node.kind === 'leaf') return node.id === leafId ? null : node;
    const a = mvRemoveLeafIn(node.a, leafId);
    const b = mvRemoveLeafIn(node.b, leafId);
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
function mvUniqueId(proposed, prefix, seen) {
    if (typeof proposed === 'string' && proposed !== '' && !seen.has(proposed)) {
        seen.add(proposed);
        return proposed;
    }
    let counter = seen.size + 1;
    let candidate = prefix + String(counter);
    while(seen.has(candidate)){
        counter += 1;
        candidate = prefix + String(counter);
    }
    seen.add(candidate);
    return candidate;
}
function mvNormalizeIds(node, seen) {
    if (node === null || node === undefined) return node;
    if (node.kind === 'leaf') {
        const id = mvUniqueId(node.id, 'p', seen);
        return id === node.id ? node : {
            ...node,
            id
        };
    }
    const a = mvNormalizeIds(node.a, seen);
    const b = mvNormalizeIds(node.b, seen);
    const id = mvUniqueId(node.id, 's', seen);
    if (a === node.a && b === node.b && id === node.id) return node;
    return {
        ...node,
        id,
        a,
        b
    };
}
function mvSanitize(raw) {
    const repaired = mvSanitizeRaw(raw);
    const seen = new Set();
    const clearDuplicates = (value)=>{
        if (value === null || value === undefined) return value;
        if (value.kind === 'leaf') {
            if (value.sessionId === null) return value;
            if (seen.has(value.sessionId)) return {
                ...value,
                sessionId: null
            };
            seen.add(value.sessionId);
            return value;
        }
        if (value.kind !== 'split') return value;
        return {
            ...value,
            a: clearDuplicates(value.a),
            b: clearDuplicates(value.b)
        };
    };
    return clearDuplicates(repaired);
}
function mvSanitizeRaw(raw) {
    let overflowed = false;
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
        if (leaves > MV_MAX_PANES) {
            overflowed = true;
            return mvLeaves(a).length >= mvLeaves(b).length ? a : b;
        }
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
    if (overflowed && mvLeaves(tree).length < 2) {
        return mvPreset(2);
    }
    if (tree.kind === 'leaf') {
        const widened = mvPreset(2);
        const leaves = mvLeaves(widened);
        leaves[0].sessionId = tree.sessionId ?? null;
        return widened;
    }
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
function mvKeyCap(code) {
    if (code === 'BracketLeft') return '[';
    if (code === 'BracketRight') return ']';
    if (code === 'Slash') return '/';
    if (code === 'Backslash') return '\\';
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    return code;
}
function mvShortcutHint(code) {
    return 'Mod+Alt+' + mvKeyCap(code);
}
function mvUpdateDue(checkedAt, nextAt, now, interval) {
    if (!(now - checkedAt >= interval)) return false;
    return nextAt <= now;
}
function mvBackoffDelay(failures, base, max) {
    const count = Number.isFinite(failures) && failures >= 1 ? Math.floor(failures) : 1;
    const doublings = Math.min(count - 1, 40);
    return Math.min(base * Math.pow(2, doublings), max);
}
function mvVersionParts(version) {
    const withoutBuild = String(version).split('+')[0];
    const dash = withoutBuild.indexOf('-');
    const core = dash < 0 ? withoutBuild : withoutBuild.slice(0, dash);
    const pre = dash < 0 ? '' : withoutBuild.slice(dash + 1);
    return {
        core: core.split('.').map((part)=>{
            const value = Number.parseInt(part, 10);
            return Number.isFinite(value) ? value : 0;
        }),
        pre: pre === '' ? [] : pre.split('.')
    };
}
function mvComparePre(left, right) {
    if (left.length === 0 && right.length === 0) return 0;
    if (left.length === 0) return 1;
    if (right.length === 0) return -1;
    const length = Math.max(left.length, right.length);
    for(let index = 0; index < length; index += 1){
        const a = left[index];
        const b = right[index];
        if (a === undefined) return -1;
        if (b === undefined) return 1;
        const aNumeric = /^\d+$/.test(a);
        const bNumeric = /^\d+$/.test(b);
        if (aNumeric && bNumeric) {
            const difference = Number(a) - Number(b);
            if (difference !== 0) return difference < 0 ? -1 : 1;
            continue;
        }
        if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
        if (a !== b) return a < b ? -1 : 1;
    }
    return 0;
}
function mvVersionGt(left, right) {
    const a = mvVersionParts(left);
    const b = mvVersionParts(right);
    for(let index = 0; index < Math.max(a.core.length, b.core.length); index += 1){
        const first = a.core[index] ?? 0;
        const second = b.core[index] ?? 0;
        if (first !== second) return first > second;
    }
    return mvComparePre(a.pre, b.pre) > 0;
}
function mvTrimViews(candidates, cap) {
    const named = (entry)=>typeof entry.customName === 'string' && entry.customName.trim() !== '';
    if (candidates.length <= cap) return {
        views: candidates,
        keptNewcomer: true
    };
    if (cap <= 0) return {
        views: [],
        keptNewcomer: false
    };
    const newcomer = candidates[0];
    const rest = candidates.slice(1);
    const namedRest = rest.filter(named);
    const unnamedRest = rest.filter((entry)=>!named(entry));
    if (namedRest.length <= cap - 1) {
        return {
            views: [
                newcomer,
                ...namedRest,
                ...unnamedRest
            ].slice(0, cap),
            keptNewcomer: true
        };
    }
    return {
        views: [
            ...namedRest,
            ...unnamedRest
        ].slice(0, cap),
        keptNewcomer: false
    };
}
function mvMergeSearchRows(rows, hits, titleOf, cap) {
    const seen = new Set();
    const out = [];
    for (const row of rows){
        if (row === null || typeof row !== 'object' || row.kind !== undefined) {
            out.push(row);
            continue;
        }
        seen.add(row.id);
        out.push(row);
    }
    for (const hit of Array.isArray(hits) ? hits : []){
        const id = typeof hit?.sessionId === 'string' ? hit.sessionId : null;
        if (id === null) continue;
        const snippet = typeof hit?.snippet === 'string' ? hit.snippet : '';
        if (seen.has(id)) {
            const existing = out.find((row)=>row !== null && typeof row === 'object' && row.id === id);
            if (existing !== undefined && existing.snippet === undefined) existing.snippet = snippet;
            continue;
        }
        const title = titleOf(id);
        if (title === null) continue;
        seen.add(id);
        out.push({
            id,
            title,
            depth: 0,
            owner: null,
            onStage: false,
            snippet,
            fromContent: true
        });
    }
    return out.slice(0, cap);
}

function mvInitialState() {
    return {
        layout: mvPreset(2),
        focused: 'p1',
        maximized: null,
        preset: 2,
        seeded: false,
        reconciled: false,
        views: [],
        currentViewId: null
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
                version: 3,
                layout: mvState.layout,
                focused: mvState.focused,
                preset: mvState.preset,
                seeded: mvState.seeded,
                views: mvState.views,
                currentViewId: mvState.currentViewId
            };
            window.localStorage.setItem(MV_STORAGE_KEY, JSON.stringify(durable));
        } catch (error) {}
    }, 200);
}
function mvViewKey(layout) {
    return mvLeaves(layout).map((leaf)=>leaf.sessionId).filter((sessionId)=>sessionId !== null).join(',');
}
function mvViewSet(layout) {
    return mvArrangementKey(layout);
}
function mvEnsureViewIds(views) {
    const seen = new Set();
    let minted = 0;
    return views.map((view)=>{
        if (!seen.has(view.id)) {
            seen.add(view.id);
            return view;
        }
        minted += 1;
        const base = view.id + '-' + String(minted);
        let candidate = base;
        let counter = minted;
        while(seen.has(candidate)){
            counter += 1;
            candidate = view.id + '-' + String(counter);
        }
        seen.add(candidate);
        return {
            ...view,
            id: candidate
        };
    });
}
function mvNormalizeViews(views) {
    return mvDedupeViews(views);
}
function mvViewName(layout) {
    let list = null;
    try {
        list = PTX.sessions.list.getSnapshot();
    } catch (error) {
        list = null;
    }
    const titles = mvLeaves(layout).map((leaf)=>leaf.sessionId === null ? null : list?.byId[leaf.sessionId]?.title).filter((title)=>typeof title === 'string' && title.length > 0);
    if (titles.length === 0) return T('viewsCurrent');
    return titles.join('  |  ');
}
function mvViewWorthy(layout) {
    const key = mvViewKey(layout);
    return key !== '' && key.indexOf(',') >= 0;
}
function mvSyncView(next) {
    const views = next.views ?? [];
    const worthy = mvViewWorthy(next.layout);
    if (next.captureSuppressed === true) {
        return {
            ...next,
            captureSuppressed: false
        };
    }
    const current = views.find((view)=>view.id === next.currentViewId) ?? null;
    if (!worthy) {
        if (current === null) return next;
        return {
            ...next,
            views: views.filter((view)=>view.id !== current.id),
            currentViewId: null
        };
    }
    if (current !== null) {
        return {
            ...next,
            views: views.map((view)=>view.id === current.id ? {
                    ...view,
                    layout: next.layout,
                    name: typeof view.customName === 'string' ? view.customName : mvViewName(next.layout)
                } : view)
        };
    }
    const key = mvViewKey(next.layout);
    const existing = views.find((view)=>view.id === key);
    if (existing !== undefined) {
        return {
            ...next,
            currentViewId: existing.id,
            views: views.map((view)=>view.id === existing.id ? {
                    ...view,
                    layout: next.layout,
                    name: typeof view.customName === 'string' ? view.customName : mvViewName(next.layout)
                } : view)
        };
    }
    const set = mvViewSet(next.layout);
    const sameSet = views.find((view)=>mvViewSet(view.layout) === set);
    if (sameSet !== undefined) {
        return {
            ...next,
            currentViewId: sameSet.id,
            views: views.map((view)=>view.id === sameSet.id ? {
                    ...view,
                    layout: next.layout,
                    name: typeof view.customName === 'string' ? view.customName : mvViewName(next.layout),
                    savedAt: Date.now()
                } : view)
        };
    }
    const created = {
        id: key,
        name: mvViewName(next.layout),
        layout: next.layout,
        savedAt: Date.now()
    };
    const trimmed = mvTrimViews([
        created,
        ...views
    ], 12);
    return {
        ...next,
        currentViewId: trimmed.keptNewcomer ? created.id : null,
        views: trimmed.views
    };
}
function mvCommit(produce) {
    const produced = produce(mvState);
    if (produced === mvState || produced === null || produced === undefined) return;
    mvState = mvSyncView(produced);
    mvScheduleSave();
    for (const listener of mvListeners){
        try {
            listener();
        } catch (error) {
            console.error('dsh-multiview: state listener failed', error);
        }
    }
}
function mvSanitizeView(raw) {
    if (raw === null || typeof raw !== 'object') return null;
    const layout = mvSanitize(raw.layout);
    if (layout === null || !mvViewWorthy(layout)) return null;
    const customName = typeof raw.customName === 'string' && raw.customName.trim() !== '' ? raw.customName.trim() : undefined;
    const name = customName ?? (typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : T('viewsCurrent'));
    return {
        id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : mvViewKey(layout),
        name,
        customName,
        layout,
        savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now()
    };
}
function mvHydrate() {
    let raw = null;
    try {
        raw = JSON.parse(window.localStorage.getItem(MV_STORAGE_KEY) ?? 'null');
    } catch (error) {
        raw = null;
    }
    if (raw === null || typeof raw !== 'object') return;
    if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) return;
    const layout = mvSanitize(raw.layout);
    if (layout === null) return;
    const leaves = mvLeaves(layout);
    const focused = leaves.some((leaf)=>leaf.id === raw.focused) ? raw.focused : leaves[0].id;
    const views = mvEnsureViewIds(mvNormalizeViews(Array.isArray(raw.views) ? raw.views.map(mvSanitizeView).filter((view)=>view !== null) : []));
    const currentViewId = typeof raw.currentViewId === 'string' && views.some((view)=>view.id === raw.currentViewId) ? raw.currentViewId : null;
    mvState = {
        layout,
        focused,
        maximized: null,
        preset: typeof raw.preset === 'number' && raw.preset >= 2 && raw.preset <= 4 && raw.preset === leaves.length ? raw.preset : leaves.length,
        seeded: raw.seeded === true,
        reconciled: false,
        views,
        currentViewId
    };
}
function mvReset() {
    const views = mvState.views;
    mvCommit(()=>({
            ...mvInitialState(),
            views,
            currentViewId: null
        }));
    try {
        window.localStorage.removeItem(MV_STORAGE_KEY);
    } catch (error) {}
}
function mvClearArchived() {
    try {
        const kept = mvReconcileTree(mvState.layout, (sessionId)=>mvIsArchived(sessionId) ? null : sessionId);
        if (kept === mvState.layout) return;
        mvCommit((current)=>({
                ...current,
                layout: kept
            }));
    } catch (error) {}
}
function mvReconcile() {
    if (mvState.reconciled) return;
    try {
        const list = PTX.sessions.list.getSnapshot();
        if (list.phase !== 'ready') return;
        const kept = mvReconcileTree(mvState.layout, (sessionId)=>{
            const row = list.byId[sessionId];
            if (row === undefined || row.blank === true) return null;
            if (mvIsArchived(sessionId)) return null;
            return sessionId;
        });
        mvCommit((current)=>({
                ...current,
                layout: kept,
                reconciled: true
            }));
    } catch (error) {
        mvCommit((current)=>({
                ...current,
                reconciled: true
            }));
    }
}
function mvOpenForSession(sessionId) {
    if (sessionId === null) return;
    mvCommit((current)=>{
        const owners = current.views.filter((view)=>mvViewKey(view.layout).split(',').includes(sessionId));
        const owner = owners[0];
        if (owner !== undefined) {
            if (current.currentViewId === owner.id && mvViewKey(current.layout) === mvViewKey(owner.layout)) return current;
            const ownerLeaves = mvLeaves(owner.layout);
            const stillThere = ownerLeaves.some((leaf)=>leaf.id === current.focused);
            const holder = ownerLeaves.find((leaf)=>leaf.sessionId === sessionId);
            const focused = stillThere ? current.focused : holder !== undefined ? holder.id : ownerLeaves[0].id;
            return {
                ...current,
                layout: owner.layout,
                focused,
                currentViewId: owner.id,
                maximized: null,
                preset: ownerLeaves.length
            };
        }
        if (mvViewKey(current.layout).split(',').includes(sessionId)) {
            const holder = mvLeaves(current.layout).find((leaf)=>leaf.sessionId === sessionId);
            if (holder === undefined) return current;
            if (current.focused === holder.id && current.currentViewId === null) return current;
            return {
                ...current,
                focused: holder.id,
                maximized: null
            };
        }
        const layout = mvWithSession(mvPreset(2), 'p1', sessionId);
        return {
            ...current,
            layout,
            currentViewId: null,
            focused: 'p1',
            preset: 2,
            maximized: null
        };
    });
}
function mvViewOwner(sessionId, views, currentViewId) {
    for (const view of views){
        if (view.id === currentViewId) continue;
        if (mvViewKey(view.layout).split(',').includes(sessionId)) return view;
    }
    return null;
}
function mvSetShape(count) {
    mvCommit((current)=>{
        const layout = mvShapeTo(current.layout, count, current.focused);
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
        let maximized = current.maximized;
        if (maximized !== null) {
            const before = mvLeafById(current.layout, maximized);
            const after = mvLeafById(layout, maximized);
            const unchanged = before !== null && after !== null && before.sessionId === after.sessionId;
            if (!unchanged) maximized = null;
        }
        return {
            ...current,
            layout,
            focused,
            maximized
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
    mvCommit((current)=>{
        if (current.maximized === leafId) return {
            ...current,
            maximized: null
        };
        const leaf = mvLeafById(current.layout, leafId);
        if (leaf === null || leaf.sessionId === null) return current;
        return {
            ...current,
            maximized: leafId,
            focused: leafId
        };
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
function mvSwapWithNeighbour(leafId, delta) {
    const state = mvGetState();
    const other = mvNeighbour(state.layout, leafId, delta);
    if (other === leafId) return;
    mvSwapLeaves(leafId, other);
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
        const leaf = mvLeafById(current.layout, leafId);
        if (leaf === null) return current;
        if (leaf.sessionId !== null) {
            const cleared = mvWithSession(current.layout, leafId, null);
            if (cleared === current.layout) return current;
            return {
                ...current,
                layout: cleared,
                focused: leafId,
                maximized: current.maximized === leafId ? null : current.maximized
            };
        }
        const leaves = mvLeaves(current.layout);
        if (leaves.length <= 2) return current;
        const layout = mvRemoveLeaf(current.layout, leafId);
        if (layout === null) return current;
        const nextLeaves = mvLeaves(layout);
        const focused = nextLeaves.some((item)=>item.id === current.focused) ? current.focused : nextLeaves[0].id;
        return {
            ...current,
            layout,
            focused,
            preset: nextLeaves.length,
            maximized: current.maximized === leafId ? null : current.maximized
        };
    });
}
function mvPutInPane(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return null;
    const state = mvGetState();
    const leaves = mvLeaves(state.layout);
    const holder = leaves.find((leaf)=>leaf.sessionId === sessionId);
    if (holder !== undefined) {
        mvFocus(holder.id);
        return holder.id;
    }
    const empty = leaves.find((leaf)=>leaf.sessionId === null);
    if (empty !== undefined) {
        mvBind(empty.id, sessionId);
        return empty.id;
    }
    if (leaves.length < MV_MAX_PANES) {
        const grown = mvShapeTo(state.layout, leaves.length + 1);
        const fresh = mvLeaves(grown).find((leaf)=>leaf.sessionId === null);
        if (fresh !== undefined) {
            mvSetShape(leaves.length + 1);
            mvBind(fresh.id, sessionId);
            return fresh.id;
        }
    }
    const fallback = leaves.find((leaf)=>leaf.id === state.focused) ?? leaves[0];
    if (fallback === undefined) return null;
    mvBind(fallback.id, sessionId);
    return fallback.id;
}
function mvRenameView(viewId, name) {
    const trimmed = String(name ?? '').trim().slice(0, 60);
    mvCommit((current)=>({
            ...current,
            views: (current.views ?? []).map((view)=>view.id === viewId ? trimmed === '' ? {
                    ...view,
                    name: mvViewName(view.layout),
                    customName: undefined
                } : {
                    ...view,
                    name: trimmed,
                    customName: trimmed
                } : view)
        }));
}
function mvLiveLayout(layout) {
    try {
        const list = PTX.sessions.list.getSnapshot();
        if (list === undefined || list === null || list.phase !== 'ready') return layout;
        return mvReconcileTree(layout, (sessionId)=>{
            const row = list.byId[sessionId];
            if (row === undefined || row.blank === true) return null;
            if (mvIsArchived(sessionId)) return null;
            return sessionId;
        });
    } catch (error) {
        return layout;
    }
}
function mvApplyView(viewId) {
    mvCommit((current)=>{
        const view = current.views.find((item)=>item.id === viewId);
        if (view === undefined) return current;
        const layout = mvLiveLayout(view.layout);
        const leaves = mvLeaves(layout);
        const worthy = mvViewWorthy(layout);
        return {
            ...current,
            layout,
            focused: leaves[0].id,
            preset: leaves.length,
            maximized: null,
            currentViewId: worthy ? view.id : null,
            views: current.views.map((item)=>item.id === view.id ? {
                    ...item,
                    layout
                } : item)
        };
    });
}
function mvStartView() {
    mvCommit((current)=>({
            ...current,
            layout: mvPreset(2),
            focused: 'p1',
            preset: 2,
            maximized: null,
            currentViewId: null
        }));
}
function mvDeleteView(viewId) {
    mvCommit((current)=>{
        if (!current.views.some((item)=>item.id === viewId)) return current;
        return {
            ...current,
            views: current.views.filter((item)=>item.id !== viewId),
            currentViewId: current.currentViewId === viewId ? null : current.currentViewId,
            captureSuppressed: current.currentViewId === viewId
        };
    });
}

const MV_UPDATE_KEY = 'dsh.multiview.update.v1';
const MV_CHECK_INTERVAL = 24 * 60 * 60 * 1000;
const MV_BACKOFF_BASE = 60 * 60 * 1000;
const MV_BACKOFF_MAX = 12 * 60 * 60 * 1000;
const MV_POLL_INTERVAL = 1500;
const MV_POLL_LIMIT = 200;
const MV_REQUEST_TIMEOUT = 20000;
const MV_CHECK_TIMEOUT = 30000;
const MV_UPDATE_STALE = 10 * 60 * 1000;
const MV_CAPABILITY_TIMEOUT = 5000;
const MV_REGISTRY_LATEST = 'https://registry.npmjs.org/dsh-multiview/latest';
const MV_REGISTRY_TIMEOUT = 8000;
let mvUpdateState = {
    status: 'idle',
    installed: MV_PLUGIN_VERSION,
    latest: null,
    source: null,
    available: false,
    localOnly: false,
    checkedAt: 0,
    nextAt: 0,
    failures: 0,
    error: null,
    operationId: null,
    operationState: null,
    restartRequired: false,
    restartSupported: false
};
const mvUpdateListeners = new Set();
function mvUpdateGetState() {
    return mvUpdateState;
}
function mvUpdateSubscribe(listener) {
    mvUpdateListeners.add(listener);
    return ()=>{
        mvUpdateListeners.delete(listener);
    };
}
function mvUpdateCommit(patch) {
    mvUpdateState = {
        ...mvUpdateState,
        ...patch
    };
    try {
        window.localStorage.setItem(MV_UPDATE_KEY, JSON.stringify({
            checkedAt: mvUpdateState.checkedAt,
            nextAt: mvUpdateState.nextAt,
            failures: mvUpdateState.failures,
            latest: mvUpdateState.latest,
            available: mvUpdateState.available,
            localOnly: mvUpdateState.localOnly,
            source: mvUpdateState.source
        }));
    } catch (error) {}
    for (const listener of mvUpdateListeners){
        try {
            listener();
        } catch (error) {
            console.error('dsh-multiview: update listener failed', error);
        }
    }
}
function mvUpdateHydrate() {
    try {
        const raw = JSON.parse(window.localStorage.getItem(MV_UPDATE_KEY) ?? 'null');
        if (raw === null || typeof raw !== 'object') return;
        mvUpdateState = {
            ...mvUpdateState,
            checkedAt: typeof raw.checkedAt === 'number' ? raw.checkedAt : 0,
            nextAt: typeof raw.nextAt === 'number' ? raw.nextAt : 0,
            failures: typeof raw.failures === 'number' ? raw.failures : 0,
            latest: typeof raw.latest === 'string' ? raw.latest : null,
            available: raw.available === true,
            localOnly: raw.localOnly === true,
            source: typeof raw.source === 'string' ? raw.source : null
        };
    } catch (error) {}
}
async function mvUpdateGet(url, timeoutMs = MV_REQUEST_TIMEOUT) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller === null ? 0 : setTimeout(()=>controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            credentials: timeoutMs === MV_REQUEST_TIMEOUT ? 'same-origin' : 'omit',
            headers: {
                accept: 'application/json'
            },
            signal: controller === null ? undefined : controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    } finally{
        if (timer !== 0) clearTimeout(timer);
    }
}
function mvUpdateDescribe(error, timeoutMs, label) {
    const name = error === null || error === undefined ? '' : String(error.name ?? '');
    const message = error instanceof Error ? error.message : String(error);
    if (name === 'AbortError' || /aborted/i.test(message)) {
        return mvFormat(T('updateTimeout'), {
            label,
            seconds: String(Math.round(timeoutMs / 1000))
        });
    }
    if (error instanceof TypeError || /fetch|network|failed to fetch/i.test(message)) {
        return mvFormat(T('updateUnreachable'), {
            label
        });
    }
    return message;
}
async function mvUpdateRegistryLatest() {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller === null ? 0 : setTimeout(()=>controller.abort(), MV_REGISTRY_TIMEOUT);
    try {
        const response = await fetch(MV_REGISTRY_LATEST, {
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                accept: 'application/json'
            },
            signal: controller === null ? undefined : controller.signal
        });
        if (!response.ok) return null;
        const answer = await response.json();
        const version = typeof answer?.version === 'string' ? answer.version : '';
        return version === '' ? null : version;
    } catch (error) {
        return null;
    } finally{
        if (timer !== 0) clearTimeout(timer);
    }
}
async function mvUpdatePost(url, body) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller === null ? 0 : setTimeout(()=>controller.abort(), MV_REQUEST_TIMEOUT);
    try {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller === null ? undefined : controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    } finally{
        if (timer !== 0) clearTimeout(timer);
    }
}
async function mvUpdateCheck(force) {
    const now = Date.now();
    if (force !== true && !mvUpdateDue(mvUpdateState.checkedAt, mvUpdateState.nextAt, now, MV_CHECK_INTERVAL)) return;
    if (mvUpdateState.status === 'checking' || mvUpdateState.status === 'installing') return;
    mvUpdateCommit({
        status: 'checking',
        error: null
    });
    let installed = MV_PLUGIN_VERSION;
    let capabilities = null;
    let capabilityFailure = null;
    try {
        capabilities = await mvUpdateGet('/dsh-market/api/v1/capabilities', MV_CAPABILITY_TIMEOUT);
    } catch (error) {
        capabilities = null;
        capabilityFailure = mvUpdateDescribe(error, MV_CAPABILITY_TIMEOUT, T('serviceMarket'));
    }
    const marketReady = capabilities !== null && capabilities.schema === 'dsh-market/update-api/v1';
    const endpoints = marketReady ? capabilities.endpoints ?? {} : {};
    const updatesPath = typeof endpoints.updates === 'string' ? endpoints.updates : '/dsh-market/api/v1/updates';
    let latest = await mvUpdateRegistryLatest();
    let source = latest === null ? null : 'npm';
    let marketAnswered = false;
    let failure = null;
    if (latest === null) {
        try {
            const answer = await mvUpdateGet(updatesPath + '?name=dsh-multiview', MV_CHECK_TIMEOUT);
            const pkg = answer?.package ?? null;
            marketAnswered = pkg !== null && pkg !== undefined;
            if (typeof pkg?.installedVersion === 'string') installed = pkg.installedVersion;
            if (typeof pkg?.latestVersion === 'string') latest = pkg.latestVersion;
            if (latest !== null) source = typeof pkg?.source === 'string' ? pkg.source : 'market';
        } catch (error) {
            failure = mvUpdateDescribe(error, MV_CHECK_TIMEOUT, T('serviceMarket'));
        }
    }
    if (latest === null) {
        const failures = mvUpdateState.failures + 1;
        mvUpdateCommit({
            status: marketReady || capabilities === null ? 'error' : 'unsupported',
            available: false,
            latest: null,
            failures,
            nextAt: now + mvBackoffDelay(failures, MV_BACKOFF_BASE, MV_BACKOFF_MAX),
            error: failure ?? capabilityFailure ?? T('updateNoVersion')
        });
        return;
    }
    const available = mvVersionGt(latest, installed);
    mvUpdateCommit({
        status: available ? 'available' : 'idle',
        installed,
        latest,
        source,
        available,
        canAutoInstall: marketReady && endpoints.updates !== undefined,
        localOnly: typeof source === 'string' && /^link|local|file/i.test(source),
        checkedAt: now,
        nextAt: now + MV_CHECK_INTERVAL,
        failures: 0,
        error: null,
        restartSupported: marketReady ? capabilities.restart?.supported === true : false
    });
}
async function mvUpdateInstall() {
    if (mvUpdateState.status === 'installing') return;
    mvUpdateCommit({
        status: 'installing',
        error: null,
        operationState: 'queued'
    });
    try {
        let capabilities = null;
        try {
            capabilities = await mvUpdateGet('/dsh-market/api/v1/capabilities');
        } catch (error) {
            capabilities = null;
        }
        if (capabilities === null) {
            mvUpdateCommit({
                status: 'unsupported',
                error: null
            });
            return;
        }
        const endpoints = capabilities.endpoints ?? {};
        const updatesPath = typeof endpoints.updates === 'string' ? endpoints.updates : '/dsh-market/api/v1/updates';
        const operationsPath = typeof endpoints.operations === 'string' ? endpoints.operations : '/dsh-market/api/v1/operations';
        const accepted = await mvUpdatePost(updatesPath, {
            packageName: 'dsh-multiview'
        });
        const operationId = typeof accepted?.operationId === 'string' ? accepted.operationId : null;
        if (operationId === null) throw new Error('market returned no operation');
        mvUpdateCommit({
            operationId,
            operationState: 'running'
        });
        for(let attempt = 0; attempt < MV_POLL_LIMIT; attempt += 1){
            await new Promise((resolve)=>setTimeout(resolve, MV_POLL_INTERVAL));
            const record = await mvUpdateGet(operationsPath + '?operationId=' + encodeURIComponent(operationId));
            const operation = record?.operation ?? record;
            const state = typeof operation?.state === 'string' ? operation.state : null;
            mvUpdateCommit({
                operationState: state
            });
            if (state === 'succeeded') {
                mvUpdateCommit({
                    status: 'done',
                    available: false,
                    installed: typeof operation?.installedVersion === 'string' ? operation.installedVersion : mvUpdateState.installed,
                    restartRequired: operation?.restartRequired === true,
                    checkedAt: Date.now(),
                    nextAt: Date.now() + MV_CHECK_INTERVAL
                });
                return;
            }
            if (state === 'failed' || state === 'cancelled' || state === 'rolled-back') {
                const message = operation?.message ?? operation?.failureCode ?? state;
                mvUpdateCommit({
                    status: 'error',
                    error: typeof message === 'string' ? message : String(message)
                });
                return;
            }
        }
        mvUpdateCommit({
            status: 'error',
            error: 'operation timed out'
        });
    } catch (error) {
        mvUpdateCommit({
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
function mvUpdateMaybeAutoCheck() {
    if (mvUpdateState.status === 'checking' || mvUpdateState.status === 'installing') return;
    if (Date.now() - mvUpdateState.checkedAt < MV_CHECK_INTERVAL) return;
    if (mvUpdateState.nextAt > Date.now()) return;
    void mvUpdateCheck(false);
}

const MV_CSS = `
.mv-root{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.mv-bar{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px 0 12px;flex:none;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.mv-bar-title{font-size:13px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap;margin-right:2px}
.mv-strip{display:flex;flex-direction:row;align-items:center;gap:4px;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;flex:0 1 auto}
.mv-strip::-webkit-scrollbar{display:none}
.mv-bar-view{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);padding-left:2px}
.mv-bar-spacer{flex:1;min-width:0}
.mv-seg{display:flex;align-items:center;gap:2px;flex:none}
.mv-chip{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;min-width:24px;padding:0 6px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;cursor:pointer;white-space:nowrap}
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
.mv-head{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px 0 12px;flex:none;color:var(--dsw-alias-label-secondary);border-bottom:.5px solid transparent}
.mv-pane[data-focused="true"] .mv-head{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-border-l3)}
.mv-pane[data-drag-source="true"]{opacity:.75}
.mv-pane[data-drag-source="true"] .mv-head{box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}
.mv-pane[data-drop="true"]::after{content:"";position:absolute;inset:0;border:1px solid var(--dsw-alias-state-business-primary);border-radius:var(--dsw-radius-sm);pointer-events:none;z-index:5}
.mv-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.mv-dot-action{padding:0;border:none;cursor:pointer}
.mv-dot-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.mv-dot[data-state="running"]{background:var(--dsw-alias-state-business-primary)}
.mv-dot[data-state="waiting"]{background:var(--dsw-alias-state-warn-primary)}
.mv-dot[data-state="unread"]{background:var(--dsw-alias-state-success-primary)}
body:not([data-ds-dark-theme]) .mv-dot[data-state="waiting"],body:not([data-ds-dark-theme]) .mv-dot[data-state="unread"]{filter:brightness(0.75)}
.mv-head-title{flex:1;min-width:0;font-size:13px;line-height:16px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:grab}
.mv-head-title:active{cursor:grabbing}
.mv-head-actions{display:flex;align-items:center;gap:2px;flex:none;opacity:0}
.mv-pane:hover .mv-head-actions,.mv-pane[data-focused="true"] .mv-head-actions,.mv-head-actions:focus-within{opacity:1}
.mv-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;cursor:pointer}
.mv-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-icon:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.mv-pane-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.mv-note{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:24px;font-size:13px;line-height:20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.mv-note[data-error="true"]{color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 92%, var(--dsw-alias-label-primary))}

.mv-picker{display:flex;flex-direction:column;flex:1;min-height:0;padding:12px}
.mv-picker-search{height:30px;flex:none;margin:0 0 8px;padding:0 10px;border:1px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;outline:none}
.mv-picker-search:focus{border-color:var(--dsw-alias-state-business-primary)}
.mv-picker-search::placeholder{color:var(--dsw-alias-label-secondary);opacity:1}
.mv-picker-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.mv-picker-item{display:flex;flex-direction:row;justify-content:space-between;gap:8px;align-items:center;width:100%;padding:6px 8px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;font-size:13px;line-height:18px}
.mv-picker-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-picker-item:not([data-depth="0"]){color:var(--dsw-alias-label-secondary);font-size:12px}
.mv-picker-item:not([data-depth="0"]):hover{color:var(--dsw-alias-label-primary)}
.mv-picker-more{padding:6px 8px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.mv-picker-empty{padding:12px 8px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.mv-picker-group{padding:10px 8px 4px;font-size:11px;font-weight:600;letter-spacing:0.02em;color:var(--dsw-alias-label-secondary);text-transform:none}
.mv-views{position:relative;display:inline-flex}
.mv-views-toggle{position:relative}
.mv-views-toggle[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-views-count{position:absolute;top:-4px;right:-5px;min-width:16px;height:16px;padding:0 3px;border:1.5px solid var(--dsw-alias-bg-base);border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:10px;line-height:13px;text-align:center;pointer-events:none}
.mv-views-pop{position:absolute;top:calc(100% + 4px);left:0;z-index:12;min-width:240px;max-width:min(520px, 64vw);max-height:320px;overflow:auto;padding:4px;border:0;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-3);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.mv-views-empty{padding:10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mv-views-row{display:flex;align-items:center;gap:4px;border-radius:var(--dsw-radius-sm)}
.mv-views-row[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.mv-views-name{flex:1;min-width:0;padding:6px 8px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.mv-views-name:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-views-input{flex:1;min-width:0;height:26px;margin-right:4px;padding:0 8px;border:1px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.mv-views-input:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:0}
.mv-views-del{flex:none;width:22px;height:22px;margin-right:4px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.mv-views-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-update{position:relative}
.mv-update[data-has-update="true"]::after{content:"";position:absolute;top:2px;right:2px;width:6px;height:6px;border-radius:999px;background:var(--dsw-alias-state-error-primary)}
.mv-update[data-busy="true"] svg{animation:mv-spin 1s linear infinite}
@keyframes mv-spin{to{transform:rotate(360deg)}}
.mv-dialog-backdrop{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1)}
.mv-dialog{width:min(420px, calc(100vw - 48px));padding:16px;border:0;border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.mv-dialog-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mv-dialog-text{margin-top:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);word-break:break-word}
.mv-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.mv-dialog-button{height:28px;padding:0 12px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.mv-dialog-button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-dialog-button--primary{border-color:transparent;background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 88%, var(--dsw-alias-label-primary));color:var(--dsw-alias-bg-base)}
.mv-dialog-button--primary:hover{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 80%, var(--dsw-alias-label-primary))}
.mv-dialog-button:disabled{opacity:.55;cursor:default}
.mv-dialog-button--primary:disabled:hover{filter:none}
.mv-dialog-button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.mv-picker-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mv-picker-snippet{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px;padding-left:8px}
.mv-picker-owner{flex:none;max-width:45%;padding:0 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mv-picker-item[data-owned="true"]{opacity:0.45;cursor:not-allowed}
.mv-picker-item[data-owned="true"]:hover{background:transparent}
.mv-picker-item[data-owned="true"]:not([data-depth="0"]):hover{color:var(--dsw-alias-label-secondary)}
.mv-dialog-button:not(.mv-dialog-button--primary):disabled:hover{background:transparent}
.mv-bar{color:var(--dsw-alias-label-primary)}
.mv-row-action{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.mv-row-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-row-action[data-active="true"]{color:var(--dsw-alias-state-business-primary)}
.mv-row-action:focus-visible{outline:1px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));outline-offset:2px}
.mv-menu-row{display:flex;flex-direction:row;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;border:none;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer}
.mv-menu-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-menu-row:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.mv-icon-badge-host{position:relative;display:inline-flex;align-items:center;justify-content:center}
.mv-icon-badge{position:absolute;top:-1px;right:-1px;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);box-shadow:0 0 0 1.5px var(--dsw-specific-sidebar-fill)}
.mv-icon{color:var(--dsw-alias-label-primary)}
.mv-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-chip{color:var(--dsw-alias-label-secondary)}
.mv-chip[data-active="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}


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
    const { label, path, onClick, hint } = props;
    return h('button', {
        type: 'button',
        className: 'mv-icon',
        title: hint === undefined || hint === null || hint === '' ? label : label + ' · ' + hint,
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
    external: 'M6 10L13 3M9 3h4v4',
    change: 'M3 6.5h7.5M8 4l2.5 2.5L8 9M13 9.5H5.5M8 7l-2.5 2.5L8 12',
    updateCheck: 'M8 2a6 6 0 1 0 0 12A6 6 0 1 0 8 2zM8 10.7V5.7M5.6 8.1 8 5.6l2.4 2.5',
    updateInstall: 'M3 9.5v3c0 .6.45 1 1 1h8c.55 0 1-.4 1-1v-3M8 2.6v6.2M5.4 6.4 8 9l2.6-2.6',
    pause: 'M6 3.5v9M10 3.5v9',
    play: 'M6 3.6v8.8L12.6 8z',
    views: 'M8 2.2 13.4 5 8 7.8 2.6 5 8 2.2M2.6 8.2 8 11l5.4-2.8M2.6 11.2 8 14l5.4-2.8',
    split: 'M2.6 3.4h10.8v9.2H2.6zM8 3.4v9.2'
};
function mvHostTitle() {
    const fallback = T('title');
    try {
        const version = window.__DSH_BOOT__?.release?.version;
        if (typeof version !== 'string' || version === '') return fallback;
        if (/^0\.2\.[12](?![0-9])/.test(version)) return fallback;
        return fallback + ' · ' + mvFormat(T('hostUnverified'), {
            version
        });
    } catch (error) {
        return fallback;
    }
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
const mvSessionUnavailable = 'the host has no session reference available yet';
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
    const { sessionId, SessionProvider, renderSlot, useSessions } = props;
    const [state, setState] = React.useState({
        reference: null,
        error: null
    });
    const ready = useSessions === undefined ? true : useSessions((snapshot)=>snapshot.phase === 'ready');
    React.useEffect(()=>{
        if (sessionId === null || sessionId === undefined || ready !== true) return undefined;
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
        if (reference === null || reference === undefined || typeof reference.ready?.then !== 'function') {
            setState({
                reference: null,
                error: mvSessionUnavailable
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
        sessionId,
        ready
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
function MultiviewPanelIcon(props) {
    const state = useMvState();
    const readStatuses = typeof props?.useSessionStatus === 'function' ? props.useSessionStatus : null;
    const statuses = readStatuses === null ? null : readStatuses((snapshot)=>snapshot);
    const count = statuses === null || statuses === undefined || typeof statuses.get !== 'function' ? 0 : mvAttentionPanes(state.layout, (sessionId)=>mvSessionState(statuses.get(sessionId))).length;
    const label = count === 0 ? T('panel') : count === 1 ? T('panelAttentionOne') : T('panelAttention').replace('{count}', String(count));
    const iconTitle = count === 0 ? label : label + ' · ' + mvShortcutHint('KeyJ');
    const edge = typeof props?.size === 'number' && props.size > 0 && props.size <= 48 ? props.size : 16;
    return h('span', {
        className: 'mv-icon-badge-host',
        'aria-label': label,
        title: iconTitle,
        role: count === 0 ? undefined : 'img'
    }, h('svg', {
        viewBox: '0 0 16 16',
        width: edge,
        height: edge,
        'aria-hidden': true,
        fill: 'none'
    }, h('rect', {
        x: 1.75,
        y: 2.75,
        width: 12.5,
        height: 10.5,
        rx: 2.5,
        stroke: 'currentColor',
        strokeWidth: 1.4
    }), h('path', {
        d: 'M8 2.75v10.5',
        stroke: 'currentColor',
        strokeWidth: 1.2
    })), count === 0 ? null : h('span', {
        className: 'mv-icon-badge',
        'data-attention': 'true',
        'data-count': String(count),
        'aria-hidden': true
    }));
}
const mvDotState = mvSessionState;
function mvDotLabel(state) {
    if (state === 'running') return T('running');
    if (state === 'waiting') return T('waiting');
    if (state === 'unread') return T('unread');
    return '';
}
function mvPickableRows(query, views = [], currentViewId = null, onStage = []) {
    const need = query.trim().toLowerCase();
    try {
        const list = PTX.sessions.list.getSnapshot();
        const rows = new Map();
        for (const id of list.ids){
            const row = list.byId[id];
            if (row === undefined || row.blank === true) continue;
            if (mvIsArchived(id)) continue;
            rows.set(id, row);
        }
        const snapshot = PTX.workspaces.list.getSnapshot();
        const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
        const workspaceOf = new Map();
        for (const item of items){
            for (const id of item.sessionIds ?? [])workspaceOf.set(id, item.workspaceId);
        }
        const groups = [];
        for (const item of items){
            const ids = (item.sessionIds ?? []).filter((id)=>rows.has(id));
            if (ids.length === 0) continue;
            const label = item.title ?? String(item.path ?? '').split(/[\\/]/).pop() ?? item.workspaceId;
            groups.push({
                key: String(item.workspaceId),
                label: String(label),
                ids
            });
        }
        const loose = [
            ...rows.keys()
        ].filter((id)=>!workspaceOf.has(id));
        if (loose.length > 0) groups.push({
            key: '__loose__',
            label: '',
            ids: loose
        });
        if (groups.length === 0) return [];
        const rank = (id)=>{
            const value = rows.get(id)?.updatedAt;
            return typeof value === 'number' ? value : 0;
        };
        const out = [];
        const multiple = groups.filter((group)=>group.ids.length > 0 && group.label !== '').length > 1;
        for (const group of groups){
            const scoped = new Set(group.ids);
            const children = new Map();
            const roots = [];
            const orphan = new Set();
            for (const id of group.ids){
                const parentId = rows.get(id)?.parentId;
                if (typeof parentId !== 'string' || parentId === id) {
                    roots.push(id);
                    continue;
                }
                if (scoped.has(parentId)) {
                    const bucket = children.get(parentId);
                    if (bucket === undefined) children.set(parentId, [
                        id
                    ]);
                    else bucket.push(id);
                } else {
                    orphan.add(id);
                    roots.push(id);
                }
            }
            const byRank = (left, right)=>rank(right) - rank(left);
            roots.sort(byRank);
            for (const bucket of children.values())bucket.sort(byRank);
            const before = out.length;
            const append = (id, depth)=>{
                const row = rows.get(id);
                if (row === undefined) return;
                const raw = row.title === undefined || row.title === '' ? id : row.title;
                const shown = orphan.has(id) ? Math.max(depth, 1) : depth;
                const title = shown > 0 ? '↳ ' + raw : raw;
                const matched = need === '' || raw.toLowerCase().includes(need) || id.toLowerCase().includes(need);
                const owner = mvViewOwner(id, views, currentViewId);
                if (matched) {
                    out.push({
                        id,
                        title,
                        depth: shown,
                        owner: owner === null ? null : owner.name,
                        onStage: onStage.includes(id)
                    });
                }
                for (const childId of children.get(id) ?? [])append(childId, Math.min(shown + 1, 3));
            };
            for (const id of roots)append(id, 0);
            if (multiple && out.length > before && group.label !== '') {
                out.splice(before, 0, {
                    kind: 'group',
                    id: group.key,
                    title: group.label
                });
            }
        }
        const cap = 240;
        if (out.length > cap) {
            const kept = out.slice(0, cap);
            kept.push({
                kind: 'more',
                id: '__more__',
                remaining: out.length - cap
            });
            return kept;
        }
        return out;
    } catch (error) {
        return [];
    }
}
function MvPanePicker(props) {
    const { onPick, views, currentViewId, onStage } = props;
    const [query, setQuery] = React.useState('');
    const [content, setContent] = React.useState({
        query: '',
        hits: [],
        hasMore: false,
        state: 'idle'
    });
    React.useEffect(()=>{
        const text = String(query ?? '').trim();
        const search = PTX !== null && typeof PTX.sessions?.search === 'function' ? PTX.sessions.search : null;
        if (search === null || text.length < 2) {
            setContent({
                query: text,
                hits: [],
                hasMore: false,
                state: 'idle'
            });
            return undefined;
        }
        let live = true;
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        setContent((current)=>({
                ...current,
                query: text,
                state: 'searching'
            }));
        const timer = setTimeout(()=>{
            Promise.resolve(search(text, controller === null ? undefined : controller.signal)).then((answer)=>{
                if (!live) return;
                const items = answer?.ok === true ? answer.value?.items : Array.isArray(answer?.items) ? answer.items : [];
                setContent({
                    query: text,
                    hits: Array.isArray(items) ? items : [],
                    hasMore: answer?.ok === true ? answer.value?.hasMore === true : answer?.hasMore === true,
                    state: 'ready'
                });
            }).catch(()=>{
                if (live) setContent({
                    query: text,
                    hits: [],
                    hasMore: false,
                    state: 'failed'
                });
            });
        }, 160);
        return ()=>{
            live = false;
            clearTimeout(timer);
            if (controller !== null) controller.abort();
        };
    }, [
        query
    ]);
    const titleRows = mvPickableRows(query, views ?? [], currentViewId ?? null, onStage ?? []);
    const snapshot = (()=>{
        try {
            return PTX === null ? null : PTX.sessions.list.getSnapshot();
        } catch (error) {
            return null;
        }
    })();
    const titleOf = (id)=>{
        const row = snapshot === null ? undefined : snapshot.byId?.[id];
        if (row === undefined || row === null) return null;
        if (row.blank === true) return null;
        return typeof row.title === 'string' && row.title !== '' ? row.title : id;
    };
    const usableHits = (content.hits ?? []).filter((hit)=>titleOf(hit?.sessionId) !== null);
    const rows = usableHits.length === 0 ? titleRows : mvMergeSearchRows(titleRows, usableHits, titleOf, 240);
    const searching = content.state === 'searching' && content.query === String(query ?? '').trim();
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
            if (event.key === 'Escape') {
                if (typeof props.onCancel === 'function') props.onCancel();
                else event.currentTarget.blur();
            }
        }
    }), h('div', {
        className: 'mv-picker-list'
    }, rows.length === 0 ? h('div', {
        className: 'mv-picker-empty'
    }, searching ? T('pickSearching') : query.trim() === '' ? T('pickNone') : T('pickEmpty')) : rows.map((row)=>row.kind === 'group' ? h('div', {
            key: 'group-' + row.id,
            className: 'mv-picker-group',
            role: 'presentation'
        }, row.title) : row.kind === 'more' ? h('div', {
            key: 'more',
            className: 'mv-picker-more',
            'data-remaining': String(row.remaining)
        }, mvFormat(T('pickMore'), {
            count: String(row.remaining)
        })) : h('button', {
            key: row.id,
            type: 'button',
            className: 'mv-picker-item',
            'data-depth': String(row.depth ?? 0),
            'data-owned': row.owner === null || row.owner === undefined ? undefined : 'true',
            disabled: row.owner !== null && row.owner !== undefined,
            style: row.depth === 0 ? undefined : {
                paddingLeft: String(8 + row.depth * 14) + 'px'
            },
            title: row.owner === null || row.owner === undefined ? row.onStage === true ? row.title + ' · ' + T('pickOnStage') : row.title : row.title + ' · ' + T('views') + ': ' + row.owner,
            onClick: ()=>onPick(row.id)
        }, h('span', {
            className: 'mv-picker-title'
        }, row.title), row.owner === null || row.owner === undefined ? row.onStage === true ? h('span', {
            className: 'mv-picker-owner'
        }, T('pickOnStage')) : typeof row.snippet === 'string' && row.snippet !== '' ? h('span', {
            className: 'mv-picker-snippet'
        }, row.snippet) : null : h('span', {
            className: 'mv-picker-owner'
        }, row.owner)))));
}
function mvOpenFileInNative(sessionId, label) {
    try {
        PTX.uiWorkspace.openSession(sessionId);
    } catch (error) {
        console.error('dsh-multiview: switching to the native view failed', error);
        return;
    }
    const attempt = (remaining)=>{
        if (remaining <= 0) return;
        const chips = document.querySelectorAll('button[class*="fileLink"], a[class*="fileLink"]');
        for (const chip of chips){
            if (chip.closest('[data-multiview]') !== null) continue;
            if ((chip.textContent ?? '').trim() !== label) continue;
            chip.click();
            return;
        }
        setTimeout(()=>attempt(remaining - 1), 120);
    };
    setTimeout(()=>attempt(14), 140);
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
        const divider = ref.current;
        const first = divider === null ? null : divider.previousElementSibling;
        const second = divider === null ? null : divider.nextElementSibling;
        let latest = node.ratio;
        const move = (moveEvent)=>{
            latest = mvClampRatio(ratioAt(dir, moveEvent));
            lastRatio.current = latest;
            if (first !== null) first.style.flexGrow = String(latest);
            if (second !== null) second.style.flexGrow = String(1 - latest);
        };
        const stop = ()=>{
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
            setDragging(false);
            if (latest !== node.ratio) onResize(splitId, latest);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
    };
    const onKeyDown = (event)=>{
        const decrease = node.dir === 'row' ? 'ArrowLeft' : 'ArrowUp';
        const increase = node.dir === 'row' ? 'ArrowRight' : 'ArrowDown';
        if (event.key === 'Home' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onResize(node.id, 0.5);
            return;
        }
        if (event.key !== decrease && event.key !== increase) return;
        event.preventDefault();
        const size = event.shiftKey ? 0.05 : 0.02;
        onResize(node.id, node.ratio + (event.key === increase ? size : -size));
    };
    return h('div', {
        ref,
        className: 'mv-divider',
        'data-dir': node.dir,
        'data-divider': node.id,
        'data-dragging': dragging ? 'true' : 'false',
        role: 'separator',
        tabIndex: 0,
        'aria-orientation': node.dir === 'row' ? 'vertical' : 'horizontal',
        'aria-label': T('divider'),
        'aria-valuenow': String(Math.round(node.ratio * 100)),
        'aria-valuemin': '22',
        'aria-valuemax': '78',
        onPointerDown: beginDrag,
        onKeyDown
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
    const removable = sessionId !== null || mvLeaves(state.layout).length > 2;
    return h('div', {
        className: 'mv-pane',
        'data-pane-id': leaf.id,
        'data-pane': '',
        'data-focused': focused ? 'true' : 'false',
        'data-drop': dragging.over === leaf.id && dragging.from !== null && dragging.from !== leaf.id ? 'true' : 'false',
        'data-drag-source': dragging.from === leaf.id ? 'true' : 'false',
        onPointerDownCapture: ()=>surface.onFocus(leaf.id),
        onFocusCapture: ()=>surface.onFocus(leaf.id)
    }, h('div', {
        className: 'mv-head',
        'data-pane-head': ''
    }, dot === 'idle' ? h('span', {
        className: 'mv-dot',
        'data-state': dot,
        'aria-hidden': true
    }) : h('button', {
        type: 'button',
        className: 'mv-dot mv-dot-action',
        'data-state': dot,
        title: mvDotLabel(dot) + ' · ' + mvShortcutHint('KeyJ'),
        'aria-label': mvDotLabel(dot),
        onClick: ()=>surface.onFocus(leaf.id)
    }), h('span', {
        className: 'mv-head-title',
        title: sessionId === null ? T('empty') : title,
        onPointerDown: (event)=>surface.onHeadPointerDown(leaf.id, event)
    }, title), h('div', {
        className: 'mv-head-actions'
    }, sessionId === null ? null : h(MvIconButton, {
        label: maximized ? T('restore') : T('maximize'),
        hint: mvShortcutHint('KeyM'),
        path: maximized ? MV_ICON.restore : MV_ICON.maximize,
        onClick: ()=>surface.onMaximize(leaf.id)
    }), sessionId === null ? null : h(MvIconButton, {
        label: T('paneChange'),
        path: MV_ICON.change,
        onClick: ()=>surface.onRepick(leaf.id)
    }), sessionId === null ? null : h(MvIconButton, {
        label: T('openMain'),
        path: MV_ICON.external,
        onClick: ()=>surface.onOpenMain(sessionId)
    }), removable ? h(MvIconButton, {
        label: T('remove'),
        hint: mvShortcutHint('KeyW'),
        path: MV_ICON.close,
        onClick: ()=>surface.onRemove(leaf.id)
    }) : null)), h('div', {
        className: 'mv-pane-body'
    }, sessionId !== null && surface.repicking === leaf.id ? h(MvPanePicker, {
        onPick: (id)=>{
            surface.onBind(leaf.id, id);
            surface.onRepick(leaf.id);
        },
        onCancel: ()=>surface.onRepick(leaf.id),
        views: surface.state.views,
        currentViewId: surface.state.currentViewId,
        onStage: mvLeaves(surface.state.layout).map((item)=>item.sessionId).filter((id)=>id !== null)
    }) : sessionId === null ? h(MvPanePicker, {
        onPick: (id)=>surface.onBind(leaf.id, id),
        views: surface.state.views,
        currentViewId: surface.state.currentViewId,
        onStage: mvLeaves(surface.state.layout).map((item)=>item.sessionId).filter((id)=>id !== null)
    }) : h(MvPaneHost, {
        sessionId,
        SessionProvider: surface.SessionProvider,
        renderSlot: surface.renderSlot,
        useSessions: surface.useSessions
    })));
}
let mvStatusMirror = null;
function mvStatusSnapshot() {
    return mvStatusMirror;
}
function mvAttentionLeaves(state, statuses) {
    return mvAttentionPanes(state.layout, (sessionId)=>mvDotState(statuses === undefined || statuses === null ? undefined : statuses.get(sessionId)));
}
function mvNextAttention(state, statuses) {
    return mvNextAttentionPane(state.layout, state.focused, (sessionId)=>mvDotState(statuses === undefined || statuses === null ? undefined : statuses.get(sessionId)));
}
const MvPaneHost = React.memo(function MvPaneHost(props) {
    return h(PaneHost, {
        sessionId: props.sessionId,
        SessionProvider: props.SessionProvider,
        renderSlot: props.renderSlot,
        useSessions: props.useSessions
    });
}, (previous, next)=>previous.sessionId === next.sessionId && previous.SessionProvider === next.SessionProvider && previous.renderSlot === next.renderSlot && previous.useSessions === next.useSessions);
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
function useMvUpdate() {
    return React.useSyncExternalStore(mvUpdateSubscribe, mvUpdateGetState, mvUpdateGetState);
}
function mvUpdateCaption(update) {
    if (update.status === 'checking') return T('updateChecking');
    if (update.status === 'installing') return T('updateInstalling');
    if (update.status === 'done') return T('updateDone');
    if (update.status === 'unsupported') return T('updateUnsupported');
    if (update.status === 'error') return update.error ?? T('updateTitleFailed');
    if (update.available === true) return mvFormat(T('updateAvailable'), {
        version: update.latest ?? ''
    });
    if (update.localOnly === true) return T('updateLocal');
    if (update.checkedAt > 0) return mvFormat(T('updateLatest'), {
        version: update.installed ?? MV_PLUGIN_VERSION
    });
    return T('updateIdle');
}
function MvUpdateButton() {
    const update = useMvUpdate();
    const [open, setOpen] = React.useState(false);
    const caption = mvUpdateCaption(update);
    return h(React.Fragment, null, h('button', {
        type: 'button',
        className: 'mv-icon mv-update',
        'data-has-update': update.available === true ? 'true' : 'false',
        'aria-haspopup': 'dialog',
        'data-busy': update.status === 'checking' || update.status === 'installing' ? 'true' : 'false',
        title: caption,
        'aria-label': T('updateCheck'),
        onClick: ()=>{
            setOpen(true);
            const stale = update.checkedAt === 0 || Date.now() - update.checkedAt > MV_UPDATE_STALE || update.status === 'error' || update.status === 'unsupported';
            if (update.available !== true || stale) void mvUpdateCheck(true);
        }
    }, h(MvGlyph, {
        path: update.available === true ? MV_ICON.updateInstall : MV_ICON.updateCheck
    })), open ? h(MvUpdateDialog, {
        update,
        caption,
        onClose: ()=>setOpen(false)
    }) : null);
}
function MvUpdateDialog(props) {
    const { update, caption, onClose } = props;
    const dialogRef = React.useRef(null);
    const returnRef = React.useRef(null);
    React.useEffect(()=>{
        const previous = document.activeElement;
        returnRef.current = previous;
        const dialog = dialogRef.current;
        if (dialog !== null) {
            const first = dialog.querySelector('button:not(:disabled)');
            if (first !== null) first.focus();
            else dialog.focus();
        }
        return ()=>{
            const target = returnRef.current;
            if (target !== null && typeof target.focus === 'function') {
                try {
                    target.focus();
                } catch (error) {}
            }
        };
    }, []);
    const onKeyDown = (event)=>{
        if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
            return;
        }
        if (event.key !== 'Tab') return;
        const dialog = dialogRef.current;
        if (dialog === null) return;
        const focusable = [
            ...dialog.querySelectorAll('button:not(:disabled)')
        ];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
    const busy = update.status === 'installing';
    const checking = update.status === 'checking';
    const failed = update.status === 'error';
    const canInstall = update.available === true && !busy && update.canAutoInstall === true && update.localOnly !== true;
    const title = update.status === 'available' ? mvFormat(T('updateTitleAvailable'), {
        version: update.latest ?? ''
    }) : checking ? T('updateTitleChecking') : failed ? T('updateTitleFailed') : update.status === 'unsupported' ? T('updateTitleUnsupported') : busy ? T('updateTitleInstalling') : update.checkedAt > 0 ? T('updateTitleIdle') : T('updateTitleChecking');
    const body = h('div', {
        className: 'mv-dialog-body'
    }, h('div', {
        className: 'mv-dialog-title'
    }, title), h('div', {
        className: 'mv-dialog-text'
    }, caption), canInstall ? h('div', {
        className: 'mv-dialog-text mv-dialog-hint'
    }, T('updateConfirmHint')) : null, update.available === true && update.canAutoInstall !== true || failed || update.status === 'unsupported' ? h('div', {
        className: 'mv-dialog-text'
    }, T('updateManual')) : null, busy && update.operationState !== null ? h('div', {
        className: 'mv-dialog-text'
    }, String(update.operationState)) : null, update.status === 'done' && update.restartRequired === true && update.restartSupported === true ? h('div', {
        className: 'mv-dialog-text'
    }, T('updateDone')) : null);
    const actions = h('div', {
        className: 'mv-dialog-actions'
    }, canInstall ? h('button', {
        type: 'button',
        className: 'mv-dialog-button',
        onClick: onClose
    }, T('updateLater')) : null, failed ? h('button', {
        type: 'button',
        className: 'mv-dialog-button',
        onClick: ()=>void mvUpdateCheck(true)
    }, T('updateRetry')) : null, h('button', {
        type: 'button',
        className: 'mv-dialog-button mv-dialog-button--primary',
        disabled: busy,
        onClick: canInstall ? ()=>void mvUpdateInstall() : onClose
    }, canInstall ? T('updateInstall') : T('updateClose')));
    return h('div', {
        className: 'mv-dialog-backdrop',
        onClick: (event)=>{
            if (event.target === event.currentTarget) onClose();
        }
    }, h('div', {
        ref: dialogRef,
        className: 'mv-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
        tabIndex: -1,
        onKeyDown
    }, body, actions));
}
function MvRowSplitAction(props) {
    const { sessionId } = props;
    const state = useMvState();
    const holder = mvLeaves(state.layout).find((leaf)=>leaf.sessionId === sessionId);
    const label = holder === undefined ? T('rowActionAdd') : T('rowActionFocus');
    return h('button', {
        type: 'button',
        className: 'mv-row-action',
        'data-active': holder === undefined ? 'false' : 'true',
        title: label,
        'aria-label': label,
        onClick: ()=>mvOpenSessionInSplit(sessionId)
    }, h(MvGlyph, {
        path: MV_ICON.split
    }));
}
function MvRowMenuAction(props) {
    const { sessionId } = props;
    const closeMenu = typeof props.useMenuOpenState === 'function' ? props.useMenuOpenState()[1] : null;
    return h('button', {
        type: 'button',
        role: 'menuitem',
        className: 'mv-menu-row',
        onClick: ()=>{
            mvOpenSessionInSplit(sessionId);
            if (typeof closeMenu === 'function') closeMenu(false);
        }
    }, h(MvGlyph, {
        path: MV_ICON.split
    }), h('span', null, T('rowActionMenu')));
}
function MvViewsRow(props) {
    const { view, active, onApply, onDelete } = props;
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(view.name);
    const open = ()=>{
        setDraft(typeof view.customName === 'string' ? view.customName : view.name);
        setEditing(true);
    };
    const commit = ()=>{
        mvRenameView(view.id, draft);
        setEditing(false);
    };
    if (editing) {
        return h('div', {
            className: 'mv-views-row',
            'data-active': active ? 'true' : 'false'
        }, h('input', {
            className: 'mv-views-input',
            value: draft,
            autoFocus: true,
            'aria-label': T('viewsRename'),
            onChange: (event)=>setDraft(event.target.value),
            onBlur: commit,
            onKeyDown: (event)=>{
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commit();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setEditing(false);
                }
            }
        }));
    }
    return h('div', {
        className: 'mv-views-row',
        'data-active': active ? 'true' : 'false',
        'aria-current': active ? 'true' : undefined
    }, h('button', {
        type: 'button',
        className: 'mv-views-name',
        title: T('viewsHint'),
        onClick: onApply
    }, view.name), h('button', {
        type: 'button',
        className: 'mv-views-del',
        title: T('viewsRename'),
        'aria-label': T('viewsRename'),
        onClick: (event)=>{
            event.stopPropagation();
            open();
        }
    }, '✎'), h('button', {
        type: 'button',
        className: 'mv-views-del',
        title: T('viewsDelete'),
        'aria-label': T('viewsDelete'),
        onClick: (event)=>{
            event.stopPropagation();
            onDelete();
        }
    }, '✕'));
}
function MvViewsButton(props) {
    const { views, currentId } = props;
    const [open, setOpen] = React.useState(false);
    const wrapRef = React.useRef(null);
    React.useEffect(()=>{
        if (!open) return undefined;
        const onKey = (event)=>{
            if (event.key === 'Escape') setOpen(false);
        };
        const onPointer = (event)=>{
            const wrap = wrapRef.current;
            if (wrap !== null && event.target instanceof Node && !wrap.contains(event.target)) setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerdown', onPointer, true);
        return ()=>{
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerdown', onPointer, true);
        };
    }, [
        open
    ]);
    return h('div', {
        className: 'mv-views',
        ref: wrapRef
    }, h('button', {
        type: 'button',
        className: 'mv-icon mv-views-toggle',
        'data-active': open ? 'true' : 'false',
        'data-count': views.length > 0 ? String(views.length) : undefined,
        'aria-expanded': open ? 'true' : 'false',
        'aria-haspopup': 'true',
        title: T('views'),
        'aria-label': T('views'),
        onClick: ()=>setOpen((value)=>!value)
    }, h(MvGlyph, {
        path: MV_ICON.views
    }), views.length > 0 ? h('span', {
        className: 'mv-views-count'
    }, String(views.length)) : null), open ? h('div', {
        className: 'mv-views-pop',
        role: 'group',
        'aria-label': T('views')
    }, views.length === 0 ? h('div', {
        className: 'mv-views-empty'
    }, T('viewsEmpty')) : views.map((view)=>h(MvViewsRow, {
            key: view.id,
            view,
            active: view.id === currentId,
            onApply: ()=>{
                mvApplyView(view.id);
                setOpen(false);
            },
            onDelete: ()=>mvDeleteView(view.id)
        }))) : null);
}
function MultiviewStage(props) {
    const { renderSlot, SessionProvider, useSessions, useSessionStatus } = props;
    const list = useSessions((state)=>state);
    const statuses = useSessionStatus((state)=>state);
    mvStatusMirror = statuses;
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
    const openedRef = React.useRef(false);
    React.useEffect(()=>{
        mvReconcile();
        mvClearArchived();
        if (openedRef.current) return;
        try {
            const snapshot = PTX.sessions.list.getSnapshot();
            if (snapshot.phase !== 'ready') return;
            const current = snapshot.ids.find((id)=>(snapshot.byId[id]?.retainedBy?.mainView ?? 0) > 0);
            openedRef.current = true;
            if (typeof current === 'string') mvOpenForSession(current);
        } catch (error) {
            openedRef.current = true;
        }
    }, [
        list
    ]);
    React.useEffect(()=>{
        mvUpdateHydrate();
        mvUpdateMaybeAutoCheck();
    }, []);
    React.useEffect(()=>{
        const element = rootRef.current;
        if (element === null) return undefined;
        const onClick = (event)=>{
            const target = event.target;
            if (!(target instanceof Element)) return;
            const chip = target.closest('button[class*="fileLink"], a[class*="fileLink"]');
            if (chip === null) return;
            const pane = chip.closest('[data-pane]');
            const leafId = pane === null ? null : pane.getAttribute('data-pane-id');
            const leaf = leafId === null ? null : mvLeafById(mvGetState().layout, leafId);
            const sessionId = leaf === null ? null : leaf.sessionId;
            if (sessionId === null) return;
            event.preventDefault();
            event.stopPropagation();
            mvOpenFileInNative(sessionId, (chip.textContent ?? '').trim());
        };
        element.addEventListener('click', onClick, true);
        return ()=>element.removeEventListener('click', onClick, true);
    }, []);
    React.useEffect(()=>{
        const element = rootRef.current;
        if (element === null || typeof ResizeObserver !== 'function') return undefined;
        let pending = false;
        let last = null;
        let frame = 0;
        const measure = ()=>{
            pending = false;
            const next = element.clientWidth < 900 || element.clientHeight < 520;
            if (next === last) return;
            last = next;
            setNarrow(next);
        };
        const observer = new ResizeObserver(()=>{
            if (pending) return;
            pending = true;
            frame = requestAnimationFrame(measure);
        });
        observer.observe(element);
        return ()=>{
            observer.disconnect();
            if (frame !== 0) cancelAnimationFrame(frame);
        };
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
    const [repicking, setRepicking] = React.useState(null);
    const surface = {
        useSessions,
        state,
        statuses,
        repicking,
        onRepick: (leafId)=>setRepicking((current)=>current === leafId ? null : leafId),
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
    const activeView = state.currentViewId === null || state.currentViewId === undefined ? null : (state.views ?? []).find((view)=>view.id === state.currentViewId) ?? null;
    const currentViewName = activeView === null ? null : String(activeView.name ?? '').trim() || null;
    const body = h('div', {
        className: 'mv-body',
        'data-mv-body': ''
    }, renderMvNode(narrow ? visibleLeaf : maximizedLeaf === null ? state.layout : maximizedLeaf, surface));
    const chips = narrow ? leaves.map((leaf)=>{
        const title = leaf.sessionId === null ? T('empty') : mvTitle(leaf.sessionId) ?? T('empty');
        const dot = leaf.sessionId === null ? 'idle' : mvDotState(statuses.get(leaf.sessionId));
        return h('button', {
            key: 'chip-' + leaf.id,
            type: 'button',
            className: 'mv-chip',
            'data-active': leaf.id === focusedLeaf.id ? 'true' : 'false',
            'data-state': dot,
            title: dot === 'idle' ? title : title + ' — ' + mvDotLabel(dot),
            'aria-label': dot === 'idle' ? title : title + ' — ' + mvDotLabel(dot),
            onClick: ()=>mvFocus(leaf.id)
        }, dot === 'idle' ? null : h('span', {
            className: 'mv-dot',
            'data-state': dot,
            'aria-hidden': true
        }), title.length > 14 ? title.slice(0, 14) + '…' : title);
    }) : [];
    return h('div', {
        ref: rootRef,
        className: 'mv-root',
        'data-multiview': ''
    }, h('header', {
        className: 'mv-bar',
        'data-window-drag': true
    }, h('span', {
        className: 'mv-bar-title',
        title: mvHostTitle()
    }, T('title')), currentViewName === null ? null : h('span', {
        className: 'mv-bar-view',
        title: currentViewName
    }, currentViewName), h('div', {
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
            'aria-pressed': leaves.length === count && maximizedLeaf === null ? 'true' : 'false',
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
    }, T('restore')), h(MvViewsButton, {
        views: state.views ?? [],
        currentId: state.currentViewId ?? null
    }), h(MvUpdateButton, null), h('span', {
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
function mvOpenPanel() {
    try {
        PTX.layout.selectPanel(MV_PANEL_ID);
    } catch (error) {
        console.error('dsh-multiview: selecting the panel failed', error);
    }
}
function mvOpenSessionInSplit(sessionId) {
    const leafId = mvPutInPane(sessionId);
    mvOpenPanel();
    if (leafId !== null) mvFocusComposer(sessionId);
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
    ctx.slots.inject('sidebar.workspaces', function*() {
        yield ctx.slots.inject('sidebar.workspaces.session.row.action', ()=>ctx.slots.register({
                name: 'sidebar.workspaces.session.row.action',
                id: 'multiview',
                order: 150,
                locale: NS
            }, MvRowSplitAction));
        yield ctx.slots.inject('sidebar.workspaces.session.menu.item', ()=>ctx.slots.register({
                name: 'sidebar.workspaces.session.menu.item',
                id: 'multiview',
                order: 150,
                locale: NS
            }, MvRowMenuAction));
    });
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
        id: 'multiview.pane.attention',
        labelKey: 'shortcutAttention',
        code: 'KeyJ',
        run: ()=>{
            const state = mvGetState();
            const next = mvNextAttention(state, mvStatusSnapshot());
            if (next !== null) mvFocusPane(next);
        }
    });
    mvRegisterShortcut(ctx, {
        id: 'multiview.pane.swapNext',
        labelKey: 'shortcutSwapNext',
        code: 'KeyS',
        run: ()=>{
            const state = mvGetState();
            mvSwapWithNeighbour(state.focused, 1);
        }
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
            version: MV_PLUGIN_VERSION,
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
            reconcile: ()=>mvReconcile(),
            clearArchived: ()=>mvClearArchived(),
            neighbour: (leafId, delta)=>mvNeighbour(mvGetState().layout, leafId, delta),
            mainKeys: ()=>(PTX.slots.entries('main') || []).map((entry)=>entry.options.key),
            panelInfo: ()=>PTX.layout.panelInfo.getSnapshot(),
            paneEntries: ()=>(PTX.slots.entries(MV_PANE_SLOT) || []).length,
            open: ()=>PTX.layout.selectPanel(MV_PANEL_ID),
            close: ()=>PTX.layout.selectPanel(null),
            update: ()=>mvUpdateState,
            checkUpdate: (force)=>mvUpdateCheck(force === true),
            workspaces: ()=>PTX.workspaces.list.getSnapshot(),
            openFor: (sessionId)=>mvOpenForSession(sessionId),
            startView: ()=>mvStartView(),
            applyView: (viewId)=>mvApplyView(viewId),
            renameView: (viewId, name)=>mvRenameView(viewId, name),
            deleteView: (viewId)=>mvDeleteView(viewId)
        };
    }
}

    return { inject: MV_INJECT, apply }
  },
})
