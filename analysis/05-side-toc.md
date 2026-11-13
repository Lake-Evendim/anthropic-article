# 05 · LaunchSideToc 模块

## DOM（SOURCE: probe-1440.json sideTocHTML）

```
nav.side-toc.is-visible [style="top: 390px"]  aria-label=Contents
└─ ol.list
   └─ li × 6
      └─ a.link(.is-active) draggable=false
         └─ span.pill  "Introduction" | "A new performance frontier" | "Scientific research"
                        | "Safety" | "Claude Mythos 5.1" | "Cost and availability"
```

## 行为（SOURCE: chunk 3fuv9vb54x2c2.js module 990515 + CSS）

- props：`stations[]`；active 索引 state；`.is-visible` 控制显隐（滚过 hero 后出现）。
- `.is-dragging`：可拖拽 pill 轨道（pointer 事件跟踪 startY/moved）。
- `.pill`：胶囊背景，`.is-active` 高亮；`.link` hover 过渡。
- 顶栏隐藏方向一致（hideOnScroll）；`style.top` 随视口居中定位（实测 390px ≈ (900-120)/2+…）`GUESS`。
- 目标页 stations 与 hero index 不同：6 项，且 "Safety" 为缩写。

## 复刻要点

- 复刻版包含此模块（属首屏/正文阅读的页面 chrome），但只实现：滚过 hero 显示、active 态跟随滚动、点击平滑滚动到锚点。拖拽（is-dragging）实现为原生简化版或省略（known-gaps）。
- 超出范围章节的锚点 href 置 `#`（不复刻其章节）。
