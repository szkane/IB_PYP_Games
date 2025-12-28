# Product Requirement Document (PRD)

## Project Name: MoveSpell - Magic Hand Edition

**Version:** 1.0
**Target Audience:** Children aged 6-8
**Platform:** HTML5 Static Web Page (Desktop/Tablet)

---

### 1. 核心概述 (Executive Summary)

- **产品定义**：一款基于 Web 摄像头的体感拼写游戏。用户无需鼠标键盘，通过“隔空手势”抓取字母球体完成单词听写。
- **设计理念**：将枯燥的单词记忆转化为活跃的“魔法”游戏 (Exergaming)。
- **关键约束**：
  1.  **纯静态 (Pure Static)**：无需后端数据库，不上传视频流，所有逻辑在浏览器端运行。
  2.  **零接触 (Zero Touch)**：全流程（包括菜单选择）均通过手势完成。
  3.  **可配置 (Configurable)**：基于本地 JSON 文件管理词库。

---

### 2. 技术架构规范 (Technical Specifications)

**本项目的核心技术原则：No Backend, Client-Side Only.**

- **架构模式**：Single Page Application (SPA)。
- **部署环境**：任意静态托管服务 (GitHub Pages, Vercel, Netlify) 或本地打开 `index.html` (需解决 CORS 问题)。
- **数据存储**：
  - **词库**：外部 `words.json` 文件。
  - **用户设置/进度**：浏览器 `localStorage`。
- **核心库 (Tech Stack)**：
  - **Vision AI**：`MediaPipe Hands` (Google) - 用于高精度手指/手势识别。
  - **Game Engine**：`Phaser 3` - 处理物理碰撞、精灵渲染、粒子特效。
  - **Audio**：`Web Speech API` (TTS) - 离线语音合成。
- **代码规范 (Code Convention)**：
  - **注释语言**：**English** (Critical for maintainability).
  - **变量命名**：CamelCase (e.g., `currentWord`, `isHandClosed`).

---

### 3. 数据结构 (Data Structure)

词库文件路径：`assets/data/words.json`。
结构采用层级化设计，便于家长/教师编辑。

```json
{
  "meta": {
    "title": "Primary English Vocabulary",
    "version": "1.0",
    "author": "MoveSpell Team"
  },
  "curriculum": [
    {
      "grade": "1",
      "label": "Grade 1",
      "units": [
        {
          "unit": "1",
          "label": "Unit 1: Colors",
          "words": ["RED", "BLUE", "GREEN", "YELLOW"]
        },
        {
          "unit": "2",
          "label": "Unit 2: Animals",
          "words": ["CAT", "DOG", "BIRD", "FISH"]
        }
      ]
    },
    {
      "grade": "2",
      "label": "Grade 2",
      "units": [
        {
          "unit": "1",
          "label": "Unit 1: Weather",
          "words": ["SUNNY", "RAINY", "WINDY"]
        }
      ]
    }
  ]
}
```

---

### 4. 用户流程与交互设计 (UX Flow)

整个应用分为三个主要场景 (Scenes)。

#### 4.1 Scene 1: 启动与配置 (The Setup Hub)

摒弃下拉菜单，使用**空间选择 (Spatial Selection)**。

1.  **Theme Selection (风格选择)**

    - **UI**: 屏幕左右两侧各有一扇“魔法门”。
      - Left: 🤖 **Sci-Fi (Cyberpunk Blue)**
      - Right: 🧚‍♀️ **Fantasy (Magic Forest Green)**
    - **Interaction**: 检测用户手掌中心坐标，悬停 (Hover) 在某一侧超过 1.5 秒 即选中。
    - **Auto-Detect (Optional)**: 尝试识别面部特征，高亮推荐的一侧，但最终由用户手势决定。

2.  **Voice Accent (口音设置)**

    - **UI**: 两个悬浮徽章 🇺🇸 (US) 和 🇬🇧 (UK)。
    - **Interaction**: 手势抓取 (Fist) 徽章。系统调用 TTS 播放试听音 "Hello!"。

3.  **Difficulty Level (难度选择)**

    - **UI**: 三个悬浮台阶。
      - **Easy**: 显示 `C _ T` (挖空 1 个)。
      - **Medium**: 显示 `_ P P L _` (挖空 50%)。
      - **Hard**: 显示 `_ _ _ _ _` (全空)。
    - **Interaction**: 悬停确认。

4.  **Content Selection (课程选择)**
    - **UI**:
      - Step 1: 列出 `Grade` 列表。
      - Step 2: 选中 Grade 后，列出该 Grade 下的 `Units`。
      - **Special Option**: 列表首项始终是 **"⭐ All Units"** (合并该年级所有单词)。

#### 4.2 Scene 2: 游戏主循环 (The Game Loop)

**核心机制：Grab & Drop (抓取与投放)**

1.  **Phase: Listen (听题)**

    - 无图片提示。
    - TTS 播放: "Spell: [Word]".
    - 屏幕底部显示空缺容器 (Slot Container).

2.  **Phase: Spawn (生成)**

    - 屏幕上方生成 3-5 个漂浮的 **Letter Orbs (字母球)**。
    - **Orb Composition**: 正确字母 + 智能干扰项 (Smart Distractors).

3.  **Phase: Action (手势操作)**

    - **Hover (移动)**: 张开手掌 (Open Palm)。屏幕光标跟随手掌移动。
    - **Grab (抓取)**: 握拳 (Fist)。当光标重叠字母球时握拳，球体被“吸附”在光标上。
    - **Drop (投放)**: 保持握拳移动到底部空缺处，张开手掌 (Open Palm) 释放球体。

4.  **Phase: Feedback (判定)**
    - **Correct**: 球体嵌入空缺，锁定颜色，播放 "Ping" 音效。
    - **Wrong**: 球体被物理弹开 (Physics Bounce)，播放 "Boing" 音效，球体飞回上方重置。

#### 4.3 Scene 3: 结算 (Results)

- 展示本次练习的星级评分 (1-3 Stars)。
- "Play Again" 按钮（悬停触发）。

---

### 5. 核心算法逻辑 (Core Logic)

为了便于后期修改，这部分逻辑在代码中应有清晰的模块划分。

#### 5.1 手势状态机 (Gesture State Machine)

_我们需要一个稳定的算法来判断“抓取”。_

```javascript
/**
 * Detects if the user is making a fist or open palm.
 * Based on MediaPipe landmarks.
 * @param {Array} landmarks - The 21 hand keypoints provided by MediaPipe
 * @returns {String} 'FIST' | 'OPEN' | 'IDLE'
 */
function detectHandState(landmarks) {
  // 1. Calculate distance between fingertips and wrist/palm base
  // 2. If tips are close to palm base -> FIST
  // 3. If tips are extended -> OPEN
  // 4. Use a threshold value to prevent flickering
}
```

#### 5.2 智能干扰项生成 (Smart Distractor Algorithm)

不依赖硬编码，根据字母特性实时生成干扰。

```javascript
const CONFUSION_MAP = {
  // Phonetic confusion (Sound alike)
  C: ["K", "S"],
  F: ["V", "PH"],
  // Visual confusion (Look alike)
  M: ["W", "N"],
  Q: ["O", "D"],
};

/**
 * Generates distractor letters for a target letter.
 * Priority: Phonetic > Visual > Random Vowel (if target is vowel) > Random
 */
function generateDistractors(targetLetter, count) {
  // Implementation logic here...
}
```

---

### 6. 视觉 UI 系统 (Theming System)

利用 CSS Variables 实现换肤，JS 仅需切换 `document.body.className`。

**CSS 变量定义示例：**

```css
/* Theme: Sci-Fi (Default) */
:root {
  --bg-color: #0b0f19;
  --primary-color: #00f3ff; /* Neon Cyan */
  --orb-texture: url("assets/images/orb-tech.png");
  --font-family: "Orbitron", sans-serif;
}

/* Theme: Fantasy */
body.theme-fantasy {
  --bg-color: #1a0b19;
  --primary-color: #ff00cc; /* Magic Pink */
  --orb-texture: url("assets/images/orb-magic.png");
  --font-family: "Comic Neue", cursive;
}
```

---

### 7. 开发路线图 (Development Roadmap)

1.  **Milestone 1: The Engine (Skeleton)**

    - Setup HTML5 project structure.
    - Integrate MediaPipe Hands.
    - Debug View: Draw hand skeleton on canvas and output text "Fist" or "Open" reliably.

2.  **Milestone 2: The Game Physics**

    - Integrate Phaser 3.
    - Implement "Grab & Drop" logic: Create a sprite that follows the hand coordinates only when `isFist === true`.

3.  **Milestone 3: Data & Logic**

    - Implement JSON loader.
    - Implement TTS engine with US/UK toggle.
    - Implement `generateDistractors()` algorithm.

4.  **Milestone 4: The UI & Polish**
    - Build the "Portal" selection scene.
    - Apply CSS themes.
    - Add sound effects (SFX).

---

### 8. 附录：文件目录结构建议 (Project Structure)

```text
/movespell-game
|-- /assets
|   |-- /data
|   |   +-- words.json       <-- User Editable
|   |-- /images
|   |   +-- texture-space.png
|   |   +-- texture-forest.png
|   |-- /audio
|       +-- sfx-correct.mp3
|       +-- sfx-wrong.mp3
|-- /css
|   +-- style.css            <-- Handles Themes
|-- /js
|   |-- /core
|   |   +-- hand-tracker.js  <-- MediaPipe Logic
|   |   +-- audio-manager.js <-- TTS Logic
|   |-- /game
|   |   +-- scene-setup.js   <-- Menu Interaction
|   |   +-- scene-play.js    <-- Main Game Loop
|   |   +-- spawner.js       <-- Distractor Algorithm
|   +-- main.js              <-- Entry Point
|-- index.html
```

---

### 9. UI/UX 设计规范 (UI/UX Design Guidelines)

#### 9.1 儿童友好配色 (Child-Friendly Colors)

**核心原则：避免使用"成人感"的深色科技风，改用明亮、温暖、友好的色调。**

| Theme           | 背景色           | 主色             | 强调色             | 字体    |
| --------------- | ---------------- | ---------------- | ------------------ | ------- |
| Ocean Adventure | `#e8f4fc` (浅蓝) | `#4fc3f7` (天蓝) | `#ff9800` (橙色)   | Fredoka |
| Magic Forest    | `#f3e5f5` (浅紫) | `#ab47bc` (紫色) | `#ff7043` (珊瑚橙) | Fredoka |

**推荐字母球颜色:**

- 正确反馈: `#66bb6a` (明亮绿色)
- 错误反馈: `#ef5350` (柔和红色)
- 手势光标: `#ff9800` (橙色，高对比度)

#### 9.2 响应式设计 (Responsive Design)

**必须支持的屏幕尺寸:**

- **2K** (2560x1440): 放大元素，保持可读性
- **4K** (3840x2160): 进一步放大，避免元素过小
- **iPad 横屏** (1024x768 ~ 1366x1024): 全屏交互模式

**实现方式:**

- 使用 CSS `clamp()` 函数实现流体尺寸
- 示例: `--orb-size: clamp(80px, 10vw, 120px);`
- 使用 `100dvh` (Dynamic Viewport Height) 适配移动端

#### 9.3 元素布局优化 (Element Layout)

**问题:** 摄像头手势追踪时，如果字母球和插槽距离太远，用户需要大幅度移动手臂，导致：

1. 摄像头可能拍不到全身
2. 在大屏幕上操作疲劳

**解决方案:**

- **插槽位置**: 屏幕高度的 70-75% 处 (距底部 25-30%)
- **字母球位置**: 屏幕高度的 30-55% 处 (靠近插槽)
- **字母球排列**: 水平分布，便于视觉扫描
- **尺寸放大**:
  - 字母球半径: `min(width, height) * 0.05` (至少 40px)
  - 插槽尺寸: `min(width, height) * 0.08` (至少 70px)

```javascript
// 推荐的生成位置范围
const spawnAreaTop = gameHeight * 0.3; // 从顶部30%开始
const spawnAreaBottom = gameHeight * 0.55; // 到顶部55%结束
const slotPosition = gameHeight * 0.72; // 插槽在72%位置
```

---

### 10. 优化增强 (Enhancements - v1.1)

本节记录 2024-12 版本迭代中新增的功能优化。

#### 10.1 摄像头背景实时预览 (Camera Background Preview)

**目标**：让用户在游戏过程中能够看到自己的手势，增强沉浸感。

**实现方式**：

- 摄像头视频流作为全屏背景显示
- 水平镜像处理 (`transform: scaleX(-1)`)，让用户看到"镜像"的自己
- 添加半透明黑色遮罩 (65% 不透明度)，确保游戏 UI 清晰可读

```css
#camera-video {
  position: fixed;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  transform: scaleX(-1);
  z-index: -1;
}

.camera-overlay {
  background: rgba(0, 0, 0, 0.65);
}
```

#### 10.2 手势追踪呼吸动画 (Hand Tracking Breathing Animation)

**目标**：增强手势识别的视觉反馈，让交互更具生命力。

**实现方式**：

- 当检测到手势时，光标圈圈显示持续的 "呼吸" 脉冲效果
- 使用 CSS `@keyframes` 实现 scale 和 box-shadow 动画
- 握拳状态 (FIST) 使用更快的脉冲动画，增强抓取感

**动画效果**：
| 状态 | 动画名称 | 周期 | 效果 |
|------|---------|------|-----|
| 手掌张开 (OPEN) | `breathing` | 1.5s | 缓和脉冲，15% 缩放 |
| 握拳 (FIST) | `grabPulse` | 0.8s | 快速脉冲，绿色光晕 |

#### 10.3 Unit 选择界面布局优化 (Unit Selection Layout)

**问题**：Unit 数量较多时，卡片 DOM 重叠，无法点击选择。

**解决方案**：

- 增加行间距：120px → 150px
- 卡片垂直居中显示（动态计算起始 Y 坐标）
- 增大卡片尺寸：180×90 → 200×110

```javascript
// 动态垂直居中计算
const totalRows = Math.ceil(allOptions.length / cols);
const startY = -((totalRows - 1) * spacingY) / 2 + 30;
```

---
