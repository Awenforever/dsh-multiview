# Light/dark audit — what was measured, what changed

The split view must look like a feature the app ships with, in **both** themes. This
document records the audit that checked that, the defects it found, and the fixes that
shipped in 0.1.20. It also lists what is deliberately left alone, with the reason.

## Method

Six independent audits were run against `0.1.19`, each with its own method:

| Angle | Method |
|---|---|
| Token contrast | resolved every `--dsw-alias-*` used by the plugin through the host's own light and dark layers, then scored each rule × state with WCAG 2.1 |
| Rule precedence | parsed the stylesheet into rules with specificity and source index, then computed the winning declaration per element and state |
| Runtime measurement | headless browser, real 2/4-pane scenes, dialog and popover, 728 element/theme measurements, `body[data-ds-dark-theme]` toggling |
| Non-token hazards | `filter`, `opacity`, `transparent`, shadows, UA defaults, and token names that resolve to nothing |
| Accessibility | focus rings, tab order, dialog semantics, state exposure |
| Surface coverage | every surface × state matrix, looking for states with no rule at all |

The host tokens come from `@deepseek-ai/dsh-client-ui-theme`; the light layer is the
`body{…}` block and the dark layer is `body[data-ds-dark-theme]{…}` in the same bundle.
Measured baselines: `#ffffff` ↔ `#151517` for `--dsw-alias-bg-base`, `#0f1115` ↔ `#f9fafb`
for `--dsw-alias-label-primary`.

## What was wrong

| # | Defect | Light | Dark |
|---|---|---|---|
| 1 | Pane header title, chips, notes, picker groups/empty rows, views delete used `label-tertiary` | **3.71:1** — below AA | 8.54:1 |
| 2 | Update-dialog primary button label (`bg-base` on `business-primary`) | **4.23:1** — below AA | 7.83:1 |
| 3 | Picker search placeholder used the browser default `#757575` | 4.61:1 | **3.41:1** — below AA |
| 4 | Waiting/unread status dots (amber/green tokens are theme-invariant) | **2.15 / 2.28:1** — below the 3:1 non-text bar | 8.49 / 8.00:1 |
| 5 | Dialog and saved-views popover sat on `bg-base`, i.e. the same surface as the page | visible (white on white is impossible, but the border carried it) | **1.00:1** — no surface separation |
| 6 | Modal scrim was mixed from `label-primary`, which is near-white in dark | dims correctly | **lightens** the page `#151517 → #474749` |

No text/background pair anywhere in either theme was below 1.5:1: nothing was
invisible. The failures above are AA-level contrast and surface separation.

## What changed

- Content text moved from `label-tertiary` to `label-secondary` (**5.8:1 light / 12.11:1 dark**).
  The plugin no longer uses `label-tertiary` at all.
- The primary dialog button gets two `inset` layers of `interactive-bg-hover`, which darkens its
  blue in light and lightens it in dark: **4.79:1 light / 9:1 dark**, verified by sampling
  rendered pixels (`rgb(142,183,255)` in dark, exactly as predicted). This keeps the palette
  token-based: no colour literals were introduced.
- The picker search declares `::placeholder` with `label-secondary`.
- Status dots in light are trimmed with `filter: brightness(0.75)` (**3.7 / 3.91:1**); dark is
  untouched.
- Dialog and popover surfaces use `bg-layer-1` (dark `#232324`, light unchanged at `#ffffff`).
- In dark the scrim mixes `bg-base` instead of `label-primary`, so the page is no longer
  lightened; the raised dialog carries the separation instead.

## Deliberately not changed

- **Pane divider at rest** measures 1.32:1 light / 1.61:1 dark. It is a decorative separator
  between panes, not a control with a visible border; its affordance is the hover and drag
  state, which paints `state-business-primary`. Forcing a 1 px rule to 3:1 would draw a heavy
  grid that the host never draws.
- **Dark elevation is bounded by the token set.** `bg-layer-1` is only 1.16:1 against
  `bg-base` in dark, and the dark layer offers no darker-than-base surface and no shadow
  token, so a popover cannot reach the 3:1 boundary contrast the other theme reaches. This is
  an upstream theme limitation, not something a plugin can fix without colour literals.

## Reproducing

The measurement harness lives in the repository's `.dev/audit/` directory: `self-contrast.mjs`
(static, token-resolved), `self-runtime.mjs` (browser, both themes), `drive.mjs` (the CDP
driver), and the audit agents' own reports and screenshots under `.dev/audit/<angle>/`.
