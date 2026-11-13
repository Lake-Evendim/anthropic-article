# 00 · Duck 走查总览（rubber-duck walkthrough）

> 🦆 本文档按 /duck 方法逐节点走查数据/控制流；实现关键事实标注 `SOURCE` / `PARTIAL` / `GUESS`（无标注 = GUESS）。
> 证据目录：`.openclaw/tmp/recon/`（target.html、all.css、css-rules-*.txt、js/、evidence/）。
> 复刻范围：**首页首屏（SiteHeader + LaunchHero + 场景画布）+ Introduction 章节**。其余章节不做。

## 1. 目标站点是什么

- URL: `https://www.anthropic.com/claude-fable-and-mythos-5-1`（2026-09 发布页，Next.js + Turbopack + Sanity CMS）`SOURCE: target.html`
- 页面骨架（顺序）`SOURCE: target.html DOM 枚举`：
  1. `header.SiteHeader`（sticky、hideOnScroll、data-theme=light）
  2. `main#main-content`
     - `nav.LaunchSideToc`（左侧浮动目录 pill）
     - `header.LaunchHero`（首屏：日期 + 大标题 + 5 行目录 + credit + 场景 canvas）
     - `article`（正文）：`#introduction` 锚点 + 导语 + 5 段 post-text …后续章节（超出范围）
  3. `footer#footer`（超出范围，不做）

## 2. 首屏的渲染路径（从导航到像素）

```
用户打开 URL
  │ ✓ HTML SSR: header/LaunchHero.words/article 文本已含在 DOM（SOURCE: hero-raw.html）
  ▼
浏览器解析 CSS（_next/static/chunks/*.css，CSS Modules 哈希类名）
  │ ✓ 设计令牌 :root（色板/间距/字重/缓动）SOURCE: css-rules
  ▼
hydration 后 LaunchHero 组件（chunk 3fuv9vb54x2c2.js, module 823698）
  │ ✓ 入参 modelName="Fable", version="5.1", companion=Mythos 5.1,
  │   date="September 2026", index[5], assets="/fx/hero/", seed
  │ ✓ 文本元素 rects → shelters（date/title/index 的归一化矩形，含 32/18、40/22、56/30 呼吸边距）
  ▼
lazy import → module 222197（chunks 14c8frmb4u5hu.js + 1mbi8ljn4s3ot.js=three.js）
  │ ✓ createFableHero(heroEl, {assets, seed, classes, shelters})
  │ ✓ 创建 <canvas class=canvas aria-hidden> prepend 到 hero
  │ ✓ WebGLRenderer(antialias:false, alpha:false, high-performance)
  │   + EXT_color_buffer_float + OES_texture_float_linear
  │ ✓ 无 WebGL → 移除 canvas，hero 加 .unsupported（CSS 兜底渐变）
  ▼
场景首帧 → canvas 加 .drawn（opacity 0→1, .6s cubic-bezier(.22,.61,.36,1)）
  ▼
document.fonts.ready → hero[data-fx-ready]
  │ ✓ 触发 CSS 入场动画（date/title-line/index-row-inner）
  │   fx-el-in: opacity 0 + blur(12px) → 清晰，0.8s ease-out
  │   fx-title-in: 0% opacity0 blur(26px) → 45% opacity1 → 清晰
  │   延迟 = --fx-order*.3s + --fx-row*45ms（date=0，标题行=1/2，目录行=3+）
  ▼
scene 内部创建 Time-of-day 切换器（role=group，3 个 button：Noon #7ea9de / Night #1a2237 / Morning #dcc4b3）
  │ ✓ 挂到 hero 左下（.looks），选中项加 .on
  ▼
运行期 rAF 循环：uTime 推进云/风/鸟；resize → ResizeObserver → setShelters 重算文字避让区
```

⚠️ 走查中"必然正确"处重点核对过：
- **`--fx-sky` 不随 Time-of-day 变化**（probe-looks.json：night/morning 下仍 #749bd0）→ 配色切换只发生在 WebGL uniforms，CSS 变量仅是 canvas 载入前的底色。`SOURCE`
- **顶栏不随主题变化**（headerTheme 恒为 light、bg 恒 #faf9f5）。`SOURCE`
- **canvas 先于文字出现**（drawn 切换靠 .6s 过渡；文字靠 data-fx-ready + 5s 兜底 `fx-wait`）。`SOURCE`

## 3. 模块清单与文档索引

| 模块 | 文档 | 状态 |
|---|---|---|
| SiteHeader（logo/nav/CTA/hideOnScroll） | 01-site-header.md | 已分析 |
| LaunchHero 文字排版 + 目录 + 入场动效 | 02-launch-hero.md | 已分析 |
| 场景画布（WebGL 天空/云/月/树枝/鸟） | 03-hero-scene.md | 已分析（含证据缺口） |
| Introduction 正文（导语 + 5 段） | 04-intro-body.md | 已分析 |
| LaunchSideToc（左浮动目录） | 05-side-toc.md | 已分析 |
| 复刻差异与证据缺口 | known-gaps.md | 持续维护 |

## 4. 复刻实现决策

- **不复制原站代码资产**：three.js 场景引擎 90KB 压缩代码、AnthropicSans/Serif 专有字体、bark/tit 贴图均为原站资产 → **不复制进交付物**，改为：
  - 原创重写 WebGL/Canvas2D 场景（行为与构图对齐，代码原创）
  - 字体用近似回退栈（serif: Tiempos→Georgia 系；sans: Styrene→system 系）
  - 贴图程序化生成（树皮噪点、山雀羽毛色块）
  - 全部缺口记录在 known-gaps.md
- **文本**：hero + Introduction 章节文案按原页保留（用户指定的复刻对象）。
- **交付结构**：无构建步骤的静态站（index.html + css/ + js/），`python3 -m http.server` 可直接运行。
