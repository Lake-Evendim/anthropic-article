# 02 · LaunchHero 布局 / 排版 / 动效

## 容器（SOURCE: css-rules-LaunchHero.txt + probe-1440.json）

```
header.launch-hero(.scene)
  min-height 100svh（1440×900 下 = 900px；≥大屏 height:100svh, min-height:640px）
  margin-top: -1 * var(--site-header-height)   ← 顶栏浮在场景上
  padding: (68px+48px) 80px 80px  → 实测 116px 80px 80px
  background: var(--fx-sky) #749bd0（canvas 未就绪前的底色）
  color: var(--color-slate-050) #faf9f5
  display flex; flex-direction column; justify-content center
  overflow hidden; pointer-events:none（子元素 a/button 恢复 pointer-events）
  ::after → bottom:var(--fx-strip)=50px 处 1px 白线 rgba(255,255,255,.18)（大屏隐藏）
```

另有视觉锚定：`--fx-swatch:18px`（大屏色板直径 22px→18px）、`--fx-text-shadow:0 4px 16px #1428461c`。

## 文字排版（SOURCE: computed styles @1440）

| 元素 | 字体 | 字号/行高 | 其他 |
|---|---|---|---|
| .date "September 2026" | anthropicSans 500 | 14px/14px | uppercase, letter-spacing 1.68px(.12em), margin-bottom 24px, text-align center |
| h1.title | anthropicSerif 400 | 67.84px（clamp(48px,5.3cqi,72px)，cqi=1280）/74.6px(1.1) | letter-spacing -0.16px, text-align left, flex column |
| .title-line | anthropicSerif **500** | 同上 | white-space nowrap |
| .title-line-second | — | — | align-self:flex-end; padding-left:1.6em |
| .title-claude | serif 400 + `dlig` | — | 内容为 `:Claude:`（连字渲染成 Claude 字标） |
| .index | anthropicSerif 400 | 15px/26px | margin-top 64px |
| .index-number | anthropicSans | 13px | `[1]`…`[5]`，tabular-nums |
| .index-leader | — | — | 160 个 `.`，letter-spacing 1px，flex:1，overflow hidden，margin 0 4px |
| .credit "Made with Fable 5.1" | anthropicSans 400 | 12.5px/20px | letter-spacing .005em, #fff |

全部文字 `text-shadow: 0 4px 16px rgba(20,40,70,.11)`。

## 栅格（≥1024px 桌面）

`.words` = 12 栅格，gap 0 32px，max-width 1280px，margin auto，`container-type:inline-size`：
- .date: grid-column 3/11 → 4/10（宽屏）实测 x=408 w=624
- .title: 同列 4/10
- .index: grid-column 5/9 → 实测 x=517 w=405
- 移动端（<1024）：flex column，居中，title clamp(36px,10.5vw,80px)。

## 入场动效（SOURCE: keyframes）

- 门闩：`document.fonts.ready` → `hero[data-fx-ready]`；未就绪时 `fx-wait`（0s linear 5s forwards）兜底显形。
- `fx-el-in`：0%{opacity:0;filter:blur(12px)} → 100% 清晰；0.8s ease-out both。
- `fx-title-in`：0%{opacity:0;blur(26px)} → 45%{opacity:1} → 100%{blur(0)}；0.8s。
- stagger：`animation-delay: calc(var(--fx-order)*.3s + var(--fx-row)*45ms)`；order：date=0、标题行=1/2、目录行=3（行内 --fx-row:0..4）。
- 动画结束（animationend）后由 JS 清掉 animation/filter/opacity（防后续状态污染）。`SOURCE`

## 交互

- **目录 hover 聚焦景深**（SOURCE: CSS `:has`/兄弟选择器）：hover 行清晰，邻行 0.94+blur(.15px)，隔行 0.86+blur(.35px)，其余 0.8+blur(.5px)；transition .4s。
- **Time-of-day 色板**（引擎创建，SOURCE: runtime DOM）：`role=group aria-label="Time of day"`，按钮 Noon/Night/Morning，`--sw` = #7ea9de/#1a2237/#dcc4b3，圆形 18px，1.5px 白色描边（#ffffff73），选中 `.on` = 2px #ffffffeb + scale(1.04)，带 box-shadow 0 1px 3px #14284614。位置：左下 `bottom:22px; left:22px`（大屏）。
- **credit**：右下 `bottom:22px; right:22px`。
- 场景画布见 03-hero-scene.md。

## 复刻实现注意

- `:Claude:` 连字依赖专有字体 dlig；回退字体无法渲染 → JS 检测 `document.fonts.check('16px anthropicSerif')` 失败时替换为纯文本 "Claude"。
- `cqi` 容器单位用于标题字号（5.3cqi），需 `.words{container-type:inline-size}`。
