# known-gaps · 复刻差异与证据缺口

2026-11-13 更新：首屏进一步加入真实月面数据、体积云、曲线枝条/树皮材质以及本地 Anthropic 字体。本轮改动与验证见 `07-materials-and-typography.md`；G1/G2 的字体回退差异已解决，其余重建差异如下。

> 当前实现：场景引擎为原创重建；字体和树皮资产来自参考页，月面来自 NASA SVS。资产来源及使用边界见 `../assets/README.md`。以下记录实际差异。

## P0/P1 差异（已接受，非缺陷）

| # | 差异 | 原因 | 影响 |
|---|---|---|---|
| G1 | 已解决：本地加载 AnthropicSans/AnthropicSerif 可变字体 | 字体来源见 assets/README.md | 桌面标题/日期/目录矩形与参考一致；加载失败时仍有 fallback |
| G2 | 已解决：`:Claude:` dlig 连字 | AnthropicSerif 加载正常 | 正常字体加载时呈现连字，加载失败时使用文本 Claude |
| G3 | 场景为原创 GLSL 重建，非原 PBR 管线 | 已加入参考树皮纹理与 NASA 月面，但几何/云密度/景深属于近似 | 分叉形态、云边轮廓、鸟羽和遮挡仍与参考有差别 |
| G4 | SiteHeader Logo 为 SVG 文本近似，导航结构与当前参考不同 | 保留原项目页头，未纳入本轮材质修复 | 字标及按钮布局差异 |
| G5 | 导航下拉菜单交互未复刻 | 范围外（仅首屏+intro） | 静态 ▾ 展示 |

## P2 差异 / GUESS 标注

| # | 项 | 真值 | 说明 |
|---|---|---|---|
| G6 | hideOnScroll 触发阈值 | GUESS | 原站精确阈值未探明；实现取滚动位移 >4px 向下隐藏 |
| G7 | 鸟的行为编排（起飞间隔、路径、栖点选择种子） | GUESS | 由 uLand/uLandK/perches/shelter 语义重建；事件节奏拟合 |
| G8 | 云层 fbm 参数（octave/速度/覆盖度） | GUESS | 依帧采样拟合 |
| G9 | Night/Morning 的星密度、月相、太阳高度 | GUESS | 依截图描述拟合 |
| G10 | `--fx-strip` 底部 1px 白线（大屏隐藏断点） | PARTIAL | 已复刻（≤1024 显示） |
| G11 | SiteMobileNav / 移动端完整布局 | PARTIAL | 复刻了基础响应式（单列、title clamp），未逐项还原移动菜单 |
| G12 | side-toc 拖拽（is-dragging） | GUESS | 简化为点击滚动 + active 跟随 |
| G13 | 入场动画对 prefers-reduced-motion 的分支 | PARTIAL | 原站 still=静帧；复刻禁用动画 |

## 环境

- 证据与工具链在 `.openclaw/tmp/recon/`（target.html、all.css、js/ 切片、evidence/ 截图与探针 JSON）。
- 本地运行：`python3 -m http.server 8000`（在项目根目录）。
