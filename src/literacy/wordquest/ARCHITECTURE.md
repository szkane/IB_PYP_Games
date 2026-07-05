# WordQuest — 开发架构文档

## 文件结构

```
src/literacy/wordquest/
├── index.html                      # SPA 外壳，挂载 #app，含 voice-switcher 容器，加载 main.js
├── PRD.md                          # 产品需求文档
├── ARCHITECTURE.md                 # 本文档
├── css/
│   └── style.css                   # 全局样式（CSS 变量、响应式、触控、语音切换器、完成遮罩）
└── js/
    ├── main.js                     # 入口：路由初始化 + 音频解锁 + 语音切换器显隐控制
    ├── router.js                   # Hash 路由 + 查询参数解析
    ├── data.js                     # 词库数据 (VOCAB) + WordUtil 工具
    ├── audio.js                    # 音频系统：speech (TTS + 语音/口音管理) + sfx (振荡器音效)
    ├── voice-control.js            # 语音口音切换器 UI（初始化 + 显隐控制）
    ├── progress.js                 # 进度系统：localStorage 持久化
    ├── screens.js                  # 屏幕渲染 + 游戏编排（renderDone 模态遮罩）
    ├── wordsearch/
    │   ├── grid.js                 # WS 网格生成器
    │   └── controller.js           # WS 交互控制器（拖拽选词 + 词表 chip 点击发音）
    └── crossword/
        ├── generator.js            # CW 生成器（多种子贪心算法）
        ├── layout.js               # CW 布局（密集网格 + 线索编号）
        └── controller.js           # CW 交互控制器（点选填字）
```

## 数据流

```
router.init()
  → hashchange 事件
  → router._fire() 解析 route + query
  → main.handleRouteChange(route, query)
    → destroyCurrentGame()          # 清理上一局
    → app.innerHTML = ''            # 清空容器
    → showVoiceControl(action==='play')  # 游戏内显示语音切换器，否则显示 PYP Map
    → screens.render*(app, ...)     # 渲染对应屏幕
      └─ renderPlay()
        → progress.getRoundWords()  # 取本轮词
        → new WordSearchGame/CrosswordGame(container, opts)
        → game.start()
        → 完成时 onComplete 回调
          → progress.recordCompletion()
          → screens.renderDone()    # 庆祝卡片
```

**关键约定**：
- `screens.js` 中的 `currentGame` 模块级变量持有当前游戏实例
- 每次路由切换时 `main.js` 调用 `destroyCurrentGame()` 释放事件监听和 DOM
- `renderDone` 不是路由驱动的，而是游戏 `onComplete` 回调程序化触发

## 关键算法

### Word Search 网格生成（`js/wordsearch/grid.js`）

`generateGrid(rawWords, gradeId)` 流程：

1. **词清洗与过滤**：通过 `WordUtil.gridChars()` 转换，只保留 `[a-z]+`、长度 2–12 的词，按清洗形式去重
2. **网格尺寸计算**：基于最长词和总字母数 `sqrt(totalLetters * 1.6)`，限制在年级范围内
   - KG: 8–10, G1: 8–12, G2: 10–14, G3: 12–16
3. **放置策略**：
   - 按年级选择方向集（KG:2方向 → G3:8方向）
   - **长词优先**：先按长度降序，同长度随机排序
   - 每个词尝试 **100 次**随机位置+方向，允许同字母交叉重叠
   - 整体最多 **5 次重洗**，全部放置成功即返回；最后一次接受部分结果
4. **填充空格**：70% 从已用字母池随机取（使网格更紧凑），30% 按英语字母频率加权

### Crossword 生成四级保障（`js/crossword/generator.js`）

`generateCrossword(rawWords)` 采用多层可靠性策略：

1. **不强制全放置**：词数限制 `MAX_WORDS=8`，只选前 8 个；词数 <4 直接返回空（模式禁用）
2. **多种子重试**：`N_SEEDS=40` 次随机打乱尝试，每次按长词优先排序，取 `score = placed.length * 100 - bboxArea` 最优解；全放置且 ≥5 词时提前终止
3. **严格邻接约束**：`canPlace()` 确保不产生意外单词合并（检查交叉点字母一致、端点无相邻字母）
4. **模板兜底**：若放置数 < min(5, selected.length)，调用 `templateFallback()` 通过任意匹配字母交替水平/垂直放置

**候选评分**（`findCandidates`）：遍历词中每个字母，在已放置词的格子中找同字母，生成水平/垂直交叉候选，按 `scoreCandidate`（交叉密度+紧凑度）排序，取前 `MAX_CANDIDATES=12` 个尝试。

**两轮放置**：`tryBuild()` 先放置所有词，再对未放置词做第二轮重试（后续放置创造新的交叉机会）。

### WordUtil 词归一化（`js/data.js`）

```javascript
WordUtil.gridChars(word, { keepApostrophe = false })
```

转换规则（顺序执行）：
1. 去除括号说明：`"and (plus)"` → `"and"`（正则 `/\s*\([^)]*\)\s*/g`）
2. 去除连字符和空格：`"life cycle"` → `"lifecycle"`
3. 默认去除撇号：`"don't"` → `"dont"`（`keepApostrophe=true` 时保留）

**用途**：确保网格和填字只包含纯字母，便于放置算法处理。

`isGridUsable(word, minLen)`：检查清洗后是否为 `[a-z]+` 且长度 ≥ minLen。
`pickRound(category, count, seenWords)`：从可用词中优先选未见词，不足时从全词池补足，洗牌后取前 count 个。

## 音频系统（`js/audio.js`）

### speech — TTS 语音合成（Web Speech API）

```javascript
speech.speak(text, { rate = 0.85, lang = 'en-US' })
```

- `unlock()`：首次用户手势时触发引擎加载（iOS Safari 必需），随后调 `restorePreference()` 恢复保存的偏好，并监听 `voiceschanged` 事件异步加载语音
- `getVoices()`：返回 `speechSynthesis.getVoices()` 中所有 `lang.startsWith('en')` 的英语语音
- `setAccent(accent)`：按口音设置语音，`'default'` 清除选择，`'us'` 取首个 `en-US` 语音，`'uk'` 取首个 `en-GB` 语音；偏好存入 `localStorage` 键 `wq_accent`
- `setVoice(voiceURI)`：按 `voiceURI` 精确选择语音，存入 `localStorage` 键 `wq_voice`
- `restorePreference()`：从 `localStorage` 恢复 `wq_voice`（优先）或 `wq_accent` 偏好
- `speak()`：取消正在播放的语音，创建 `SpeechSynthesisUtterance`；若有 `_selectedVoice` 则使用该语音的 `voice` 和 `lang`，否则回退到首个 `en` 语音
- 朗读用于找词确认、填字提示、词表 chip 点击发音、完成庆祝

### sfx — 音效（Web Audio API 振荡器）

无音频文件，全部用振荡器实时合成：

| 方法 | 效果 | 实现 |
|------|------|------|
| `correct()` | 答对：C5→E5→G5 上行 | 三个 sine 波 0.12s |
| `wrong()` | 答错：低沉下行蜂鸣 | 220→180Hz sawtooth |
| `complete()` | 完成：C-E-G-C 上行琶音 | 四个 sine 波 0.2s 间隔 120ms |
| `found()` | 找到词：短上行 | 659→880Hz sine |

## 进度系统（`js/progress.js`）

- **存储键**：`localStorage` 的 `pyp_wordquest_v1`
- **数据结构**：`{ version: 1, byGrade: { [gradeId]: { [catId]: { rounds, cursor, starWS, starCW } } } }`
- **轮次机制**：
  - `rounds[]`：每轮 `{ words, ws, cw }`，记录该轮用的词和两个模式完成状态
  - `cursor`：当前轮次指针
  - `recordCompletion()`：标记模式完成；当 `ws && cw` 同时为 true 时 cursor 前进
  - `getRoundWords()`：通过 `WordUtil.pickRound()` 选词，排除已见词（`rounds.flatMap(r => r.words)`）
- **星星**：`starWS`/`starCW` 一旦获得永久保留（即使后续轮次未完成）
- **年级聚合**：`getGradeProgress()` 统计 total/wsDone/cwDone/fullyDone

## 语音口音系统

语音口音系统由 `js/audio.js` 的 `speech` 对象和 `js/voice-control.js` 切换器 UI 协同实现。

### speech 对象的语音管理

- `getVoices()`：返回所有英语语音（`lang.startsWith('en')`）
- `setAccent('default'|'us'|'uk')`：按口音选取对应语音，偏好存入 `localStorage` 键 `wq_accent`
- `setVoice(voiceURI)`：按 `voiceURI` 精确选择语音，存入 `localStorage` 键 `wq_voice`
- `restorePreference()`：优先恢复 `wq_voice`，其次 `wq_accent`；在 `unlock()` 和 `voiceschanged` 事件中调用
- `speak()`：优先使用 `_selectedVoice`，无选择时回退到首个 `en` 语音

### voice-control.js 切换器

`initVoiceControl()` 在 `DOMContentLoaded` 时调用，负责：
- 填充语音下拉 `<select>`：按 `en-US` / `en-GB` / 其他英语分组为 `<optgroup>`
- 绑定口音按钮（🔊 默认 / 🇺🇸 美式 / 🇬🇧 英式）click 事件，调 `speech.setAccent()` 并预览朗读 "hello"
- 绑定 `<select>` change 事件，调 `speech.setVoice()` 或重置为默认
- 监听 `speechSynthesis.voiceschanged` 事件（Chrome 异步加载语音），重新填充下拉
- 从 `localStorage` 恢复保存的偏好并同步按钮激活状态

`showVoiceControl(show)` 在路由切换时由 `main.js` 调用：
- `show=true`（游戏界面）：显示 `#voice-switcher`，隐藏 `.pyp-map-link`
- `show=false`（非游戏界面）：隐藏 `#voice-switcher`，显示 `.pyp-map-link`

### localStorage 持久化

| 键 | 值 | 说明 |
|----|----|------|
| `wq_accent` | `'default'` / `'us'` / `'uk'` | 口音偏好 |
| `wq_voice` | `voiceURI` 字符串 | 特定语音偏好（优先于 `wq_accent`） |

选择口音时清除 `wq_voice`，选择特定语音时清除 `wq_accent`，两者互斥。

### voiceschanged 异步加载处理

Chrome 浏览器的 `speechSynthesis.getVoices()` 在页面加载时可能返回空数组，语音列表通过 `voiceschanged` 事件异步通知。系统在以下位置监听该事件：
- `speech.unlock()`：恢复偏好并重新监听
- `voice-control.js`：重新填充下拉选项

Safari 通常在加载时即可获取语音列表，因此初始调用 `populateVoices()` 也会执行。

## CSS 主题（`css/style.css`）

### CSS 变量

```css
:root {
  --bg: #f5f3ff;           /* 浅紫背景 */
  --ink: #1e1b4b;           /* 深紫文字 */
  --accent: #7c3aed;        /* 紫色主色 */
  --accent-light: #ede9fe;  /* 浅紫强调 */
  --good: #10b981;          /* 绿色（正确） */
  --bad: #ef4444;           /* 红色（错误） */
  --star: #fbbf24;          /* 金色（星星） */
  --shadow: #2e1065;        /* 阴影色 */
  --radius: 16px;           /* 圆角 */
}
```

### 响应式设计

- **触控目标**：最小 44px（符合 iOS HIG 触控标准）
- **断点**：820px（平板横屏）、640px（手机）
- **字体**：`ui-rounded, "Avenir Next", "Nunito", sans-serif`（圆体，儿童友好）
- **禁用文本选择**：`#app, .game-host, .screen` 设 `user-select: none`
- Crossword 控制器内联注入 CSS（`CW_CSS` 常量），格子大小 `clamp(32px, 7vw, 48px)`

### 语音切换器样式

- `.voice-switcher`：`position:fixed` 右上角容器，与 `.pyp-map-link` 同位置（两者交替显示），`z-index:9999`
- `.accent-btn`：口音按钮（🔊/🇺🇸/🇬🇧），`.active` 状态加紫色边框 + 浅紫背景
- `.voice-select`：语音下拉框，`max-width:140px`，响应式缩窄至 120px / 100px

### 完成遮罩样式

- `.complete-overlay`：`position:fixed;inset:0` 全屏模态遮罩，`display:flex` 垂直水平居中，`background:rgba(15,15,26,0.35)` 半透明，`z-index:10000`
- `.complete-card`：居中卡片，`popIn` 弹入动画，`max-width:400px`
- `renderDone` 使用 fixed 定位，无需 `scrollIntoView`

## 已知限制

1. **CVC 押韵词族 Crossword 词数不足**：部分分类（如 CVC 词族）词数虽多，但 3–8 字母纯字母词可能不足 4 个，导致 Crossword 模式被禁用
2. **词归一化副作用**：`gridChars()` 去除撇号后，`"don't"` 变为 `"dont"`，TTS 朗读原始词但网格显示归一化形式
3. **Crossword 不保证全放置**：算法以"放置尽量多的词"为目标，部分词可能进入 `unplaced` 列表（仅作展示用）
4. **进度仅本地**：进度存储在 localStorage，清除浏览器数据会丢失；无跨设备同步
5. **无障碍**：未实现 ARIA 标签和键盘导航，主要面向触控/鼠标交互
