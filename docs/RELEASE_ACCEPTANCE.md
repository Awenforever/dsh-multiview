# dsh-multiview — 验收证据

> 目标机：`desktop-kfscv8c-1`（`DESKTOP-KFSCV8C`，100.126.54.11，`king_`），DSH Desktop `0.2.1-rc.5`。
> 验证方式：隔离 `web` profile 经 `--patch` overlay 加载本仓库工作树（**未写入任何 profile**），用无头 Edge + CDP 驱动。as-of 2026-11-05。

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
| S9 | 窄窗降级 | 750px 宽时只渲染聚焦格 + 顶栏格切换器（布局树保留） |
| S10 | 格内 `ask_user_question` | 卡片在格内出现，格内选 A → 提交 → 回合完成 |
| S11 | 格内审批 | 在**非 mainView** 会话的格内触发 `danger-full-access` 提权 → 卡片出现 → 拒绝 → 文件未创建 |
| S12 | 草稿存活 | 输入 `draft-probe-123` → 切面板 → 切回，文本仍在 |
| S13 | 快捷键注册 | 桌面默认键注册成功；无 `dsh-multiview` 警告（Web 端按设计不绑默认） |
| S14 | 控制台 | 启动无本插件 warning/error（仅有 4 条与插件无关的 404 资源噪声） |

## 3. 性能（CDP rAF 采样，1530×851）

| 场景 | p50 | p95 | 最长帧 | >50ms 长任务 | JS 堆 |
|---|---|---|---|---|---|
| 原生会话（基线） | 16.7ms | 16.7ms | 16.8ms | 0 | 43MB |
| 4 格挂载、空闲 | 16.7ms | 16.8ms | 16.8ms | 0 | 75MB |
| 4 格挂载、2 路同时流式 | 16.7ms | 16.7ms | 16.8ms | 0 | 85MB |

采样脚本：`.dev/sampler.js`（`requestAnimationFrame` 间隔分布 + `PerformanceObserver('longtask')` + `performance.memory`）。
说明：两路流式的应答约 1–2 秒完成，采样窗口 9 秒覆盖了完整流式期；4 格同时长流式未构造（需要 4 个会长时间运行的 agent 回合）。

## 4. 未覆盖 / 待办

| # | 项 | 状态 |
|---|---|---|
| P1 | `win11-test` 真实桌面安装 + 五项冒烟 | **未执行**（需要 SSH 到 Windows VM 并按 `dsh-codex-advisor/RUNBOOK-win11-test.md` §3.3 起交互计划任务） |
| P2 | desktop profile（live）安装 | **未执行**，等用户逐窗口批准 |
| P3 | 4 格同时长流式（>30s）压力 | 未构造，见 §3 说明 |
| P4 | 卸载复验（插件页移除 → 重启 → 无残留） | 隔离实例中已验证 stop/start 与面板卸载；正式卸载需在装有 bundle 的 profile 上做，随 P1/P2 |

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
