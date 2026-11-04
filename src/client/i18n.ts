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
  unread: '有新结果',
}

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
  unread: 'New result',
}

/** Plugin context, assigned once in `apply`; components read it at call time. */
let PTX = null

/** Translate one key with `{name}` params; replaced by the bound locale face. */
let T = function translateFallback(key) {
  return MV_ZH[key] === undefined ? key : MV_ZH[key]
}

/** Format a message string without depending on the locale face being ready. */
function mvFormat(template, params) {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name]),
  )
}
