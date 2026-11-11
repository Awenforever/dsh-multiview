# 设计备忘 — dsh-multiview

> 面向维护者。产品行为与限制见 `README.zh.md`；验收证据见 `RELEASE_ACCEPTANCE.md`。
> 结论来自三处，优先级从高到低：**宿主自带的 Inspect Provider**（`cordis_inspect_query`，直接读实时的 Service/Event/Slot/Theme 契约）、`app.asar` 内实装源码（`lib/client.js` 与 `lib/types/**`）、隔离实例实测。已核对 `0.2.1-rc.5` 与 `0.2.2-rc.1` 两版；凡只有源码出处、没有运行时验证的结论，正文会单独标注。

## 1. 一句话架构

```
main[key='multiview']                     ← 自己注册的全局面板（keyed）
  └─ 私有子槽 multiview.pane              ← 自己声明、别人看不见
       └─ PaneHost: sessions.retain(id,{source:'multiview'})
            └─ <SessionProvider session={reference}>      ← 框架标准座位
                 └─ PaneConversation → renderFactorySlot('conversation.content',
                        {variant:'embedded', phase, hero}, {slots:{views: FixedChatView}})
                        └─ renderSlot('conversation.session', {view:'chat'})
```

- **每格一个真实 Session 绑定**：`retain` 返回 `SessionReference`，交给 `SessionProvider`，于是格内所有 session 域插槽（`conversation.session`、`conversation.composer` 链、审批/提问接管）都解析到**这一格**的会话，而不是应用级"当前会话"。
- **不复制 Chat**：`conversation.content` factory 的 `embedded` 变体是官方给"宿主嵌入"准备的路径，自带 `embeddedBody` 样式（内容宽 `min(100% - 32px, 920px)`）。
- **不 shadow 任何自带条目**：面板是 `main` 的**自有 key**，原生 `conversation` 面板原封不动；离开面板即回到原生会话。

## 2. 关键不变量

1. **一个会话只能出现在一格**：`InputHub.shellFor(binding)` 对每个绑定只有一份 composer shell，同一会话进两格会出现两个编辑器抢同一个 shell。模型层 `mvWithSession` 在绑定时自动从其他格清除。
2. **格内 composer 的可用性由会话自身决定**：continuable subagent 且父会话离线时，原生 composer 显示"父会话已离线，无法继续发送"——这是原生行为，插件不覆盖。
3. **面板入口晚于面板注册**：侧栏图标在 `main` 注册回调内部注册（`ctx.slots.inject('main', function* () { … yield inject('sidebar.panellist', …) })`），保证图标出现时 `selectPanel('multiview')` 不会抛。
4. **布局树纯函数化**：`model.ts` 不依赖 React/DOM/slot，全部可单测；`store.ts` 负责持久化与订阅；`stage.ts` 只做渲染与手势。
5. **失败按格隔离**：格级 React 错误边界 + 面板级边界 + 数据级（解析/对账）回落，任何一格崩都不abdicate整个 `main` 条目。

## 3. 数据模型

```ts
type Leaf  = { kind:'leaf';  id: string; sessionId: string | null }
type Split = { kind:'split'; id: string; dir:'row'|'col'; ratio: number; a: Node; b: Node }
```

- 预置三种形状：2 = 左右等分；3 = 左大列 + 右侧上下两格；4 = 2×2。
- `ratio` 夹在 `[0.22, 0.78]`，避免拖出无法使用的窄条。
- 无会话的格保留 `sessionId: null`，**不左移**：位置稳定，用户放回会话时不需要重新找格。（早期版本在这里写"这是某竞品的已知缺陷"，但 2026-11-10 的评估没有核实该说法，属于不该有的断言，已删除——我们只描述自己的选择。）
- 持久化 `localStorage['dsh.multiview.v1']`，存 `{version: 3, layout, focused, preset, seeded, views, currentViewId}`；拖动时不写，抬指 200ms 后写一次。
- 恢复时 `mvSanitize` 修复结构（未知形状丢弃、比例夹取、重复 pane id 重编、超过 4 格截断），再对 `sessions.list` 对账（消失/归档的会话置空但保位）；`views` 经 `mvDedupeViews` 归一（同一编排只留一条，见 §5）。

## 4. 交互模型

- **焦点**：任意时刻一个聚焦格；指针按下、`focusin`、快捷键都会更新。快捷键跳格时尝试 `ctx.conversation.input.for(scope).focus()` 把键盘交回该格 composer（不可用则只做视觉聚焦）。
- **分割线**：`pointerdown` 进入拖拽态，之后用 **window 级** `pointermove` 监听（不依赖 pointer capture —— 合成输入下 capture 不可靠，实测会静默失败）。分割线本身可聚焦：`←/→`（或 `↑/↓`）2%，`Shift` 5%，`Home`/`Enter`/`Space` 复位，`aria-valuenow` 同步。
- **交换**：拖格头标题超过 4px 才进入拖拽；拖动中用 `elementFromPoint().closest('[data-pane]')` 找目标，落点高亮，抬起时交换两个 `sessionId`。键盘等价操作 `Mod+Alt+S` 与阅读顺序中的下一格交换，走同一个 `mvSwapLeaves`。
- **最大化**：状态里保留 `maximized`，渲染时只显示该叶子；顶栏出现「还原」。
- **注意力**：`waiting`（等待回答/审批）与 `unread`（完成未读）算「需要你」，**`running` 不算**（产品口径，2026-11-11 定案）。规则在 `model.ts` 的 `mvAttentionPanes`/`mvNextAttentionPane`，有单测与变异验证；格头状态点是按钮，`Mod+Alt+J` 跳到下一个。
- **窄窗**：`ResizeObserver` 测舞台尺寸，宽 < 900 或高 < 520 时只渲染聚焦格 + 顶栏格切换器（布局树保持不变）；切换器按格显示状态点（运行中/等待/未读），因为此时它是其余格唯一的可视入口。

## 5. 视觉规范

- 只画"框架"：0.5px 发丝分割线（`--dsw-alias-border-l3`，与原生列边框同值）、34px 格头、舞台顶栏兼窗口拖拽区（`data-window-drag`）。
- 颜色全部走主题 alias token；`scripts/check.mjs` 禁止样式里出现硬编码十六进制/rgb。
- 动效只用原生已有的两个 token（`--ds-ease-in-out`、`--ds-transition-duration-slow`）；悬停/聚焦瞬时变化，不发明曲线；`prefers-reduced-motion` 下全关。
- 格本身没有背景、阴影、圆角——与"自带列"一致，避免插件感。

## 6. 兼容层

`compat.ts` 是唯一接触非正式稳定面的地方，全部探测后降级：

| 接触点 | 处理 |
|---|---|
| `ctx.conversation.input.for(scope).focus()` | 非 Client Service 目录内；`typeof` 探测失败即退回视觉聚焦 |
| `sessions.retain(id,{source:'multiview'})` | 运行时接受自定义 source（类型面未声明）；失败按格错误处理 |
| `conversation.content` factory 缺失（未来版本） | `renderFactorySlot` 的 `fallback` 渲染"当前 DSH 版本不支持"提示；面板仍可打开但格内不空白 |
| 快捷键默认键 | 注册失败（reserved/conflict）→ 以**无默认绑定**重注册，命令仍可自绑；Web 端一开始就不给默认 |
| `uiWorkspace.openSession` | 存在性探测；没有就隐藏 ↗ 按钮 |

引擎范围是**逐条列出**而不是靠上界兜底：`>=0.2.1-rc.5 <0.2.2-0 || >=0.2.2-rc.1 <0.2.3-0 || >=0.2.3-rc.1 <0.3.0-0`。早期版本只写 `>=0.2.1-rc.5 <0.3.0`，而 semver 规定预发布版本只能被"同一元组上也带预发布"的比较器匹配，于是 `0.2.2-rc.1` 会被静默拒绝安装（0.1.16 的真实回归）。`scripts/check.mjs` 现在用语义断言守住这条：必须接受 `0.2.1-rc.5`/`0.2.2-rc.1`/`0.2.2`，必须拒绝 `0.3.0-rc.1`/`0.3.0`/`0.1.9`。新预发布线仍然要显式加一条，但漏加会被测试挡下，而不是靠 fail-closed 伪装成"有意为之"。

## 7. 为什么不是 fork

装配方式（`main` keyed 面板 + 私有子槽 + `SessionProvider` + `conversation.content` 的 `embedded` 变体）在数家实现里是相同的，我们已完全掌握，所以从零实现，换取可测试、可审计、体量可控（客户端 bundle 约 105KB，零第三方依赖）。

**这一节以前的版本写错过对手。** 原稿称 `dsh-split-view` 用 iframe 跑整客户端、`dsh-split-workspace` 是固定 1–3×3 网格且无焦点/最大化；按 2026-11-10 的有据评估（`.dev/market/eval/capability/matrix.json`，逐项追到源码行），iframe 路线属于 `ai-eks`，`mhlywxl` 是不限量自动网格。批评别人时用错材料，比不批评更糟，因此改为只写评估里核实过的部分：

- 我们比它们强的地方：一侧栏投放走公开列表插槽（`replaceRisk: none`），不拦导航；键盘层完整（6 条命令 + 分隔线可聚焦）；命名布局库与去重；注意力路由（等待/未读，不含运行中）。
- 我们比它们弱的地方，且短期内不会补：格数上限 4（`mhlywxl` 不限量、`byf1999` 1–3 列×1–3 行、`ai-eks` 停靠布局）；无格内文件预览/diff（`byf1999` 有）；无格内新建会话（3 家支持）；无自由拖拽重排（`mhlywxl` 有，我们只有两格交换）。
- 这些取舍写在 `docs/SCOPE.md`：目标场景是"同一窗口盯 2–4 个自行推进的对话"，格数与预览不是这个场景的瓶颈。

## 8. 明确不做的事与原因

见 `README.zh.md`「明确不支持」。核心是两条原生约束：

1. 任一全局面板激活时右栏会话面会被卸下（`ui-sidebar-right` 的 on-screen session effect），所以格内无法直达文件预览/diff —— 用 ↗ 回原生视图，而不是 monkey-patch。
2. Hero 的工作区选择器属于应用级导航（`uiWorkspace.openSession` → `selectPanel(null)`），所以格内不做新建会话。


## Contracts verified against host source

Every host API this plugin reads was an assumption until it was checked against the shipped code.
The host ships as an Electron `asar` archive; its JavaScript can be read directly (8-byte header,
then a pickle-framed JSON index), which is how each row below was confirmed.

| Contract | Where it is used | Verified shape |
|---|---|---|
| Session status | attention rule, dots, badge | `{ running: boolean\|undefined, pendingInteraction: object\|undefined, completionUnread: boolean }` from `publishStatus` in `@deepseek-ai/dsh-client-ui-session` |
| Session list row | titles, picker tree, ordering, seeding | `ids` + `byId[id]` with `title`, `blank`, `updatedAt`, `parentId`, `retainedBy.mainView` (`@deepseek-ai/dsh-api-session-controller`) |
| Workspace snapshot | picker grouping, archive detection | `workspaces.list.getSnapshot()` → `{ items, pinnedSessionIds, archivedSessionIds }` (`@deepseek-ai/dsh-client-ui-workspace`) |
| Retention count | "is this the main view" | `retainedBy.mainView` is the count the host itself tests (`(retainedBy.mainView ?? 0) > 0`) |

Two consequences worth keeping:

- `archivedSessionIds` arrives **with** the snapshot; before the first snapshot it may be absent, so
  the archive test is `Array.isArray(...) && includes(...)`, and "unknown" means "not archived".
- The picker's parent/child nesting and recency ordering depend on `parentId` and `updatedAt`; if the
  host ever renamed either, the picker would silently flatten instead of failing.

## Session status contract (verified against host source)

The attention rule reads `useSessionStatus`, whose entries the host builds in
`@deepseek-ai/dsh-client-ui-session` (`publishStatus`):

```js
next.set(id, {
  running: this.running.get(id),              // boolean | undefined
  pendingInteraction: this.pendingSnapshot.get(id), // interaction object | undefined
  completionUnread: this.completionUnread.has(id)   // boolean
})
```

Consequences this plugin relies on:

- **`pendingInteraction` is an object, not a flag.** Testing it for truthiness is right; testing
  "is not undefined" additionally treats `null` as a pending interaction, so both nullish kinds are
  excluded.
- **A waiting session is also running**, which is why `waiting` is classified before `running`.
- **The host already excludes the main view** from `completionUnread` (`!this.isMain(sessionId)`), so
  a conversation being watched natively is not reported as unread here — panes are retained
  references, not the main view.

The fake host in `test/harness.mjs` uses these same shapes; the audit above is what keeps the
fixtures from being a restatement of my own guesses.
