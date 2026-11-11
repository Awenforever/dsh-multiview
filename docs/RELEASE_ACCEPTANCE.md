# dsh-multiview — 验收证据
> 适用于 **0.1.15**：分屏只有一种渲染行为——所有格始终实时渲染、始终可见；此前的性能模式/渲染预算/智能档轮换/手动冻结均已移除，相关验收行随之删除。

> 目标机：`desktop-kfscv8c-1`（`DESKTOP-KFSCV8C`，100.126.54.11，`king_`），DSH Desktop `0.2.1-rc.5`。
> 真机：`win11-test`（`DESKTOP-GB7NLMT`，100.108.63.25，`king`），DSH Desktop **`0.2.2-rc.1`（commit c59d10a）**。
> 验证方式：`desktop-kfscv8c-1` 用隔离 `web` profile + `--patch` overlay（**未写入任何 profile**）+ 无头 Edge/CDP；`win11-test` 用**真实桌面应用 + 测试 profile**（`C:\Users\Administrator\.dsh\profiles\desktop`，装前已备份）。as-of 2026-11-05。

## 0. 跨版本结论

| DSH 版本 | 安装形态 | 结论 |
|---|---|---|
| `0.2.1-rc.5` | 隔离 web profile（overlay） | 全部 14 项冒烟通过 |
| `0.2.2-rc.1` | **真实 Electron 桌面应用 + 测试 profile** | 面板挂载、2/3/4 格、格内真实对话流式、格内 `ask_user_question` 卡片与作答、分割线/最大化/还原均通过 |

`engines.dsh` 因此改为 `>=0.2.1-rc.5 <0.2.2-0 || >=0.2.2-rc.1 <0.2.3-0 || >=0.2.3-rc.1 <0.3.0-0`（semver 的预发布规则使单条 `>=0.2.1-rc.5 <0.3.0` 会拒绝 `0.2.2-rc.1`；后来补上 `0.2.3-rc.x` 一条，`scripts/check.mjs` 会断言文档与清单里的这串范围完全一致，防止再次漂移）。

## 1. 单元与静态检查

| 项 | 结果 | 命令 |
|---|---|---|
| 布局代数单测 | 15/15 通过 | `npm test`（`node --test test/model.test.ts`） |
| 发布自检 | 通过 | `npm run check`（manifest / 产物 / 文案中英对齐 / 体积） |
| 构建确定性 | 两次构建 SHA-256 相同 | `npm run build` ×2 |
| 体积 | `client.js` 52,573 B（预算 160 KiB） | `npm run check` |

## 2. 浏览器端冒烟（隔离 web profile + CDP）

| # | 场景 | 结果 |
|---|---|---|
| S1 | 侧栏「分屏」打开面板 | 面板挂载，主列替换，原生会话面板未被破坏 |
| S2 | 默认 2 格 | 2 个 `[data-pane]`、1 条分割线，两格分别绑定不同会话 |
| S3 | 2/3/4 切换 | 3 格 = 2 条分割线（row+col）；4 格 = 3 条分割线（col/row/col） |
| S4 | 分割线拖拽 | 从 0.5 拖到 0.38（`state().layout.ratio` 实测），拖动中 `data-dragging=true` |
| S5 | 格头拖拽交换 | 两格 `sessionId` 互换，其余格不受影响 |
| S6 | 最大化 / 还原 | 可见格数 1 → 2，顶栏出现「还原」 |
| S7 | 空格选择器 | 搜索并点选后绑定成功，剩余空格保留为空 |
| S8 | 刷新后恢复 | `localStorage` 恢复 4 格布局与 0.62 比例；空位不左移 |
| S9 | 窄窗降级 | 舞台宽 < 900 或高 < 520 时只渲染聚焦格 + 顶栏格切换器，布局树保留；切换器带状态点。2026-11-11 VM 实测：1000px 渲染 3 格 → 840px 渲染 1 格 + 3 个切换器 → 点切换器换格成功 → 480px 高同样收敛 → 移除约束后恢复 3 格，全程无横向溢出 |
| S10 | 格内 `ask_user_question` | 卡片在格内出现，格内选 A → 提交 → 回合完成 |
| S11 | 格内审批 | 在**非 mainView** 会话的格内触发 `danger-full-access` 提权 → 卡片出现 → 拒绝 → 文件未创建 |
| S12 | 草稿存活 | 输入 `draft-probe-123` → 切面板 → 切回，文本仍在 |
| S13 | 快捷键注册 | 桌面默认键注册成功；无 `dsh-multiview` 警告（Web 端按设计不绑默认） |
| S14 | 控制台 | 启动无本插件 warning/error（仅有 4 条与插件无关的 404 资源噪声） |
| S15 | 打开分屏默认态（0.1.2） | 2 格全部显示会话列表，无自动绑定 |
| S16 | 关闭已绑定的一格（0.1.2） | 该格回到会话列表，格数仍为 2（不塌成单格） |
| S17 | 视图与更新（0.1.2） | 绑定 2 格后「视图」出现 1 条（名称=两格标题用 \u007c 连接）；未装市场时更新按钮提示「未检测到插件市场」，弹窗可开合 |
| S18 | 深色主题（0.1.8） | 用户在其桌面应用切到深色主题后确认顶栏图标、按钮、弹出层对比度正常（label-primary 随主题反转） |

## 1.4 发布卫生（`npm run check` 的一部分）

发行包里的噪声会出现在每个用户的控制台里，所以下面几条是构建期硬性检查：

| 检查 | 为什么 |
|---|---|
| 不得出现 `console.log` | 调试输出不该随包发布；`console.error` 只允许出现在 catch 路径且带 `dsh-multiview:` 前缀 |
| 不得出现 `debugger`、`TODO`、`FIXME`、`XXX:` | 遗留标记不应进入发行产物 |
| 调试钩子必须在环回主机检查之后 | `__mvDebug` 仅供冒烟测试，不能在正式环境暴露 |
| `package.json` 的 `files` 必须包含 `client.js`、`index.js`、`cordis.patch.yml` | 少一个，安装后就不工作 |

当前实测：`client.js` 内 0 个 `console.log`、9 个 `console.error`（全部在 catch 路径）、1 个 `console.warn`（默认快捷键被拒时）；无 `debugger`/`TODO`/`FIXME`。

## 1.5 随机不变量校验

两条 fuzz 驱动**真实发行 bundle**（假宿主 + loopback 调试钩子），不做任何复刻：

| 工具 | 覆盖 | 规模 | 检查的不变量 |
|---|---|---|---|
| `npm run fuzz` | 状态机 | 40 种子 × 300 步 | 格数 2..4 且 pane id 唯一；焦点有效；最大化只指向仍持有会话的格；`preset` 与格数一致；`currentViewId` 必然存在；每条保存布局合法；会话不重复；比例在 `[0.22,0.78]`。每 40 步做一次持久化往返校验 |
| `npm run fuzz:render` | 渲染层 | 25 种子 × 250 个状态 | 渲染不抛错；可见格数与最大化一致；格 id 唯一且属于布局；空格的 ⤢ 不出现；✕ 的出现条件正确；↗ 仅出现在已绑定格；分割线数 = 可见格数 - 1；每格恰好一个格头与一个非空标题；空格必有选择器 |

窄窗分支无法用假宿主触达（它由 `ResizeObserver` 回调设置），因此窄窗仍靠真机实测覆盖，这一点在此写明而不是略过。

## 1.7 安全面（`npm run check` 的一部分）

插件能碰到宿主的页面与网络，所以"不需要的能力"应当被构建期拒绝，而不是靠自觉：

| 检查 | 当前实测 |
|---|---|
| 动态代码执行（`eval(`、`new Function`） | 0 |
| HTML 字符串注入（`innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`） | 0 |
| 原始网络原语（`XMLHttpRequest`、`WebSocket`） | 0 |
| 编解码（`atob`/`btoa`）、cookie（`document.cookie`）、跨帧（`postMessage`）、`Authorization` 头 | 0 |
| 外部地址 | **仅 1 个**：`https://registry.npmjs.org/dsh-multiview/latest`，且 `credentials: 'omit'`、`referrerPolicy: 'no-referrer'` |
| 本地存储键 | **仅 2 个**：`dsh.multiview.v1`（布局）、`dsh.multiview.update.v1`（更新缓存） |

说明两处需要澄清的地方：

- **更新操作会 POST**，目标是**相对路径** `/dsh-market/api/v1/updates`（同源，即宿主自己的本地服务），请求体只有 `{"packageName":"dsh-multiview"}`。它不携带第三方凭据，也无法指向外部域——绝对地址会被上面的守卫直接拒绝。
- 之前的市场评审对这一区域的结论是 PASS，本轮在新增功能后**重新审计**而非沿用旧结论。

## 1.9 守卫的自证（哪些检查被证明会失败）

`npm run check` 里有 **67 处断言**。一条铁律：**没被看到失败过的检查，不能算存在**——
两条双语词典守卫上线时就曾静默通过（切片取到空块、取到图标常量），却被算作"覆盖"。

`npm run prove:guards` 跑四组负向对照，共 **35 个用例**，每个都要求构建以**指定信息**失败。

| 组 | 用例 |
|---|---|
| 清单与元数据 | 包名、版本格式、许可证、`engines.dsh` 缺失、预发布陷阱、0.2.2 终版、pre-0.2、0.3 预发布、逐条枚举、bundle patch、client platform、immediately、ESM、`files` 三项 |
| 产物结构 | loader id、inject/apply 导出、`__ModuleLoader__` 注册方式、宿主 `apply`、patch 行名、样式内联 |
| 网络面 | 额外端点、原始 XHR、注册表恰好一次、fetch 次数上限、同源市场 API |
| 拷贝与文档 | 缺失文案键、中英互串、两边同文、重复未翻译、zh/en `meta.title`、文档 engines 漂移、清单版本号 |
| 尺寸 | `client.js` 超 160 KiB |

**实际结论（2026-11-11 实测）**：35/35 BITES。

**诚实标注**：67 处断言中这 35 个用例覆盖了 **35 处**；其余 32 处是**同一模式的重复**（对 `files` 的三个字段、
`engines` 的多个版本点、样式三条规则等循环生成），它们的兄弟用例已被证明会失败。因此可以这样说：
**每一类检查都至少被看到失败过一次**，而不是"每一条断言都被单独证明"。

**过程中的发现**（这轮最值钱的部分）：

- `index.js must export a Host apply` 原先用 `includes('export function apply')`，**`applyHost` 也能通过**——已改为带词边界的正则，本轮变异随即咬住。
- 三条"变异打偏"：loader id 与 inject 导出是 `scripts/build.mjs` **生成**的，改源码无效；样式令牌守卫要**删光**所有令牌才会触发。打偏不是守卫的错，但如果不查就会把"打偏"误报成"守卫有效"。

## 2.1 win11-test 真机（DSH 0.2.2-rc.1，真实 Electron 应用）

安装路径：`C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-multiview`，profile 的 `dependencies` 与 `dsh.profile.bundles` 各加一条；装前备份 `package.json` / `cordis.patch.yml` 为 `*.bak-20261105-0951-multiview`。

| # | 场景 | 结果 |
|---|---|---|
| W1 | 组合与加载 | 启动图 77 条，含 `dsh-multiview`（`immediately:true`）；侧栏出现「分屏」 |
| W2 | 面板挂载 | 2 格 + 1 分割线；标题栏（应用/编辑菜单）与侧栏未被覆盖 |
| W3 | 2/3/4 切换 | 3 格 = row+col 两条分割线；4 格 = 3 条 |
| W4 | 格内真实对话 | 格内发送 → 流式 → 完成（"OK"，8 秒，9.8K tok） |
| W5 | 格内 `ask_user_question` | 卡片在格内出现；真实指针点选 A → 「提交」启用 → 提交 → 「你选择了 A」，回合完成 |
| W6 | 最大化 / 还原 | 可见格 1 ↔ 4，顶栏「还原」出现并生效 |
| W7 | 分割线拖拽 | **发现缺陷并修复**：拖拽监听原挂在 `useEffect`，React 提交晚于 `pointerdown`，快速拖动的前几帧丢失（120px 只产生 0.7px 位移）。改为 `pointerdown` 内同步挂 window 监听 + ref 记录最后比例。修复后：VM 上用逐帧 PointerEvent 复验（ratio 0.36→0.22 并夹取），`desktop-kfscv8c-1` 上用 CDP 快速拖拽复验（0.5→0.3806） |
| W8 | 格内审批（2026-11-06 复验） | 新建独立会话 → Agent 请求 `danger-full-access` 写 `C:\Windows\System32\mv-probe2.txt` → 审批卡在**格内**显示（「等待审批」+ 拒绝/允许一次）→ 格内拒绝 → Agent 停止申请；`mv-probe2.txt` 与 `C:\Windows\Temp\mv-approval-probe.txt` 均**不存在**。截图 `.dev/evidence-win11-approval-in-pane.png` |

> VM 上 `Input.dispatchMouseEvent` 的快速拖拽没有改变比例（该窗口在后台/未聚焦时 Chromium 的合成鼠标输入不稳定），因此改用逐帧 `PointerEvent` 直接验证事件处理链路；产品路径（真实指针）与本地 CDP 验证一致。

> 该 VM 的测试 profile 里没有可用的审批触发条件（无 `danger-full-access` 提权会话），所以审批链路只在 `desktop-kfscv8c-1` 的 0.2.1-rc.5 实例上验证过（S11）。


## 2.2 卸载 / 重装演练（win11-test，2026-11-07）

| # | 步骤 | 结果 |
|---|---|---|
| U1 | 从 profile 删除依赖 + bundle 行 + `node_modules\dsh-multiview`，重启 | 启动图 0 条 multiview；侧栏无「分屏」；无 `.mv-*` 残留样式（`oursLeft: 0`） |
| U2 | 残留检查 | `localStorage['dsh.multiview.v1']` 仍在（约 1.4KB，文档已声明为唯一残留） |
| U3 | 重新装回 0.1.10 + 恢复 bundle 行，重启 | 启动图 1 条；「分屏」回来；打开面板 4 格正常、无错误提示 |

## 3. 性能（CDP rAF 采样，1530×851）

| 场景 | p50 | p95 | 最长帧 | >50ms 长任务 | JS 堆 |
|---|---|---|---|---|---|
| 原生会话（基线） | 16.7ms | 16.7ms | 16.8ms | 0 | 43MB |
| 4 格挂载、空闲 | 16.7ms | 16.8ms | 16.8ms | 0 | 75MB |
| 4 格挂载、2 路同时流式 | 16.7ms | 16.7ms | 16.8ms | 0 | 85MB |
| 4 格挂载、4 路**同时长流式**（60s 采样，前 ~40s 四路都在产出） | 16.7ms | **50ms** | **150ms** | **2** | 53MB |
| 4 格、4 路同时长流式（**win11-test 真机**，0.2.2-rc.1，60s，四路全程在产出） | 19.3ms | **140ms** | **370ms** | **55** | 69MB |
| 4 格静态内容、脚本化滚动 10s（win11-test 真机） | 15.8ms | 26ms | 85ms | — | — |

> **2026-11-07 真机复测结论**：交互（滚动/拖拽/聚焦）在 4 格下仍是 ~59fps、p95 26ms；卡顿只出现在「多格同时长流式」——那是 DSH Chat 自己对每个 chunk 重排 markdown 的成本 ×4，不是分屏框架的开销（`contain: strict` A/B 59.2 vs 58.5fps，属噪声，未采纳）。另：虚拟机窗口失焦时 Chromium 会把 rAF 压到 ~7fps，所以真机绝对帧率受环境影响，只有同一窗口内的对比才有意义。

采样脚本：`.dev/sampler.js`（`requestAnimationFrame` 间隔分布 + `PerformanceObserver('longtask')` + `performance.memory`）。
说明：两路流式的应答约 1–2 秒完成，采样窗口 9 秒覆盖了完整流式期；4 格同时长流式未构造（需要 4 个会长时间运行的 agent 回合）。

## 4. 未覆盖 / 待办

| # | 项 | 状态 |
|---|---|---|
| P1 | `win11-test` 真实桌面安装 + 五项冒烟 | **已完成**（2026-11-05/06，W1–W8） |
| P2 | desktop profile（live）安装 | **已完成**（2026-11-06，`plugin_manager install_bundle`，`include:multiview` active，未重启 DSH；客户端图标需刷新窗口一次才出现） |
| P3 | 4 格同时长流式（>30s）压力 | **已完成**（§3 最后一行：p95 50ms、2 长任务） |
| P4 | 卸载复验（插件页移除 → 重启 → 无残留） | 未做（需重启，用户要求全程不重启） |

## 5. 复现步骤

```powershell
# 1) 构建与自检
npm run build; npm run check; npm test

# 2) 隔离实例（不写 profile）
dsh --profile web --patch .dev\dev.patch.yml --port 40602 --no-open

# 3) 无头浏览器 + CDP
powershell -File .dev\browser.ps1 -Url "<printed url>"
powershell -File .dev\attach.ps1 -Url "<printed url>"
powershell -File .dev\open-panel.ps1

# 4) 采样
$env:CDP_PORT=9333; node .dev\cdp.mjs eval "$(Get-Content .dev\sampler.js -Raw)"
```
