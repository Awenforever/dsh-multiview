/**
 * Copy for the multiview surface. Both dictionaries are registered under one
 * namespace so the renderer's `t` seat and the module-level thunk agree.
 */

const NS = 'multiview'
const MV_PANEL_ID = 'multiview'
/** Private child slot declared by this plugin's own `main` entry. */
const MV_PANE_SLOT = 'multiview.pane'
/** Storage key for the persisted stage; versioned so a future shape can migrate. */
const MV_STORAGE_KEY = 'dsh.multiview.v1'
/** This build's version; `scripts/check.mjs` asserts it equals package.json. */
const MV_PLUGIN_VERSION = '0.1.14'

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
  remove: '清空这一格',
  openMain: '在原生视图打开',
  shape: '格数',
  shapeN: '{n} 格',
  running: '运行中',
  waiting: '等待你处理',
  unread: '有新结果',
  views: '视图',
  freezePane: '冻结这一格（停止实时渲染）',
  resumePane: '恢复实时渲染',
  parkedTitle: '已冻结 —— 点此恢复实时渲染',
  parkedHint: '这一格已被你手动冻结；点击恢复实时渲染',
  viewsEmpty: '还没有保存的视图。绑定两个以上会话后会自动记住。',
  viewsCurrent: '当前分屏',
  viewsDelete: '删除视图',
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
  cancel: '取消',
  close: '关闭',
  shortcutFocusPrev: '聚焦上一格',
  shortcutFocusNext: '聚焦下一格',
  shortcutMaximize: '最大化或还原当前格',
  shortcutRemove: '从分屏移除当前格',
}

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
  remove: 'Clear this pane',
  openMain: 'Open in native view',
  shape: 'Pane count',
  shapeN: '{n} panes',
  running: 'Running',
  waiting: 'Waiting for you',
  unread: 'New result',
  views: 'Views',
  freezePane: 'Freeze this pane (stop live rendering)',
  resumePane: 'Resume live rendering',
  parkedTitle: 'Frozen — click to resume live rendering',
  parkedHint: 'You froze this pane; click to resume live rendering',
  viewsEmpty: 'No saved views yet. A split with two or more sessions is remembered automatically.',
  viewsCurrent: 'Current split',
  viewsDelete: 'Delete view',
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
  cancel: 'Cancel',
  close: 'Close',
  shortcutFocusPrev: 'Focus previous pane',
  shortcutFocusNext: 'Focus next pane',
  shortcutMaximize: 'Maximize or restore the current pane',
  shortcutRemove: 'Remove the current pane from the split',
}

/** Plugin context, assigned once in `apply`; components read it at call time. */
let PTX: any = null

/** Translate one key with `{name}` params; replaced by the bound locale face. */
let T: any = function translateFallback(key) {
  return (MV_ZH as any)[key] === undefined ? key : (MV_ZH as any)[key]
}

/** Format a message string without depending on the locale face being ready. */
function mvFormat(template: string, params?: Record<string, unknown>): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    (params as any)[name] === undefined ? match : String((params as any)[name]),
  )
}
