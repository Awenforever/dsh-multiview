# Light/dark audit — what was measured, what changed

The split view must look like a feature the app ships with, in **both** themes. This
document records the audit that checked that, the defects it found, and the fixes that
shipped. It also lists what is deliberately left alone, with the reason.

## Method

Six independent audits were run, each with its own method:

| Angle | Method |
|---|---|
| Token contrast | resolved every `--dsw-alias-*` used by the plugin through the host's own light and dark layers, then scored each rule × state with WCAG 2.1 |
| Rule precedence | parsed the stylesheet into rules with specificity and source index, then computed the winning declaration per element and state (29 element families × 88 state rows × 2 themes) |
| Runtime measurement | headless browser, real 2/4-pane scenes, dialog and popover, 728 element/theme measurements, `body[data-ds-dark-theme]` toggling |
| Non-token hazards | `filter`, `opacity`, `transparent`, shadows, UA defaults, and token names that resolve to nothing |
| Accessibility | 16 control types / ≈96 instances: names, roles, state exposure, focus rings in both themes, Tab traces, dialog semantics |
| Surface coverage | every surface × state matrix, looking for states with no rule at all |

Host tokens come from `@deepseek-ai/dsh-client-ui-theme`: the light layer is the `body{…}`
block, the dark layer is `body[data-ds-dark-theme]{…}`. Measured baselines: `#ffffff` ↔
`#151517` for `bg-base`, `#0f1115` ↔ `#f9fafb` for `label-primary`.

## What was wrong

| # | Defect | Light | Dark |
|---|---|---|---|
| 1 | Pane header title, chips, notes, picker groups/empty rows, views delete used `label-tertiary` | **3.71:1** — below AA | 8.54:1 |
| 2 | Update-dialog primary button label | **4.23:1** — below AA | 7.83:1 |
| 3 | Picker search placeholder used the browser default `#757575` | 4.61:1 | **3.41:1** — below AA |
| 4 | Waiting/unread status dots (their tokens are theme-invariant) | **2.15 / 2.28:1** — below the 3:1 non-text bar | 8.49 / 8.00:1 |
| 5 | Dialog and popover sat on `bg-base`, i.e. the same surface as the page | border carried it | **1.00:1** — no separation |
| 6 | Modal scrim mixed from `label-primary`, which is near-white in dark | dimmed correctly | **lightened** the page |

No text/background pair was below 1.5:1 in either theme: nothing was invisible. The
failures were AA-level contrast and surface separation.

## What changed

- Content text moved from `label-tertiary` to `label-secondary` (**5.8:1 light / 12.11:1 dark**).
  The plugin no longer uses `label-tertiary`.
- The dialog's primary button uses `color-mix(in srgb, var(--dsw-alias-state-business-primary) 88%,
  var(--dsw-alias-label-primary))` (**5.09:1 light / 8.72:1 dark**), with an 80/20 mix on hover.
  An earlier attempt used two `inset 0 0 0 100px` overlays; that only fills boxes up to 200 px
  wide and baked the hover token into the resting state, so it was replaced.
- The picker search declares `::placeholder` with `label-secondary`.
- Status dots in light are trimmed with `filter: brightness(0.75)` — applied only to `waiting`
  and `unread` (**3.7 / 3.91:1**), so the idle dot keeps the colour the host designed for it.
- The dialog and popover use `bg-layer-2`; the modal scrim uses the host's own
  `--dsw-alias-bg-mask-1` token rather than a mix.

## Elevation, measured

The host does provide a surface ladder. Values are identical in light (the light theme
separates surfaces with hairlines, not steps) and differ in dark:

| token | light | dark | contrast vs `bg-base` (dark) |
|---|---|---|---|
| `bg-base` | `#ffffff` | `#151517` | — |
| `bg-layer-1` | `#ffffff` | `#232324` | 1.16:1 |
| `bg-layer-2` | `#ffffff` | `#2c2c2e` | 1.31:1 |
| `bg-layer-3` | `#ffffff` | `#353638` | 1.51:1 |
| `bg-mask-1` | `#0000003d` | `#00000080` | scrim |

Consequence worth stating plainly: **in dark, no token-only combination reaches the 3:1
boundary contrast** that a light theme gets from a dark scrim (light scrim delta 1.78:1).
`bg-layer-2` on top of the scrimmed page reaches 1.42:1. Going further would need a colour
literal, which this plugin forbids itself from using.

## Deliberately not changed

- **Pane divider at rest** measures 1.32:1 light / 1.61:1 dark. It is a decorative separator,
  not a bordered control; its affordance is the hover/drag state, which paints
  `state-business-primary`. It is now also focusable and keyboard-adjustable, so the
  affordance no longer depends on colour alone.
- **Disabled rows** (`opacity: .45`) drop below AA. WCAG exempts inactive controls from
  contrast minimums, and the dimming is what communicates "disabled"; the row also carries
  `cursor: not-allowed` and a `data-owned` badge.
- **Light theme has no surface steps** — every `bg-layer-*` is `#ffffff`. That is the host's
  design, not a plugin choice, so dialog and popover rely on border plus scrim in light.

## Accessibility fixes that came out of the same audit

- The update dialog is a real modal: `aria-modal`, focus moves in on open, Tab is contained,
  Escape closes, and focus returns to the trigger.
- The divider is operable from the keyboard: `tabIndex`, `aria-valuenow/min/max`, `aria-label`,
  and arrow keys move the boundary by 2 %.
- The views popover closes on Escape and on an outside pointer press, and exposes
  `aria-expanded` / `aria-haspopup`.
- Shape chips expose `aria-pressed`; the update button exposes `aria-haspopup="dialog"`.
- A disabled owned child row no longer brightens its label on hover (a specificity tie that
  the precedence audit found).

## Reproducing

The harness lives in `.dev/audit/`: `self-contrast.mjs` (static, token-resolved, resolves
`color-mix`), `self-runtime.mjs` (browser, both themes), `drive.mjs` (CDP driver), plus each
audit agent's own report and screenshots under `.dev/audit/<angle>/`.
