# 设计备忘 — dsh-multiview

> 面向维护者。产品行为与限制见 `README.zh.md`；验收证据见 `RELEASE_ACCEPTANCE.md`。
> 所有结论都来自 DSH Desktop `0.2.1-rc.5` 的实装源码（`app.asar` 内 `lib/client.js` 与 `lib/types/**`）与本机隔离实例实测，不来自文档推测。

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
- 无会话的格保留 `sessionId: null`，**不左移**；这一点是仓库 `dsh-plugin-workspace-split` 1.2.4 的已知缺陷，本实现刻意避开。
- 持久化 `localStorage['dsh.multiview.v1']`，只存 `{version, layout, focused, preset, seeded}`；拖动时不写，抬指 200ms 后写一次。
- 恢复时 `mvSanitize` 修复结构（未知形状丢弃、比例夹取、重复 pane id 重编、超过 4 格截断），再对 `sessions.list` 对账（消失/归档的会话置空但保位）。

## 4. 交互模型

- **焦点**：任意时刻一个聚焦格；指针按下、`focusin`、快捷键都会更新。快捷键跳格时尝试 `ctx.conversation.input.for(scope).focus()` 把键盘交回该格 composer（不可用则只做视觉聚焦）。
- **分割线**：`pointerdown` 进入拖拽态，之后用 **window 级** `pointermove` 监听（不依赖 pointer capture —— 合成输入下 capture 不可靠，实测会静默失败）。
- **交换**：拖格头标题超过 4px 才进入拖拽；拖动中用 `elementFromPoint().closest('[data-pane]')` 找目标，落点高亮，抬起时交换两个 `sessionId`。
- **最大化**：状态里保留 `maximized`，渲染时只显示该叶子；顶栏出现「还原」。
- **窄窗**：`ResizeObserver` 测舞台尺寸，宽 < 900 或高 < 520 时只渲染聚焦格 + 顶栏格切换器（布局树保持不变）。

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

引擎上界 `<0.3.0` 是有意的 fail-closed：`0.2.2-rc.x` 这类新预发布线会被 semver 拒绝安装，需要显式升版本重新放行。

## 7. 为什么不是 fork

同类实现里 `dsh-plugin-workspace-split` 1.2.4 与本插件装配方式相同，但它是固定 1–3×3 网格、无焦点/最大化、9 套 Chat 无节流、并依赖 `sidebarRight.openResource` 的 monkey-patch；`dsh-split-screen` 1.7.0 未发 npm 且只测到 rc.2；`dsh-split-view` 0.2.7 用 iframe 每格跑一个完整客户端并 shadow `root` 槽（官方 renderer 文档明确禁止 shadow root），且依赖 rc.5 已不存在的包。三者的可复用价值只有"装配方式"，而装配方式已完全掌握，因此从零实现，换取可测试、可审计、体量小（52KB）。

## 8. 明确不做的事与原因

见 `README.zh.md`「明确不支持」。核心是两条原生约束：

1. 任一全局面板激活时右栏会话面会被卸下（`ui-sidebar-right` 的 on-screen session effect），所以格内无法直达文件预览/diff —— 用 ↗ 回原生视图，而不是 monkey-patch。
2. Hero 的工作区选择器属于应用级导航（`uiWorkspace.openSession` → `selectPanel(null)`），所以格内不做新建会话。
