# Two theme-token gaps that keep plugin overlays below 3:1

I maintain a split-view plugin for DSH (`dsh-multiview`) and recently took it through a
light/dark contrast audit. Everything the plugin draws is expressed with the shipped
`--dsw-alias-*` tokens, and it deliberately never uses colour literals. Two gaps in the
token set mean a plugin **cannot** meet WCAG 1.4.11 (non-text contrast, 3:1) for raised
surfaces, no matter how it combines the tokens. Both are reported here with measured
values so you can decide whether they are design intent or oversights.

Everything below was read out of `@deepseek-ai/dsh-client-ui-theme` `lib/client.js` in DSH
`0.2.2-rc.1`. Light = the `body{…}` alias layer, dark = `body[data-ds-dark-theme]{…}`.
Ratios are WCAG 2.1 computed from the resolved hex values.

---

## Gap 1 — there is no light-theme surface step, and the dark ladder tops out at 1.51:1

The surface ladder resolves like this:

| token | light | dark | contrast vs `bg-base` (dark) |
|---|---|---|---|
| `--dsw-alias-bg-base` | `#ffffff` | `#151517` | — |
| `--dsw-alias-bg-layer-1` | `#ffffff` | `#232324` | 1.16:1 |
| `--dsw-alias-bg-layer-2` | `#ffffff` | `#2c2c2e` | 1.31:1 |
| `--dsw-alias-bg-layer-3` | `#ffffff` | `#353638` | 1.51:1 |

In light the three layer tokens are **identical to the page**, so a raised surface
(dialog, popover, dropdown, toast) can only be distinguished by a hairline:

| token | light vs white | dark vs `#151517` |
|---|---|---|
| `--dsw-alias-border-l3` | 1.32:1 | 1.63:1 |
| `--dsw-alias-border-l4` | 1.45:1 | 1.87:1 |

Taking the strongest tokens available — `bg-layer-3` for the surface, `border-l4` for the
edge, and `bg-mask-1` for the scrim behind it — a modal dialog reaches only:

| | light | dark |
|---|---|---|
| dialog surface vs scrimmed page | **1.78:1** | **1.64:1** |

That is the ceiling; there is no combination of existing tokens that gets higher. A
stronger mask (`bg-mask-3`, `bg-mask-photo`) would raise the number only by darkening the
page far beyond what a normal modal scrim does, which is a redesign rather than a token
choice.

**There is also no elevation recipe.** The only shadow-named alias is
`--dsw-alias-illustration-shadow`, and it is a solid colour (`#edf0f4` light / `#43454a`
dark), not a `box-shadow` value, so it cannot be used to lift a surface. I grepped the
whole alias layer: there is no `bg-layer-4` and no shadow token family.

### What would fix it

Either would be enough:

1. A light-theme surface step (or two) that is actually darker than `#ffffff` — e.g.
   `bg-layer-1..3` mapping to something like `#fafafa` / `#f4f5f6` / `#eceef0`, mirroring how
   the dark ladder already steps — and dark steps that reach ~3:1 for the topmost layer
   (`bg-layer-3` would need to be around `#4a4b4e` against `#151517`).
2. Or a documented elevation recipe token, e.g.
   `--dsw-alias-shadow-overlay: 0 8px 24px #0000001f` per theme, so a plugin can raise a
   surface without a literal.

---

## Gap 2 — `state-business-secondary` is missing from an otherwise complete family

The semantic state family is nearly symmetric, with one hole:

- `state-success-primary` / `-secondary` / `-tertiary` ✅
- `state-warn-primary` / `-secondary` / `-tertiary` ✅ (plus `warn-label`)
- `state-error-primary` / `-secondary` ✅
- `state-business-primary` ✅ / **`state-business-secondary` ❌ missing** / `state-business-tertiary` ✅

Full list as shipped: `business-primary, business-tertiary, done-primary, error-primary,
error-secondary, idle-primary, success-primary, success-secondary, success-tertiary,
warn-label, warn-primary, warn-secondary, warn-tertiary`.

Why this bites: a plugin that follows the naming convention writes
`color: var(--dsw-alias-state-business-secondary)`. An undefined custom property does not
throw — the declaration is simply invalid at computed-value time, so the element silently
keeps its inherited colour. During my audit this is exactly the kind of thing that
produced an invisible control that no error report pointed at.

### What would fix it

Add `--dsw-alias-state-business-secondary` (the natural value would sit between
`business-primary` `#4176e6`/`#7aaaff` and `business-tertiary` `#e4edfd`/`#34415b`), or
document the family contract so authors know `business` intentionally has only two steps.

---

## Context on my side

- The plugin is public: <https://github.com/Awenforever/dsh-multiview>. After the audit it
  uses `bg-layer-3` + `border-l4` + `bg-mask-1` and reaches the ceilings quoted above.
- It has a `check.mjs` guard that bans colour literals in the shipped bundle, and **it also
  never validates token names against the theme** — which is how the missing
  `state-business-secondary` class of bug gets past it. If the theme exposed a stable,
  machine-readable token list at build time, a plugin could fail its own build on an
  unknown name; that would be a third, smaller ask.
- A related, separate proposal about per-chunk rendering cost in multi-pane layouts is in
  <https://github.com/deepseek-ai/deepseek-harness/discussions/12559>.
