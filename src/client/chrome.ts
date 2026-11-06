/**
 * Visual chrome for the stage.
 *
 * The pane body is the shipped Chat, so this file only draws the split frame,
 * the compact pane header, the divider, the picker and the status notes. Colour
 * comes from the same alias tokens the shipped columns use; geometry is
 * hairlines and small radii so the surface reads as frame, not as plugin.
 */

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
.mv-picker-item[data-depth="1"]{color:var(--dsw-alias-label-secondary);font-size:12px}
.mv-picker-item[data-depth="1"]:hover{color:var(--dsw-alias-label-primary)}
.mv-picker-empty{padding:12px 8px;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.mv-views{position:relative;display:inline-flex}
.mv-views-count{margin-left:6px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.mv-views-pop{position:absolute;top:calc(100% + 6px);left:0;z-index:12;min-width:240px;max-width:min(520px, 64vw);max-height:320px;overflow:auto;padding:4px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-base)}
.mv-views-empty{padding:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mv-views-row{display:flex;align-items:center;gap:4px;border-radius:6px}
.mv-views-row[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover)}
.mv-views-name{flex:1;min-width:0;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.mv-views-name:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-views-del{flex:none;width:22px;height:22px;margin-right:4px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;cursor:pointer}
.mv-views-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-update{position:relative}
.mv-update[data-has-update="true"]::after{content:"";position:absolute;top:2px;right:2px;width:6px;height:6px;border-radius:999px;background:var(--dsw-alias-state-error-primary)}
.mv-update[data-busy="true"] svg{animation:mv-spin 1s linear infinite}
@keyframes mv-spin{to{transform:rotate(360deg)}}
.mv-dialog-backdrop{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent)}
.mv-dialog{width:min(420px, calc(100vw - 48px));padding:16px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:12px;background:var(--dsw-alias-bg-base)}
.mv-dialog-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mv-dialog-text{margin-top:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);word-break:break-word}
.mv-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.mv-dialog-button{height:28px;padding:0 12px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.mv-dialog-button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-dialog-button--primary{border-color:transparent;background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-bg-base)}
@media (prefers-reduced-motion: reduce){*{transition:none !important;animation:none !important}}
`

/** One inline glyph; stroke geometry so it inherits `currentColor`. */
function MvGlyph(props) {
  const { path } = props
  return h(
    'svg',
    { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, fill: 'none' },
    h('path', { d: path, stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** Icon button with an accessible name and a native tooltip. */
function MvIconButton(props) {
  const { label, path, onClick } = props
  return h(
    'button',
    { type: 'button', className: 'mv-icon', title: label, 'aria-label': label, onClick },
    h(MvGlyph, { path }),
  )
}

/** Centred status line used by loading, empty, failed and unsupported states. */
function MvNote(props) {
  const { error, children } = props
  return h('div', { className: 'mv-note', 'data-error': error === true ? 'true' : 'false' }, children)
}

/** Inline icon paths, kept together so glyph weight stays consistent. */
const MV_ICON = {
  maximize: 'M3 6V3h3M13 10v3h-3M3 10v3h3M13 6V3h-3',
  restore: 'M6 6H3v3M10 10h3V7M10 6V3h3M6 10H3V7',
  close: 'M4 4l8 8M12 4l-8 8',
  external: 'M6 10L13 3M9 3h4v4',
  refresh: 'M13 8a5 5 0 1 1-1.7-3.8M13 2.6v3h-3',
}
