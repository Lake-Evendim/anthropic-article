# 01 · SiteHeader 模块

## DOM（SOURCE: evidence/dom/site-header.html）

```
header.header.hideOnScroll(.hidden) data-theme=light
├─ div.skipLinks → a×2（Skip to main content / Skip to footer）
└─ div.page-wrapper.root
   ├─ a[href="/"] aria-label=Home
   │  └─ div.logoDesktop > LogoWordmark(logo-lottie)  ← SVG/Lottie 字标 143×16
   ├─ nav（Research▾ / Policy / Commitments▾ / Learn▾ / News）
   └─ a "Try Claude"（黑底按钮，带 ▾）
```

## 样式事实（SOURCE: computed styles + css-rules-SiteHeader.txt）

| 属性 | 值 |
|---|---|
| 高度 | 68px（`--header-nav-height:64px` + 上下 padding 16px 中内容） |
| position | sticky; top 0 |
| background | `--color-slate-050` #faf9f5 |
| color | #0f0f0e |
| padding | 16px 0 |
| .page-wrapper | width 100%; max-width `--container-max-width:1400px`; padding-inline `--page-margins:32px`; margin auto |
| border-bottom | 无 |

## 行为

- **hideOnScroll**：向下滚动 → 加 `.hidden`（translateY(-100%) 类效果 + `hero-header-return` keyframes: to{transform:none}）；向上滚回 → 显示。`SOURCE: CSS`，阈值 `GUESS`（约 64px 滚动位移，实现取 >4px 向下滚动即隐藏）。
- skipLink：视觉隐藏，聚焦可见（无障碍）。
- **Logo**：原站是 Lottie 矢量字标（`ANTHROP\C` 形态，143×16，黑）。复刻用 SVG <text> 近似字标（间距/字重对齐），不复制 Lottie 路径数据。见 known-gaps。
- 导航下拉（Research/Commitments/Learn/Try Claude 带 ▾）：原站有 Dropdown 动效；复刻只保留静态 ▾（超出复刻范围，交互从略）。
- 响应式：≤ 移动端切 SiteMobileNav（复刻仅保留桌面布局 + 简单收缩，见 known-gaps）。

## 复刻要点

字体 anthropicSans → 回退 `system-ui, "Helvetica Neue", Arial`；字号 14px 级；CTA 按钮：黑 #0f0f0e 底、白字、小圆角（原站视觉圆角约 4-8px，实现取 6px）`GUESS`。
