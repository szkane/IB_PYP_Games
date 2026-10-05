# Domain Glossary - IB PYP Games

## Educational & Curriculum Concepts

### Transdisciplinary Theme (超学科主题)
One of the six organizing themes in the IB PYP framework. For Grade 2 Unit 1, the theme is **"Who We Are"** (我们是谁).

### Central Idea (核心理念)
The primary enduring understanding for a unit. For G2 UOI 1: *"Making balanced choices nurtures one's well-being"* (平衡的选择有助于滋养身心健康).

### Lines of Inquiry (探究线索)
Specific inquiry directions exploring the central idea:
1. What it means to be balanced (Form / 形式)
2. How choices we make impact our wellbeing (Causation / 因果)
3. Taking responsibilities for our choices (Responsibility / 责任)

### Learner Profile Attributes (学习者特质)
Target attributes emphasized in this unit:
- **Balanced (全面发展 / 平衡)**
- **Reflective (善于反思)**
- **Principled (坚守原则)**

### Approaches to Learning (ATL Skills / 学习方法)
- Thinking Skills (思考技能)
- Self-Management Skills (自我管理技能)

### Five Finger Retell (五指复述法)
Literacy retelling framework for narrative text:
- **Thumb**: Who (Characters / 人物)
- **Index**: Where (Setting / 地点)
- **Middle**: When (Time / 时间)
- **Ring**: What happened (Problem/Events / 事件与问题)
- **Little**: How resolved (Solution / 解决方案)

### FLSZ Rule (拼写双写规则)
Phonics spelling rule where `f`, `l`, `s`, `z` are doubled after a single short vowel in a one-syllable word (e.g., puff, bell, miss, buzz, and `-all`, `-oll`, `-ull`).

### Digraphs (复合辅音音素)
Two letters that come together to represent a single sound in phonics:
- `sh`, `ch`, `th` (voiced e.g. *this*, unvoiced e.g. *think*), `wh/w`, `ph/f`, `ck/k`, `ng`, `nk`.

### Properties of Sound & Light (声音与光的物理特性)
- **Volume**: Loudness / intensity of sound (Quiet whisper vs. Loud siren).
- **Pitch**: Frequency of sound vibration (High bird chirp / squeak vs. Low thunder / bass rumble).
- **Light Transmission**: Light travels in straight lines in all directions from a source until obstructed (casting shadows) or reflected (mirrors, bounce surfaces).
- **Materials**: Opaque (blocks light completely, dark shadow), Translucent (partially passes light, soft shadow), Transparent (passes light freely, no shadow).

### Equal Groups & Arrays (等分组与阵列)
Multiplication foundations for early primary:
- **Group**: Number of equal sets or rows.
- **Each**: Quantity inside each single group or column.
- **Total**: Aggregate sum ($Group \times Each = Total$).
- **Repeated Addition**: $4 \times 5 = 5 + 5 + 5 + 5 = 20$.

### Geometric Angles (几何角)
- **Right Angle ($90^\circ$)**: A square corner ($\llcorner$).
- **Acute Angle ($<90^\circ$)**: An angle smaller/sharper than a right angle.
- **Obtuse Angle ($>90^\circ$ and $<180^\circ$)**: An angle wider/more open than a right angle.
- **Straight Angle ($180^\circ$)**: Two rays in opposite directions forming a straight line.

---

## Technical & Architectural Terms

### Neobrutalism (新粗野主义设计风格)
High-contrast visual design style characterized by:
- Bold black borders (`2px` to `4px` solid black `#111` or `#000`)
- Hard geometric offset drop shadows (e.g., `4px 4px 0 #000`, `6px 6px 0 #000`, no blur)
- Saturated, high-contrast candy/retro palette (electric yellow, mint green, punchy coral, vibrant blue, lilac)
- Chunky, tactile interactive elements with immediate physical depression feedback on click/press (`translate(2px, 2px)`)
- Playful typography with clear readability and strong visual hierarchy

### Three.js 3D Interactive Stage
WebGL rendering module imported via `https://esm.sh/three@0.160.0` with OrbitControls for 360-degree rotation, lighting rigs (`SpotLight` for shadow casting, `PointLight`), and raycasting for interactive element picking.

### Standalone HTML5 Game
Self-contained HTML file within `src/` (or `src/uoi/`, `src/math/`, `src/literacy/`, `src/science/`) containing its own styles (`<style>`) and logic (`<script>`), requiring zero external build steps, running locally and offline with touch target compliance (minimum 44px) and tablet/desktop responsiveness.

### PYP Map Return Link
Standardized back link `<a class="pyp-map-link" href="../index.html">← PYP Map</a>` required by QA validation so learners can seamlessly return to the grade inquiry hub.
