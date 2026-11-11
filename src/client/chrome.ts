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
.mv-strip{display:flex;flex-direction:row;align-items:center;gap:4px;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;flex:0 1 auto}
.mv-strip::-webkit-scrollbar{display:none}
.mv-bar-view{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);padding-left:2px}
.mv-bar-spacer{flex:1;min-width:0}
.mv-seg{display:flex;align-items:center;gap:2px;flex:none}
.mv-chip{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;min-width:24px;padding:0 6px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;cursor:pointer;white-space:nowrap}
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
.mv-pane[data-drop="true"]::after{content:"";position:absolute;inset:0;border:1px solid var(--dsw-alias-state-business-primary);border-radius:8px;pointer-events:none;z-index:5}
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
.mv-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
.mv-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-icon:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.mv-pane-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.mv-note{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:24px;font-size:13px;line-height:20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.mv-note[data-error="true"]{color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 92%, var(--dsw-alias-label-primary))}

.mv-picker{display:flex;flex-direction:column;flex:1;min-height:0;padding:12px}
.mv-picker-search{height:30px;flex:none;margin:0 0 8px;padding:0 10px;border:1px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;outline:none}
.mv-picker-search:focus{border-color:var(--dsw-alias-state-business-primary)}
.mv-picker-search::placeholder{color:var(--dsw-alias-label-secondary);opacity:1}
.mv-picker-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.mv-picker-item{display:flex;flex-direction:row;justify-content:space-between;gap:8px;align-items:center;width:100%;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;font-size:13px;line-height:18px}
.mv-picker-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-picker-item:not([data-depth="0"]){color:var(--dsw-alias-label-secondary);font-size:12px}
.mv-picker-item:not([data-depth="0"]):hover{color:var(--dsw-alias-label-primary)}
.mv-picker-more{padding:6px 8px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.mv-picker-empty{padding:12px 8px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.mv-picker-group{padding:10px 8px 4px;font-size:11px;font-weight:600;letter-spacing:0.02em;color:var(--dsw-alias-label-secondary);text-transform:none}
.mv-views{position:relative;display:inline-flex}
.mv-views-toggle{position:relative}
.mv-views-toggle[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-views-count{position:absolute;top:-3px;right:-4px;min-width:12px;height:12px;padding:0 2px;border:1.5px solid var(--dsw-alias-bg-base);border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:8px;line-height:12px;text-align:center;pointer-events:none}
.mv-views-pop{position:absolute;top:calc(100% + 6px);left:0;z-index:12;min-width:240px;max-width:min(520px, 64vw);max-height:320px;overflow:auto;padding:4px;border:1px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-3)}
.mv-views-empty{padding:10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mv-views-row{display:flex;align-items:center;gap:4px;border-radius:6px}
.mv-views-row[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 2px 0 0 var(--dsw-alias-state-business-primary)}
.mv-views-name{flex:1;min-width:0;padding:6px 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.mv-views-name:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mv-views-input{flex:1;min-width:0;height:26px;margin-right:4px;padding:0 8px;border:1px solid var(--dsw-alias-border-l4);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.mv-views-input:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:0}
.mv-views-del{flex:none;width:22px;height:22px;margin-right:4px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.mv-views-del:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-update{position:relative}
.mv-update[data-has-update="true"]::after{content:"";position:absolute;top:2px;right:2px;width:6px;height:6px;border-radius:999px;background:var(--dsw-alias-state-error-primary)}
.mv-update[data-busy="true"] svg{animation:mv-spin 1s linear infinite}
@keyframes mv-spin{to{transform:rotate(360deg)}}
.mv-dialog-backdrop{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1)}
.mv-dialog{width:min(420px, calc(100vw - 48px));padding:16px;border:1px solid var(--dsw-alias-border-l4);border-radius:12px;background:var(--dsw-alias-bg-layer-3)}
.mv-dialog-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mv-dialog-text{margin-top:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);word-break:break-word}
.mv-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.mv-dialog-button{height:28px;padding:0 12px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
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
.mv-row-action{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:none;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.mv-row-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.mv-row-action[data-active="true"]{color:var(--dsw-alias-state-business-primary)}
.mv-row-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
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
  const { label, path, onClick, hint } = props
  /* The hint goes in the tooltip only: a screen reader should hear the action, not the chord. */
  return h(
    'button',
    {
      type: 'button',
      className: 'mv-icon',
      title: hint === undefined || hint === null || hint === '' ? label : label + ' · ' + hint,
      'aria-label': label,
      onClick,
    },
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
  change: 'M3 6.5h7.5M8 4l2.5 2.5L8 9M13 9.5H5.5M8 7l-2.5 2.5L8 12',
  updateCheck: 'M8 2a6 6 0 1 0 0 12A6 6 0 1 0 8 2zM8 10.7V5.7M5.6 8.1 8 5.6l2.4 2.5',
  updateInstall: 'M3 9.5v3c0 .6.45 1 1 1h8c.55 0 1-.4 1-1v-3M8 2.6v6.2M5.4 6.4 8 9l2.6-2.6',
  pause: 'M6 3.5v9M10 3.5v9',
  play: 'M6 3.6v8.8L12.6 8z',
  views: 'M8 2.2 13.4 5 8 7.8 2.6 5 8 2.2M2.6 8.2 8 11l5.4-2.8M2.6 11.2 8 14l5.4-2.8',
  split: 'M2.6 3.4h10.8v9.2H2.6zM8 3.4v9.2',
}

/**
 * Host version note for the toolbar tooltip.
 *
 * `engines.dsh` no longer fails closed on a newer minor, so an untested host can
 * still run the plugin. This says so instead of pretending the build is verified.
 * @returns the tooltip text, or the plain title when the host is a tested line.
 */
function mvHostTitle(): string {
  const fallback = T('title')
  try {
    const version = (window as any).__DSH_BOOT__?.release?.version
    if (typeof version !== 'string' || version === '') return fallback
    if (/^0\.2\.[12](?![0-9])/.test(version)) return fallback
    return fallback + ' · ' + mvFormat(T('hostUnverified'), { version })
  } catch (error) {
    return fallback
  }
}