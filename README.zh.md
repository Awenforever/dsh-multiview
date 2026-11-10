# dsh-multiview — 多会话分屏

> 一个窗口并排打开 2–4 个**真实**对话。每一格就是原生 Chat：composer、流式输出、工具卡、审批卡、`ask_user_question`、附件、斜杠命令、停止/排队，全部照旧。
>
> 目标不是"能跑的分屏"，而是**看起来像 DSH 自带的功能**：不覆盖标题栏、不抢布局、不 monkey-patch 任何非公开扩展点。

English | [中文](README.zh.md)

![四个对话并排](docs/images/four-panes.png)

## 安装

已发布到 npm：`dsh plugin add dsh-multiview`，或在 DSH Desktop 的 **插件 → 添加** 里搜索安装（维护者也可用 `plugin_manager install_bundle`），然后**完全退出并重新打开** DeepSeek Harness，让客户端 bundle 重新加载。

装好后左侧面板列表多一个「分屏」图标；点它把中央列切换为分屏舞台，再点一次回到原生会话。

- 要求：DSH `>=0.2.1-rc.5 <0.2.2-0 || >=0.2.2-rc.1 <0.2.3-0 || >=0.2.3-rc.1 <0.3.0-0`（`engines.dsh`）。每一条预发布线都显式列出——node-semver 不会让预发布版本匹配一个未点名该版本的区间。
- 卸载：插件页停用/移除 → 重启即可，残留只有一个 `localStorage['dsh.multiview.v1']` 布局键（面板里「还原」会清掉它）。

## 用法

| 动作 | 操作 |
|---|---|
| 打开/收起 | 左侧面板列表「分屏」图标 |
| 切换 2 / 3 / 4 格 | 舞台顶栏的 `2` `3` `4` |
| 调整比例 | 拖动格与格之间的分割线 |
| 交换两格 | 拖动一格的**标题**到另一格上 |
| 最大化 / 还原 | 双击格头不生效，用格头右侧的 ⤢ 图标；舞台顶栏出现「还原」 |
| 给空格选会话 | 空格里直接搜索并点选 |
| 在原生视图打开 | 格头右侧 ↗ 图标：把该会话交回原生对话（右栏文件预览/改动评审要在原生视图里才可用） |
| 移除一格 | 格头右侧 ✕；已绑定的一格会**回到会话列表**（分屏形状不变），空格再点 ✕ 才真正移除 |
| 视图 | 顶栏「视图」：绑定 2 格以上会自动记住，点击恢复；✕ 删除 |
| 检查更新 | 顶栏右侧刷新图标：每 24h 自动检查，有更新带红点，确认后自动更新 |

快捷键（模块默认值，可在 **设置 → 快捷键** 改）：

| 命令 | 默认键（桌面端） |
|---|---|
| 聚焦上一格 / 下一格 | `Mod+Alt+[` / `Mod+Alt+]` |
| 最大化或还原当前格 | `Mod+Alt+M` |
| 从分屏移除当前格 | `Mod+Alt+W` |

> 浏览器（Web）端默认**不绑定**这些键：DSH 的快捷键层对 Web/Linux 允许的组合极窄，硬绑会在启动时报"reserved"。桌面端默认值可用，Web 端请按需自绑。

## 明确不支持（v1）

这些是**刻意**不做的，不是遗漏：

1. **格内文件预览 / 改动评审**：DSH 在任何一个全局面板激活时都会卸下右栏的会话面板（`no session surface is mounted`，自带的面板也一样）。要用右栏，请用格头的 ↗ 切到原生视图。
2. **格内新建会话**：Hero 的工作区选择器属于应用级导航，会把整个界面带走；新建会话请在原生视图里做。
3. **格内 Trajectory / 插件视图切换**：每格固定 Chat，不另造 tab。
4. **点侧栏会话送进聚焦格**：那需要拦截非公开的导航路径；侧栏点选仍然走原生行为（会离开分屏）。
5. 自动休眠：只在手动移除/切格时释放资源；不伪造"非聚焦格暂停渲染"。
6. 最多 4 格。

## 性能

在 `desktop-kfscv8c-1`（1530×851 窗口）用 CDP rAF 采样实测：

| 场景 | p50 | p95 | 最长帧 | >50ms 长任务 | JS 堆 |
|---|---|---|---|---|---|
| 原生会话（基线） | 16.7ms | 16.7ms | 16.8ms | 0 | 43MB |
| 4 格挂载、空闲 | 16.7ms | 16.8ms | 16.8ms | 0 | 75MB |
| 4 格挂载、2 路同时流式 | 16.7ms | 16.7ms | 16.8ms | 0 | 85MB |
| 4 格、4 路同时长流式 | 16.7ms | 50ms | 150ms | 2 | 53MB |

四路长文同时输出是最重场景：平均仍近 60fps，但 p95 升到 50ms、偶发一次 150ms 长帧（四份 transcript 各自按 chunk 重排）。v1 不降频——"每格都是真实 Chat"优先于帧率数字。

对话历史按 turn 虚拟化（DSH 自带），因此每格成本 ≈ 一个活跃 turn 的增量渲染 + 一个编辑器实例。窗口窄于 900px 或矮于 520px 时自动降级成「单格 + 顶栏格切换器」，布局树保留。

## 开发

零第三方依赖，只用本机 Node ≥ 22.18（本仓库用 24.13）：

```powershell
npm run build     # src/client/*.ts → client.js（单文件 bundle）；src/host/index.ts → index.js
npm test          # 布局代数单测（node --test）
npm run check     # 发布自检：manifest / 产物 / 文案 / 体积
```

隔离验证（**不写任何 profile**）：

```powershell
dsh --profile web --patch <repo>\.dev\dev.patch.yml --port 40602 --no-open
```

`dev.patch.yml` 里的 row 名用绝对 `file:///` 指向本仓库的 `index.js`（Loader 的相对名锚定在 profile 根，不是 patch 文件旁）。

客户端契约只走公开插槽面：`main` keyed 面板 + 私有子槽 + `SessionProvider` + `conversation.content` factory（`variant:'embedded'`）+ `sessions.retain` + `shortcuts` + `locale`。详见 [docs/DESIGN.md](docs/DESIGN.md)。

## 状态与支持

预 1.0：接口稳定到可以日常使用，但小版本里仍可能出现小范围破坏性变更，每一处都记在 [CHANGELOG.md](CHANGELOG.md)。发布由 CI 从 tag 触发并带 npm provenance，所以 npm 上的包就是本仓库构建出的那一个。

客户端只会发两类网络请求：插件市场的同源 API，以及**仅用于版本发现**的 `registry.npmjs.org/dsh-multiview/latest`
公共读取（不带凭据、不带 referrer）。安装仍然走市场。`scripts/check.mjs` 会守住这份清单。

`engines.dsh` 接受整个 `0.2.x`。构建在 `0.2.1-rc.5` 与 `0.2.2-rc.1` 上验证过；其他版本会在顶栏 tooltip 里注明"尚未验证"，而不是假装验证过。

- Bug 与需求：[issues](https://github.com/Awenforever/dsh-multiview/issues)（模板会问最要紧的两件事：插件版本、宿主版本）。
- 多格渲染成本：已在上游立项 [discussion #12559](https://github.com/deepseek-ai/deepseek-harness/discussions/12559)。
- 限制浮层层级对比的主题令牌缺口（浅色无色阶、缺 state-business-secondary）：[discussion #12770](https://github.com/deepseek-ai/deepseek-harness/discussions/12770)。
- 非分屏专属的问题（会话、权限、模型供应商）属于 harness 项目本身。

## 许可

MIT。
