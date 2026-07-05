# WordQuest 单词游戏实现计划

## Context

项目需要一个新的英语词汇练习游戏，覆盖幼儿园到三年级。词库来源于 `src/data/vocabulary.md`（4 个年级、75 个分类、约 1000+ 单词），目前仅 Grade 1 部分词库被 spelling_bee 使用，KG/G2/G3 词库尚未利用。游戏提供 Word Search（滑动找词）和 Crossword（字母拖拽填字）两种模式，采用多邻国式过关流程，纯前端实现，无后端存储。这是 literacy 目录下新增的多文件目录游戏。

## 文件结构

采用目录模式（参考 `src/literacy/movespelling/`），路径 `src/literacy/wordquest/`：

```
src/literacy/wordquest/
├── index.html              # SPA 外壳：viewport、PYP Map 链接、#app 容器、脚本引用
├── css/
│   └── style.css           # 全部样式（多邻国风格、44px 触控、820px/640px 响应式）
├── js/
│   ├── data.js             # 内嵌词库对象 VOCAB（从 vocabulary.md 转换）+ WordUtil 归一化工具
│   ├── audio.js            # SpeechManager（Web Speech 发音）+ SfxManager（Web Audio 音效）
│   ├── progress.js         # localStorage 读写、轮次/星星/完成判定
│   ├── router.js           # hash 路由 + URL 参数解析
│   ├── screens.js          # 各屏幕渲染：年级/分类/模式选择/游戏宿主/完成页
│   ├── wordsearch/
│   │   ├── grid.js         # 网格生成 + 单词放置（按年级分级方向）+ 随机字母填充
│   │   └── controller.js   # Pointer Events 滑动检测、高亮、完成检测
│   ├── crossword/
│   │   ├── generator.js    # 交叉填字生成器（贪心+多种子重试+受限回溯+模板兜底）
│   │   ├── layout.js       # 稀疏网格→紧凑二维网格、编号 across/down
│   │   └── controller.js   # 26 字母点选/拖拽交互、逐词即时校验、庆祝
│   └── main.js             # 入口：解锁音频、初始化路由、加载首屏
```

返回链接（写入 index.html，2 层深）：
- `<a class="pyp-map-link" href="../../index.html">PYP Map</a>`（复用 movespelling 的样式块）
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

## 关键技术决策

### 1. 词的归一化与过滤

词库中存在不适合网格游戏的特殊词，运行时用 `WordUtil` 派生处理：

| 词类型 | 例子 | Word Search | Crossword |
|---|---|---|---|
| 单字母 `a`/`I` | KG sight words | 剔除 | 剔除 |
| 双字母 `of/to/in` | sight words | KG/G1 允许（最短 2） | 剔除（交叉点过少） |
| 含空格 `life cycle` | G2 Science | 网格用 `lifecycle` 连续放置，展示写原形 | 降级为词库展示词 |
| 含撇号 `don't` | G1 Contractions | 剔除撇号用 `dont`，展示写 `don't` | 同上 |
| 含连字符 `non-living` | G2 Academic | 网格用 `nonliving` | 降级为词库展示词 |
| 带括号 `and (plus)` | KG Math | 取 `and` | 取 `and` |

- `WordUtil.gridChars(word)`：去空格/连字符/括号说明，返回纯小写字母串
- `WordUtil.isGridUsable(word, minLen)`：判断是否适合网格
- Crossword 严格过滤：仅接受 `gridChars` 为纯 a-z 且长度 3-8 的词；不满足的降级为"词库展示词"（侧边列出可点发音，不进网格）

### 2. Word Search 引擎

- **网格大小**：`clamp(max(longestWordLen, round(sqrt(totalLetters*1.6))), 8, 16)`，KG 偏小（8-10），G3 偏大（12-16）
- **方向分级**（难度递增）：KG 仅水平→/垂直↓；G1 加反向水平/垂直；G2 加正对角；G3 全 8 方向
- **放置算法**：每词随机方向+随机起点，最多 100 次尝试；允许同字母共享重合；若放不下则整盘重洗最多 5 次
- **空格填充**：优先用目标词中的字母（提高干扰），剩余按字母频率加权
- **滑动检测**：统一用 Pointer Events（同时覆盖鼠标+触摸）；用 `dr/dc` 轴关系判断直线（H/V/对角），非直线不扩展；支持快速跳格滑动；`touch-action: none` 防滚动
- **匹配**：选区字母串正反都比对目标词；命中则常亮绿色、列表勾除、发音+音效

### 3. Crossword 生成器（核心风险点）

**可靠性四级保障**：
1. **不强制全放置**：允许部分词作为"词库展示词"不进网格，把 NP 难约束降为"尽量多放置"
2. **多种子重试**：打乱词序跑 40 次，保留"放置数最多、紧致度最好"的解
3. **贪心+受限回溯**：长词优先，按交叉点评分排序候选位；放不下回退上一词
4. **模板兜底**（第一版就实现）：3-5 个预设布局模板，自动生成结果不佳时回退，保证 100% 可生成

**核心算法**：
- 输入：6-8 个纯 a-z 长度 3-8 的词
- 稀疏表示：`Map<"r,c" → char>`
- `findCandidates`：遍历待放词每个字母与已放词同字母格，生成交叉候选
- **合法性校验**（命门）：首尾外邻必须空；非交叉格必须空且左右邻格必须空（防误连词）；交叉点字母一致
- `layout.js` 紧致化：扫描 min/max r,c 平移到 (0,0)，导出二维数组（null=黑格）；标准 crossword 编号

**交互**：默认点选模式（点字母→点格子填入，iPad 友好），拖拽作为桌面增强
**校验**：逐词即时（Duolingo 式）——某词所有格填满时立即校验，全对变绿+发音，有错变红+shake

### 4. 进度系统

localStorage 键 `pyp_wordquest_v1`：
```json
{
  "byGrade": {
    "g1": {
      "short-a-cvc": {
        "rounds": [{ "words": [...], "ws": true, "cw": true }],
        "cursor": 1, "starWS": true, "starCW": true
      }
    }
  }
}
```
- 每轮抽 8-10 词，大分类多轮；优先抽未在历史 rounds 出现过的词
- 分类完成 = 至少玩过一轮且该轮双模完成（给星星，避免"必须玩遍 75 词"的疲劳）

### 5. 屏幕/路由

hash 路由单页应用：
- `#/` 年级选择（4 张大卡 KG/G1/G2/G3，全开放）
- `#/g/:grade` 分类选择（网格卡，带星星/勾状态）
- `#/g/:grade/:cat` 模式选择（Word Search / Crossword 两张大卡）
- `#/g/:grade/:cat/:mode/play` 游戏宿主
- 完成页：confetti + "再玩一轮/换模式/返回分类"
- 支持 `?grade=g2` query 深链

视觉风格：紫色主色 `#7c3aed`、绿 `#10b981`、红 `#ef4444`、星黄 `#fbbf24`；圆润字体；硬偏移阴影；按钮 `:active` 下移；答对 bounce、答错 shake；canvas confetti 庆祝。复用 `src/uoi/g2_vocabulary.html` 的 speak/sound/confetti/44px/820px 范式。

## 实现任务分解

### Task 1: 基础骨架 + 词库数据
- 新建 `src/literacy/wordquest/` 目录结构
- `index.html`：viewport、PYP Map 链接（`../../index.html`）、`#app` 容器、脚本引用（带 `?v=` 版本号）
- `js/data.js`：从 vocabulary.md 转换全部 75 个分类为 `VOCAB` 对象（kg/g1/g2/g3）+ `GRADES` 数组 + `WordUtil` 工具
- `css/style.css`：CSS 变量、基础布局、按钮、卡片、触控 44px、820px/640px 响应式、pyp-map-link 样式
- 参考：`src/literacy/movespelling/index.html`（目录模式+返回链接）、`src/uoi/g2_vocabulary.html`（CSS 变量+响应式）

### Task 2: 音频 + 进度 + 路由
- `js/audio.js`：SpeechManager（`speechSynthesis`，rate 0.85，US 英语）+ SfxManager（Web Audio 正确/错误音效）；用户手势后解锁
- `js/progress.js`：localStorage 读写、轮次管理、完成判定、星星状态
- `js/router.js`：hash 路由 + `URLSearchParams` 解析 `?grade=`/`?cat=`/`?mode=`
- 参考：`src/uoi/g2_vocabulary.html`（speak/sound 解锁范式，第 927-983 行）

### Task 3: Word Search 引擎
- `js/wordsearch/grid.js`：网格生成、按年级分级方向放置、随机字母填充、整盘重洗
- `js/wordsearch/controller.js`：Pointer Events 滑动检测、直线判定、高亮、匹配、完成检测、confetti
- 单元逻辑：对 75 个分类各跑生成，确保无放不下词

### Task 4: Crossword 生成器 + 交互（风险最高）
- `js/crossword/generator.js`：贪心+40 次重试+受限回溯；`findCandidates`+严格合法性校验
- `js/crossword/layout.js`：稀疏→紧凑二维网格、across/down 编号
- `js/crossword/controller.js`：26 字母点选/拖拽、逐词即时校验、shake/bounce、confetti
- **模板兜底**：3-5 个预设布局，生成不佳时回退
- 风险控制：对 75 个分类各跑 100 次，统计 unplaced 分布，确保模板兜底覆盖率

### Task 5: 屏幕 + 主入口
- `js/screens.js`：年级/分类/模式/游戏宿主/完成页各屏幕渲染
- `js/main.js`：入口，解锁音频、初始化路由、加载首屏
- 完整流程串联：选年级→选分类→选模式→游戏→完成→返回分类

### Task 6: 课程注册 + 验证
- 在 `src/data/curriculum-map.json` Grade 1 → Home Learning → literacy subject 的 games 数组追加：
  ```json
  {
    "title": "WordQuest - Word Search & Crossword",
    "path": "literacy/wordquest/index.html",
    "type": "New",
    "description": "Find hidden words and fill crosswords across KG-G3 vocabulary categories.",
    "tags": ["vocabulary", "wordsearch", "crossword"]
  }
  ```
- 可选：Grade 2 → Home Learning → 新增 literacy lane，注册 `?grade=g2` 变体（注意 G3 status=planned 不可注册）
- 运行 `npm run qa:curriculum` 必须全绿
- 运行 `npm run build` 生成首页+刷新 SW 缓存

## 关键文件

- 新建：`src/literacy/wordquest/index.html` 及 `css/`、`js/` 全部子文件
- 修改：`src/data/curriculum-map.json`（第 15-38 行 literacy games 数组追加注册条目）
- 词库源：`src/data/vocabulary.md`（只读参考，转成 data.js 内嵌）
- 参考范式：`src/uoi/g2_vocabulary.html`（SPA+音频+confetti+响应式全套模板）、`src/literacy/movespelling/index.html`（目录模式+返回链接）

## 验证方式

1. **QA 校验**：`npm run qa:curriculum` 全绿（viewport + 返回链接 + curriculum-map 注册 + 文件存在性）
2. **构建**：`npm run build` 成功（generate-index 生成首页 + 刷新 sw.js 缓存版本）
3. **本地运行**：`npm run dev`，访问 `http://localhost:5173/literacy/wordquest/index.html`
4. **浏览器 E2E**（Browser 代理）：
   - 完整流程：选年级→选分类→选模式→完成游戏→返回分类
   - Word Search：滑动找词（鼠标+触摸）、找到词高亮+发音、完成庆祝
   - Crossword：点选字母填入、逐词校验（对绿错红）、完成庆祝
   - 进度：localStorage 持久、星星标记显示
   - iPad 横屏（820px viewport）：触控目标 44px+、布局不溢出
5. **Crossword 可靠性**：遍历 75 个分类各生成 100 次，确认无空白页、模板兜底有效

## 风险与缓解

1. **Crossword 生成不可靠**（头号风险）：四级保障+模板兜底第一版就上；遍历测试 75 分类
2. **短词/特殊词**：sight words 含大量 1-2 字母词，Crossword 词池不足时自动降级为"仅 Word Search 可选"
3. **iOS 发音解锁**：首屏任一用户手势后才调 `speechSynthesis` 与 `AudioContext.resume()`
4. **iOS 拖拽**：HTML5 Drag API 在 Safari 支持差，Crossword 默认点选模式，拖拽仅桌面增强
5. **词库体积**：约 1000 词内嵌为 JS 对象，gzip 后数十 KB，可接受