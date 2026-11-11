# Scope: who this is for, and what "best" means inside that line

A plugin cannot be best at everything, and a list of features is not a product. This
note fixes the target and the boundary so every later decision has a reference point.

## The user and the situation

**One person watching two to four conversations that are making progress on their own** —
parallel agents, long refactors, a review queue — who wants to stay in one window and
notice the moment a conversation needs them.

That is the situation the plugin was built from, and it is the one it is optimised for.
Everything below is judged against a single question: *does this make watching 2–4 live
conversations better?*

## The boundary

In scope:

- 2–4 panes, each one a genuinely live conversation (composer, streaming, tool cards,
  approvals, slash commands, stop/queue), not a replay or a summary.
- Fast, quiet ways to arrange attention: swap, maximize, resize, saved arrangements.
- Operating it all from the keyboard, with the pointer as an option rather than a
  requirement.
- Never surprising the host: public surfaces where the host offers them, error isolation
  per pane and per panel, no rewriting of host DOM or host services.
- Redrawing correctly in both themes, at any window size the app allows.

Deliberately out of scope (documented in the README as "Not supported in v1"):

- More than four panes, grids, tabs, docking.
- Creating a session inside a pane.
- In-pane file preview and diff review — those live in the right sidebar, which the host
  unmounts while any global panel is active.
- Per-pane view switching (Trajectory and friends).
- Routing a sidebar click into a pane by intercepting navigation. The supported answer is
  the row action: you choose to send a session to the split.

Out of scope is a decision, not a backlog. Adding one of those costs the qualities above,
which is why the four-pane cap survives a market where every competitor offers more panes.

## What "best inside the line" means, concretely

1. **Attention, not pixels.** The job is noticing which conversation wants you. A pane that
   is blocked on an approval or finished unread is reachable in one click or one chord
   (`Mod+Alt+J`), and says so in its header.
2. **Getting a session in without leaving.** A sidebar row action and a matching menu row
   both put a session into the split; an empty pane is filled, a new pane is added under the
   cap, and only a full split replaces the focused pane.
3. **Keyboard parity.** Every arrangement action is reachable without a pointer, including
   the divider (arrows, `Shift` for a coarser step, `Home`/`Enter` to reset).
4. **Restraint.** No title-bar takeover, no injected tabs, no monkey-patched host methods,
   no hidden content. Where the host has a slot, use it; where it does not, do less.

## Where this leaves us against the market

Measured against the five other split-view plugins listed in the marketplace catalogue
(2026-11), this one has the fewest panes and no in-pane preview; it has the safest
integration seam, the only remembered library of named arrangements, and the only
keyboard-complete one. That trade is intentional: the target user is not choosing on pane
count.

An honest one-line summary, used for the marketplace entry:

> 2-4 real Chats in one DSH window: every pane is the shipped Chat, with drag-resize, pane
> swap, rebindable keyboard focus, and remembered splits you can restore.
