/**
 * Visual chrome for the stage.
 *
 * Deliberately thin: the pane body is the shipped Chat, so this file only draws
 * the split frame, the compact pane header and the notes. Colours come from the
 * same alias tokens the shipped columns use, geometry from hairlines.
 */

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
`

/** One inline glyph; kept to stroke geometry so it inherits `currentColor`. */
function MvGlyph(props) {
  const { path } = props
  return h(
    'svg',
    { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, fill: 'none' },
    h('path', { d: path, stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** Icon button with an accessible name and no tooltip dependency. */
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
