# Proposal: a rendering-priority hint for embedded conversations

## Summary

DeepSeek Harness can host several conversations at once (this plugin does it with 2–4 panes),
but the shipped chat has no way to tell it "this transcript is in the background". Every pane
pays the full per-chunk cost, so four panes that stream at the same time drop to roughly 14–28 fps
on a modest machine even though the plugin's own code accounts for 0.6 % of the profile.

The ask is small and backwards compatible: let the *host* declare a rendering priority for the
conversation it embeds, and let the chat use it to coalesce work. Nothing about the visual
result changes — text still appears, panes still scroll, only the *cadence* is allowed to be lower.

## Evidence

Measured on Windows 11 (DSH Desktop 0.2.2-rc.1, Electron renderer, 1530×851), 4 panes bound to
4 sessions, all four streaming a long answer, 60 s window:

| scenario | fps | p50 | p95 | long tasks |
|---|---|---|---|---|
| 4 panes, 4 streams | 24.4 | 19.3 ms | 140 ms | 55 |
| 4 panes, static content, scripted scroll | 58.5 | 15.8 ms | 26 ms | 0 |

A 12 s CPU profile during the streaming case, grouped by self time of the sampled nodes:

| bucket | share |
|---|---|
| `(program)` — layout, paint, composite, GC | 75.5 % |
| app shell (React scheduler, store dispatch) | 18.0 % |
| `@deepseek-ai/dsh-client-ui-chat` + `ui-conversation` (`renderEntry`, `ConversationContent`, `onScroll`, `scrollMetrics`) | 5.9 % |
| the multiview plugin itself | 0.6 % |

Two things follow. First, the plug-in side is not the problem and cannot fix it. Second, the cost
is dominated by *layout and paint of a growing transcript*, which is exactly what a host can
influence — but only the chat knows how to coalesce it.

The transcript virtualizer is already well configured (`directDomUpdates: true`,
`useScrollendEvent: true`, `overscan: 3`), so the remaining per-chunk work is the growing turn
itself: the streaming turn's height changes on almost every chunk, which invalidates layout for
that turn and re-runs the offset bookkeeping (`scrollMetrics` showed up as 352 ms of self time in
one 14 s profile — about 2.5 % of sampled time, in a run where four panes were streaming).

## Proposal

Add an optional field to the existing `conversation.content` factory props, next to
`variant: 'embedded'` and `phase`:

```ts
{ variant: 'embedded', phase, hero, priority?: 'foreground' | 'background' }
```

Semantics, all opt-in and invisible when omitted:

- `foreground` (default) — today's behaviour.
- `background` — the chat may coalesce renders: commit at most once per animation frame *or* per
  a small interval (e.g. 100–250 ms), whichever the implementation prefers, and skip intermediate
  markdown re-parses. The transcript stays mounted, keeps its scroll anchoring, and still shows
  the growing text — it simply updates in slightly larger steps.

The host already knows which panes are focused; a plugin can pass `background` for the rest and
switch a pane to `foreground` the instant it gains focus. That gives every host (multiview,
future tiled layouts, embedded previews) the same lever without any of them touching chat internals.

Optional extras that would help equally and are cheap to reason about:

1. Coalescing inside the chat itself, independent of any host: batch chunk-driven re-renders per
   animation frame. Four panes would still cost four renders per frame, but not four per token.
2. `content-visibility: auto` (or `contain: content`) on *messages* rather than turns, so messages
   scrolled out of the local pane viewport skip layout entirely. Our measurement of
   `contain: strict` on the pane container showed no gain (59.2 vs 58.5 fps — noise), so the useful
   granularity is the message, not the pane.

## What this does not fix

Anything that forces a full layout of a huge turn remains linear in turn size; four panes of very
long answers will stay heavier than one. The proposal reduces *how often* that happens, not the
per-occurrence cost.

## Reproduction

The multiview plugin is public: <https://github.com/Awenforever/dsh-multiview> (npm `dsh-multiview`).
Open two or more panes, bind four sessions, send a long-form prompt to all four at once, and sample
`requestAnimationFrame` intervals plus `PerformanceObserver({ type: 'longtask' })`.
