# 04 · Introduction 正文模块

## DOM（SOURCE: probe-1440.json / hero-pretty.txt）

```
article.article
└─ div.body.launch-body[data-theme=ivory]
   ├─ span#introduction.anchor（display:block，定位锚）
   ├─ p.article-summary            ← 导语（首段）
   ├─ p.post-text（×5）            ← Price / Data retention / Safeguards …
   └─ （其后为 frontier 章节，超出复刻范围）
```

## 样式事实（SOURCE: computed styles @1440 + css-rules-Body/LaunchBody/typo）

| 属性 | 导语 .article-summary | 正文 .post-text |
|---|---|---|
| 字体 | anthropicSerif 400 | anthropicSerif 400 |
| 字号/行高 | 28px / 36px | 17px / 26.35px（155%） |
| letter-spacing | -0.16px | normal |
| 颜色 | #141413（--color-slate-dark） | 同 |
| 栏宽 | max-width 640px（--text-column-max-width），居中 | 同 |
| 间距 | margin-bottom 48px（--sp-48） | margin-bottom 16px |

- 容器 `.body`：background #faf9f5（ivory），color #141413，padding-bottom 0（launch-body 特例）。
- 阅读栏 `.reading-column`：`margin-inline:auto`；1440 视口下 x=400 w=640。
- `.post-text a:not([class])`：下划线 offset .18em、粗细 .08em；hover color `--color-slate-light`。
- `strong`：粗体（Price. / Data retention. / Safeguards. 段首词 + 斜体句点 `<em>.</em>` —— 原文标记细节）。
- 锚点 `#introduction` + `.post-heading { scroll-margin-top: 32px }`。

## 复刻要点

- 文案按原页保留（用户指定复刻对象；引自目标页面文档）。
- 导语/正文均为衬线（omni 曾误判正文为无衬线，以 computed styles 为准 —— duck 原则：不确定处以证据裁决）。
- 斜体句点 `<em>.</em>`、破折号、弯引号等排版细节照抄结构。
