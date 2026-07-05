# WordQuest — 产品需求文档 (PRD)

## 概述

WordQuest 是一个面向 IB PYP 学生的英语词汇练习游戏，通过 **Word Search（找词）** 和 **Crossword（填字）** 两种经典拼图模式，帮助学生在游戏中巩固高频词、自然拼读词族和学科词汇。项目为纯前端单页应用（SPA），无需后端，支持离线使用。

## 目标用户

- **主要用户**：IB PYP 学生（KG–G3，6–9 岁）
- **使用场景**：课堂词汇练习、课后自主复习、iPad 中心活动
- **设计原则**：大字大按钮、触控优先、即时反馈、无挫败感

## 游戏模式

### Word Search（找词）
- 在字母网格中隐藏目标词，学生通过 **拖拽滑动** 连选字母找词
- 找到全部隐藏词即完成，播放庆祝音效
- 网格大小和方向数量按年级分级（见下文"年级分级方向"）

### Crossword（填字）
- 根据线索（提示词）在交叉网格中 **填入字母**
- 默认交互为 **点选**（点字母 → 点格子），桌面端额外支持拖放
- 每填完一个单词即时校验：正确锁定绿色，错误闪红抖动，允许自我纠正
- 当可用词不足 4 个时禁用该模式
- 字母库提供全部所需字母，点击字母后点击空格填入；填错可重新选择
- 完成所有单词后触发庆祝

## UX 流程

```
选年级 → 选分类 → 选模式 → 游戏 → 完成庆祝 → 返回分类
```

### 屏幕说明

1. **Home（首页）**：4 个年级卡片（KG🌱 / G1⭐ / G2📚 / G3🎓），每张卡片显示进度点（`fullyDone / total`），点击进入该年级分类列表
2. **Categories（分类列表）**：展示该年级所有词库分类，每张卡片显示分类名、词数、WS/CW 星星状态（🔍 找词星 / ✏️ 填字星），两星全亮时卡片标记为完成
3. **Mode Select（模式选择）**：展示 Word Search 和 Crossword 两个模式卡片。Crossword 在可用词不足 4 个时禁用（半透明 + 禁止光标）
4. **Play（游戏）**：游戏交互界面，Word Search 自带头部和返回按钮，Crossword 由 `screens.js` 渲染头部。进入游戏后右上角 PYP Map 链接隐藏，替换为语音口音切换器；非游戏屏幕仍显示 PYP Map
5. **Done（完成庆祝）**：庆祝卡片 🎉，显示星星状态，提供"Play Again"（重取新词）和"Back to Categories"按钮

### 路由说明

Hash 路由（见 `js/router.js`）：

| Hash | 屏幕 | 说明 |
|------|------|------|
| `#/` | Home | 4 个年级卡片 + 进度点 |
| `#/g/:grade` | Categories | 该年级所有分类，显示词数和 WS/CW 星星 |
| `#/g/:grade/:cat` | Mode Select | 选 Word Search 或 Crossword |
| `#/g/:grade/:cat/:mode/play` | Play | 游戏界面 |

- **深度链接**：URL 查询参数 `?grade=g2` 可从首页直接跳转至该年级分类页
- **完成庆祝**：游戏完成后程序化显示 `renderDone` 卡片（非路由驱动），提供"Play Again"和"Back to Categories"

## 交互设计原则

- **即时反馈**：每次操作立即给出视觉/听觉反馈（颜色变化、音效、TTS 朗读）
- **无挫败感**：错误不阻断游戏，允许反复尝试直到正确；不计时、不扣分
- **触控优先**：所有可交互元素 ≥44px，支持触摸和鼠标双模式
- **渐进难度**：KG 从 2 方向简单词开始，G3 达到 8 方向全方向挑战
- **新词优先**：自动排除已练过的词，确保学习覆盖率

## 功能特性

### TTS 发音
- 使用浏览器 **Web Speech API** 朗读单词（见 `js/audio.js` 的 `speech.speak()`）
- 默认语速 `rate=0.85`（慢速适合儿童），语言 `en-US`
- iOS Safari 需在首次用户手势时解锁（`speech.unlock()`）

### 语音口音切换
- 游戏内右上角提供 **口音切换器**：🔊 默认 / 🇺🇸 美式 / 🇬🇧 英式 三个按钮
- 另有 **语音下拉选择器**，列出浏览器所有可用英语语音，按 American / British / Other 分组
- 默认保持系统语音；选择口音或语音后立即预览朗读 "hello"
- 偏好通过 `localStorage` 持久化（键 `wq_accent` / `wq_voice`），刷新后自动恢复
- 口音与特定语音互斥：选口音清除语音选择，选语音清除口音选择
- 详见 `js/voice-control.js` 和 `js/audio.js` 的 `speech` 对象

### Word Search 词表点击发音
- Word Search 词表中的每个单词 chip 可 **点击播放 TTS 发音**（`speech.speak(p.display)`）
- 找到词后自动朗读确认；点击 chip 可随时复习发音
- 详见 `js/wordsearch/controller.js` 的 `render()` 方法

### 进度星星
- 每个分类有 **WS 星** 和 **CW 星** 两颗星
- 完成对应模式即获得该星，两星都获得后分类标记为完成
- 进度存储在 `localStorage`（键 `pyp_wordquest_v1`），见 `js/progress.js`

### 子集分轮
- 每个分类的词库可能较多，每轮只取 **8 个词**（`progress.getRoundWords()` 默认 `count=8`）
- 通过 `cursor` 轮次指针和已见词列表，确保 **新词优先**，避免重复
- 同一轮需完成 WS 和 CW 两个模式后，cursor 才前进到下一轮

### 年级分级方向（Word Search）
网格中词的放置方向随年级递增（见 `js/wordsearch/grid.js`）：

| 年级 | 方向数 | 方向集合 |
|------|--------|----------|
| KG | 2 | → ↓ |
| G1 | 4 | → ↓ ← ↑ |
| G2 | 6 | → ↓ ← ↑ ↘ ↖ |
| G3 | 8 | 全部 8 个方向 |

## 词库

- **来源**：`src/data/vocabulary.md`，由 `scripts/convert-vocab.js` 自动生成 `js/data.js`
- **规模**：4 个年级（KG/G1/G2/G3），约 75 个分类，约 1000 个词
- **分类类型**：CVC 词族、Dolch/Fry 高频词、自然拼读（长元音、元音组合、r 控制元音等）、学科词汇（数学/科学）、学术词汇（Tier 2）、复合词、同音词等
- **词归一化**：`WordUtil.gridChars()` 会去除空格、连字符、撒号和括号说明（如 `"and (plus)"` → `"andplus"`），确保网格和填字只含纯字母

### 各年级词库范围

| 年级 | 词库重点 |
|------|----------|
| KG | CVC 词族（short a/e/i/o/u）、Dolch/Fry 高频词、数字词、颜色词、形状词、位置词 |
| G1 | Dolch 一年级词、Fry 101-200、长元音 silent E、辅音组合（digraphs/blends）、复合词、缩略词 |
| G2 | Dolch 二年级词、Fry 201-300、元音组合（ai/ay/ee/ea/oa/ow）、r 控制元音、前缀、复合词、同音词 |
| G3 | Dolch 三年级词、Fry 301-400、双元音（oi/oy/ou/ow）、后缀、软 c/g、不规则复数、不规则过去式 |

## 设备兼容

- **PC**：鼠标拖拽、键盘输入
- **iPad 横屏**：触摸滑动、点选交互（主要目标设备）
- **响应式断点**：820px 和 640px（见 `css/style.css`）
- **触控目标**：最小 44px，符合儿童手指触控需求
- **iOS Safari**：音频需在用户手势后解锁，已在 `main.js` 处理

## 技术约束

- **纯前端无后端**：所有逻辑在浏览器端，无 API 调用
- **CDN 加载**：无外部库依赖（Vanilla JS + Web APIs）
- **PWA 离线**：通过项目级 Service Worker（`src/sw.js`）支持离线访问
- **ES Modules**：`index.html` 以 `<script type="module">` 加载 `js/main.js`
- **无构建步骤**：游戏 HTML 直接由 Vite 开发服务器提供

## 课程整合

WordQuest 是 IB PYP Games 课程体系的一部分，通过 `src/data/curriculum-map.json` 映射到相应年级和学科通道。游戏可从 PYP 课程地图首页（`src/index.html`）通过链接访问，也可通过查询参数 `?grade=g2` 直接跳转至特定年级。

## 完成与重玩机制

- 每局游戏完成后调用 `onComplete` 回调，触发 `progress.recordCompletion()` 记录进度
- 完成后弹出 **垂直居中的模态卡片**（`.complete-overlay` 全屏遮罩 + `.complete-card` 居中卡片），显示星星状态、“Play Again” 和 “Back to Categories” 按钮
- "Play Again" 会销毁当前游戏实例并重新调用 `renderPlay`，通过 `getRoundWords` 重新选词（基于更新后的进度排除已见词）
- 同一轮需完成 WS 和 CW 两个模式后，`cursor` 才前进，确保同一组词在两种模式中都练习过

## 返回链接

页面右上角有 `PYP Map` 链接，返回 IB PYP 课程地图首页（`../../index.html`）。进入游戏界面后，PYP Map 链接隐藏，替换为语音口音切换器（详见“语音口音切换”特性）；退出游戏后恢复显示。

## 未来增强项

- ARIA 无障碍标签和键盘导航
- 跨设备进度同步（当前仅 localStorage）
- 自定义词库导入
