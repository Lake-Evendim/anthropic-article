# 03 · 场景画布（WebGL）— web-shader-extractor 侦察记录

## INTAKE / CAPABILITY_SNAPSHOT

- 目标视觉：LaunchHero 首屏背景动画（天空、云、天体、前景树枝与山雀）。
- 可用能力：navigate / runtime-eval / network-metadata / canvas-screenshot / interaction / local-run / multi-frame-compare / source-map(未提供) / frame-capture-webgl(经 canvas.toDataURL 抽帧)。

## SURFACE_ATTRIBUTION → TARGET_LOCK

| 事实 | 证据 | 真值 |
|---|---|---|
| 页面初始 DOM 无 `<canvas>`；hero 内 canvas 由 JS 创建并 prepend | target.html 无 canvas；probe-1440.json canvas 存在于 hero | SOURCE |
| 唯一 canvas 即目标（1440×900，absolute inset:0，opacity 0→`.drawn`→1） | probe-1440.json | SOURCE |
| 渲染后端 **WebGL**（WebGLRenderer, antialias:false, alpha:false, high-performance；EXT_color_buffer_float、OES_texture_float_linear） | js/14c8frmb4u5hu.js: `new t.WebGLRenderer(...)` | SOURCE |
| 场景引擎 = `createFableHero`（lazy chunk 14c8frmb4u5hu.js，module 222197），依赖 1mbi8ljn4s3ot.js（three.js r 系，含 GLSL `300 es` 字样） | js/3fuv9vb54x2c2.js 引用 `e.A(43259)` → chunk 列表 | SOURCE |
| 相机：PerspectiveCamera(fov 21, near .1, far 700)，位置 (0,0,0)；注视/中心参考点 (0,.55,-3) | 引擎常量 | SOURCE |
| NoToneMapping；outputColorSpace = LinearSRGBColorSpace（ACES 函数在 shader 内自行 tonemap） | 引擎 + shader `aces()` | SOURCE |
| 纹理资产：`/fx/hero/bark_diff.webp, bark_nor.webp, tit_diff.webp, tit_norm.webp, tit_rgh.webp`（diffuse/normal/roughness → PBR 树皮 + 大山雀） | 引擎字符串 + HTTP 200 content-type: image/webp | SOURCE |
| 输入：pointer 移动（"away" 状态驱鸟）；点击/悬停鸟 → 起飞（over-bird cursor）；resize → setShelters；prefers-reduced-motion → 静帧 | 引擎 | PARTIAL |
| Time-of-day：day/night/morning 三态，切换推进过渡量（`ef.d/ef.n/ef.t`） | 引擎 | PARTIAL |
| 无 WebGPU / Worker / OffscreenCanvas 参与本目标（lottie 走 SVG，见 01） | 分配排除 | SOURCE |

**lockStatus: locked**（targetSet: `header.launch-hero > canvas.canvas`；备选：无第二画布；trace 路由：bundle slice + runtime probe + 帧采样）

## CATALOG（GLSL 事实，SOURCE: 引擎内嵌 shader 文本）

- uniforms：`uTime, uRes, uZenith, uNight, uSunDir, uMoonLight, uMoonGain, uClouds, uWind, uLag, uLand(vec4), uLandK(vec3), uShelterA, uRadNow, uTexel, tSrc, tFol, uFgBlur, line, map`
- 函数：`skyColor, cloudField, fbm/vnoise/fbm3/hash/hash2/hash12/vn/finite4, deck, boxDist, smin, shelterDist, landSpring, windSway, aces, caTex`
- 语义线索（引擎注释字符串）：`uLand` = "a landing: the perch (xyz) and the time it took the weight (w) — the wood there dips and springs back"；`uLandK` = "that perch's spring: amplitude (m), angular frequency, decay — a twig slow and deep, a bough short and firm"。→ **鸟落在栖枝上时枝条下沉回弹（弹簧-阻尼）**。
- 调色（引擎常量，SOURCE）：天空参考 #6180c3/#6483c6/#648BBA/#7ea9de/#bcd6f7/#b8c9dc/#d0dceа 等；日光暖色 #fff3dc/#ffe9c4/#ffd8b8/#f3c9a4/#e89a88；夜色 #030818/#0a1631/#070b14/#182a4ax；月光 #d8dceа/#c3adb0；树皮 #6b4d36/#7a5a40/#8a7448/#6e6252/#5a4a44；叶/羽 #7c8462/#a89a4e/#8f8145/#7a6f3c/#b5b060/#a8ad5a/#648BBA。
- 色板按钮色：Noon #7ea9de / Night #1a2237 / Morning #dcc4b3（`--sw`）。
- 种子系统：`seeds.desktop / seeds.mobile` 数组 + `seed` 入参；perches 列表（树枝栖点）来自资产侧车数据。`PARTIAL`

## 帧采样（evidence/screenshots/01, 04-look-*, 06-frame-*）

- **Noon**：天顶浅蓝 → 地平稍蓝渐变；左下 + 右下暖色积云（暖边 #F5C770/#F0B878 + 白）；中上偏右一枚灰白凸月（#C9D1E0）带环形坑纹理；右上粉色丝缕云；右下角高斯模糊的深棕枝叶前景（bokeh）。
- **Night**：深靛蓝→近黑渐变，繁星（hash 星点 + 微闪），云转暗青灰，枝叶成暗剪影。
- **Morning**：暖调渐变（浅蓝→微黄），云受金色侧光，光线暗示低角度太阳。
- 三帧 1.5s 间隔：云缓慢漂移（wind），无大幅物体运动（鸟为偶发事件）。

## REPLAY 路由与保真度分级

- 路由：**RAW_REPLAY 不可用**（引擎为专有代码 + 专有贴图 + 专有字体，决定不复制）→ **BEHAVIOR_REBUILD**（原创作曲式重建），fidelity tier: **PARTIAL_VISUAL**（构图/调色/运动语义对齐；笔触、PBR、树枝几何为近似）。
- 首个基线方案：单个全屏 WebGL fragment shader（原创 GLSL）：
  1. 天空：双色渐变 + 太阳/月亮（SDF 圆盘 + 坑纹噪声）+ 星场（hash 闪烁）
  2. 云：2-3 octave value-noise fbm，域扭曲，受光侧暖染
  3. 前景枝：SDF（boxDist + smin 平滑并集）沿右下角伸入，`windSway` 风摆
  4. 鸟：CPU 侧状态机（栖/落/飞），弹簧-阻尼落枝（`landSpring` 语义）；shader 或 2D overlay 绘制山雀剪影/色块
  5. 避让：`setShelters` 归一化文字矩形 → 鸟不落/不飞过文字区（`shelterDist` 语义）
  6. Time-of-day：三套参数（zenith/horizon/sun/moonGain/starGain/cloudTint）平滑过渡
- no-compensation-tuning：所有拟合值标注 GUESS 并在此记录。

## 不做（scope）

- 不复刻 PBR 树皮/羽毛贴图渲染、真实树枝 mesh、景深后处理管线（uFgBlur）→ 用 CSS `filter: blur()` 近似前景 bokeh。
- 不追求逐像素（风格化笔触差异计入 known-gaps）。
