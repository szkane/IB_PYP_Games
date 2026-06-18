/**
 * Generate the IB PYP curriculum hub and refresh the service worker cache version.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src');
const curriculumPath = resolve(srcDir, 'data/curriculum-map.json');

const subjectMeta = {
  uoi: { label: 'UOI', icon: '◎', color: '#f2b84b' },
  literacy: { label: 'Literacy', icon: 'Aa', color: '#4a7cdd' },
  math: { label: 'Math', icon: '123', color: '#2d9d78' },
  science: { label: 'Science', icon: '⚗', color: '#c95353' },
  chinese: { label: 'Chinese 中文', icon: '文', color: '#d05a8a' },
};

const plannedThemes = [
  'Who We Are',
  'Where We Are in Place and Time',
  'How We Express Ourselves',
  'How the World Works',
  'How We Organize Ourselves',
  'Sharing the Planet',
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function extractTitle(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1].trim() : basename(filePath, '.html').replace(/_/g, ' ');
  } catch (error) {
    console.warn(`[index] Failed to read title for ${filePath}: ${error.message}`);
    return basename(filePath, '.html').replace(/_/g, ' ');
  }
}

function findGamePages(dir, baseDir = dir, pages = []) {
  for (const file of readdirSync(dir)) {
    const filePath = resolve(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.')) {
        findGamePages(filePath, baseDir, pages);
      }
      continue;
    }

    if (!file.endsWith('.html')) continue;

    const relativePath = relative(baseDir, filePath);
    if (relativePath === 'index.html') continue;

    const pathParts = relativePath.split('/');
    const isStandalone = pathParts.length === 2;
    const isNestedIndex = pathParts.length === 3 && file === 'index.html';
    if (isStandalone || isNestedIndex) {
      pages.push({ path: relativePath, title: extractTitle(filePath) });
    }
  }
  return pages;
}

function collectMappedPaths(curriculum) {
  const mapped = new Set();
  for (const grade of curriculum.grades) {
    for (const unit of grade.units || []) {
      for (const subject of unit.subjects || []) {
        for (const game of subject.games || []) {
          mapped.add(game.path);
        }
      }
    }
  }
  return mapped;
}

function collectGameHrefs(curriculum) {
  const hrefs = [];
  for (const grade of curriculum.grades) {
    for (const unit of grade.units || []) {
      for (const subject of unit.subjects || []) {
        for (const game of subject.games || []) {
          hrefs.push(game.href || game.path);
        }
      }
    }
  }
  return hrefs;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function validateCurriculum(curriculum, pages) {
  const available = new Map(pages.map(page => [page.path, page]));
  const mapped = collectMappedPaths(curriculum);

  for (const path of mapped) {
    if (!available.has(path)) {
      console.warn(`[index] Curriculum path is missing from src: ${path}`);
    }
  }

  const unassigned = pages.filter(page => !mapped.has(page.path));
  if (unassigned.length > 0) {
    console.warn('[index] Unassigned game pages:');
    for (const page of unassigned) {
      console.warn(`  - ${page.path}`);
    }
  }
}

function normalizeCurriculum(curriculum, pages) {
  const titleByPath = new Map(pages.map(page => [page.path, page.title]));

  return {
    ...curriculum,
    grades: curriculum.grades.map(grade => ({
      ...grade,
      units: (grade.units || []).map(unit => ({
        ...unit,
        subjects: (unit.subjects || []).map(subject => ({
          ...subject,
          meta: subjectMeta[subject.id] || { label: subject.label, icon: '•', color: '#667085' },
          games: (subject.games || []).map(game => ({
            ...game,
            title: game.title || titleByPath.get(game.path) || game.path,
            exists: titleByPath.has(game.path),
          })),
        })),
      })),
    })),
  };
}

function renderSubject(subject) {
  const games = subject.games.map(game => {
    const href = game.exists ? (game.href || game.path) : '#';
    const disabled = game.exists ? '' : ' aria-disabled="true"';
    return `
              <a class="game-link ${game.exists ? '' : 'missing'}" href="${escapeHtml(href)}"${disabled}>
                <span class="game-copy">
                  <strong>${escapeHtml(game.title)}</strong>
                  <small>${escapeHtml(game.description || '')}</small>
                </span>
              </a>`;
  }).join('');

  return `
            <section class="subject-lane" style="--subject-color:${subject.meta.color}">
              <h4><span>${escapeHtml(subject.meta.icon)}</span>${escapeHtml(subject.label)}</h4>
              <div class="game-list">${games}</div>
            </section>`;
}

function renderUnit(unit, index) {
  const subjectSections = unit.subjects.map(renderSubject).join('');
  const profiles = [...(unit.learnerProfile || []), ...(unit.atlSkills || [])]
    .map(item => `<span>${escapeHtml(item)}</span>`)
    .join('');

  return `
        <article class="unit-band" data-unit="${escapeHtml(unit.id)}">
          <div class="unit-heading">
            <div class="unit-number">${index + 1}</div>
            <div>
              <p class="eyebrow">${escapeHtml(unit.label)} · ${escapeHtml(unit.theme)}</p>
              <h3>${escapeHtml(unit.title)}</h3>
              <p>${escapeHtml(unit.centralIdea)}</p>
              <div class="profile-row">${profiles}</div>
            </div>
          </div>
          <div class="subjects-grid">${subjectSections}</div>
        </article>`;
}

function renderGrade(grade, index) {
  const units = grade.units || [];
  const isActive = index === 0 ? ' active' : '';
  const planned = grade.status === 'planned';
  const content = planned ? `
        <section class="empty-grade">
          <h3>${escapeHtml(grade.label)} curriculum space is ready</h3>
          <p>${escapeHtml(grade.summary)}</p>
          <div class="planned-unit-grid">
            ${plannedThemes.map((theme, themeIndex) => `
              <article class="planned-unit">
                <p class="eyebrow">Unit ${themeIndex + 1}</p>
                <h4>${escapeHtml(theme)}</h4>
                <div class="planned-subjects">
                  ${Object.values(subjectMeta).map(subject => `<span style="--subject-color:${subject.color}">${escapeHtml(subject.label)}</span>`).join('')}
                </div>
              </article>`).join('')}
          </div>
        </section>` : units.map(renderUnit).join('');

  return `
      <section class="grade-panel${isActive}" id="${escapeHtml(grade.id)}" aria-label="${escapeHtml(grade.label)}">
        <div class="grade-intro">
          <p class="eyebrow">${planned ? 'Ready for future UOI documents' : 'Curriculum-connected games'}</p>
          <h2>${escapeHtml(grade.label)}</h2>
          <p>${escapeHtml(grade.summary || '')}</p>
        </div>
        ${content}
      </section>`;
}

function buildHeroData(curriculum) {
  return curriculum.grades.map(grade => {
    const units = grade.units || [];
    const latestUnit = units.at(-1);
    const active = grade.status === 'active' && units.length > 0;

    return {
      id: grade.id,
      label: grade.label,
      eyebrow: active ? 'Grade · Unit · Subject' : 'Ready for future UOI documents',
      title: active
        ? `${grade.label} learning map now includes ${latestUnit.label}: ${latestUnit.title}.`
        : `${grade.label} curriculum space is ready.`,
      summary: grade.summary || '',
      stripLabel: active ? `${grade.label} inquiry units` : `${grade.label} planned inquiry themes`,
      units: active
        ? units.map(unit => `${unit.label}: ${unit.title}`)
        : plannedThemes.map((theme, index) => `Unit ${index + 1}: ${theme}`),
    };
  });
}

function serializeForScript(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function generateIndexHtml(curriculum) {
  const gradeTabs = curriculum.grades.map((grade, index) => `
          <button class="grade-tab${index === 0 ? ' active' : ''}" type="button" data-grade="${escapeHtml(grade.id)}">
            <span>${escapeHtml(grade.label)}</span>
            <small>${grade.status === 'active' ? 'Open' : 'Planned'}</small>
          </button>`).join('');

  const panels = curriculum.grades.map(renderGrade).join('');
  const heroData = buildHeroData(curriculum);
  const initialHero = heroData[0];
  const initialHeroUnits = initialHero.units
    .map(unit => `<span>${escapeHtml(unit)}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IB PYP Games | UOI Learning Map</title>
  <meta name="description" content="Grade and Unit organized HTML5 learning games for IB PYP students.">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/icon-192.png">
  <meta name="theme-color" content="#234b4b">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <style>
    :root {
      --ink: #17211f;
      --muted: #63706d;
      --paper: #fffaf0;
      --surface: #ffffff;
      --line: #d8dfd8;
      --green: #2f6f62;
      --teal: #1d8a8a;
      --yellow: #f2b84b;
      --coral: #e36b5a;
      --blue: #4a7cdd;
      --shadow: 0 16px 38px rgba(43, 64, 58, 0.14);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-rounded, "Avenir Next", "Nunito", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        linear-gradient(135deg, rgba(47, 111, 98, 0.12), transparent 32%),
        linear-gradient(45deg, transparent 0 48%, rgba(242, 184, 75, 0.18) 48% 52%, transparent 52%),
        var(--paper);
    }

    a { color: inherit; }

    .app-shell {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 24px 0 48px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 64px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 900;
      letter-spacing: 0;
    }

    .brand-mark {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border: 2px solid var(--ink);
      border-radius: 8px;
      background: var(--yellow);
      box-shadow: 5px 5px 0 var(--ink);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
      gap: 28px;
      align-items: end;
      padding: 30px 0 28px;
    }

    .hero h1 {
      max-width: 760px;
      margin: 0;
      font-size: clamp(2.4rem, 5vw, 5rem);
      line-height: 0.98;
      letter-spacing: 0;
    }

    .hero p {
      max-width: 680px;
      color: var(--muted);
      font-size: 1.08rem;
      line-height: 1.7;
    }

    .uoi-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
      gap: 8px;
      align-self: stretch;
    }

    .uoi-strip span {
      display: grid;
      place-items: center;
      min-height: 96px;
      padding: 10px;
      border: 2px solid var(--ink);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: 5px 5px 0 rgba(23, 33, 31, 0.88);
      text-align: center;
      font-size: 0.86rem;
      font-weight: 900;
    }

    .uoi-strip span:nth-child(1) { background: #f6d365; }
    .uoi-strip span:nth-child(2) { background: #98d8c8; }
    .uoi-strip span:nth-child(3) { background: #f5a6b8; }
    .uoi-strip span:nth-child(4) { background: #a4d56f; }
    .uoi-strip span:nth-child(5) { background: #9ec8ff; }
    .uoi-strip span:nth-child(6) { background: #f8b26a; }

    .grade-tabs {
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 10px;
      margin: 18px 0 18px;
    }

    .grade-tab {
      min-height: 64px;
      padding: 10px 12px;
      border: 2px solid var(--ink);
      border-radius: 8px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      text-align: left;
      box-shadow: 4px 4px 0 rgba(23, 33, 31, 0.75);
    }

    .grade-tab span,
    .grade-tab small {
      display: block;
      letter-spacing: 0;
    }

    .grade-tab span { font-size: 1rem; font-weight: 900; }
    .grade-tab small { color: var(--muted); font-weight: 800; }

    .grade-tab.active {
      background: var(--green);
      color: white;
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--ink);
    }

    .grade-tab.active small { color: #eaf7f3; }

    .grade-panel { display: none; }
    .grade-panel.active { display: block; }

    .grade-intro {
      display: grid;
      gap: 6px;
      margin-bottom: 18px;
      padding: 20px 0;
      border-top: 2px solid var(--line);
      border-bottom: 2px solid var(--line);
    }

    .eyebrow {
      margin: 0;
      color: var(--teal);
      font-weight: 900;
      text-transform: uppercase;
      font-size: 0.78rem;
      letter-spacing: 0;
    }

    .grade-intro h2,
    .unit-heading h3,
    .empty-grade h3 {
      margin: 0;
      letter-spacing: 0;
    }

    .grade-intro h2 { font-size: clamp(1.8rem, 3vw, 3rem); }
    .grade-intro p:last-child { margin: 0; color: var(--muted); line-height: 1.6; }

    .unit-band {
      padding: 24px 0 30px;
      border-bottom: 2px solid var(--line);
    }

    .unit-heading {
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      margin-bottom: 18px;
    }

    .unit-number {
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      border: 2px solid var(--ink);
      border-radius: 8px;
      background: var(--yellow);
      box-shadow: 4px 4px 0 var(--ink);
      font-size: 1.5rem;
      font-weight: 900;
    }

    .unit-heading h3 { font-size: clamp(1.45rem, 2.6vw, 2.4rem); }
    .unit-heading p:not(.eyebrow) { margin: 8px 0 0; color: var(--muted); line-height: 1.55; }

    .profile-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .profile-row span {
      min-height: 32px;
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 10px;
      background: rgba(255,255,255,0.72);
      color: var(--muted);
      font-size: 0.86rem;
      font-weight: 800;
    }

    .subjects-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .subject-lane {
      min-width: 0;
    }

    .subject-lane h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      margin: 0 0 10px;
      font-size: 1rem;
    }

    .subject-lane h4 span {
      min-width: 36px;
      height: 36px;
      display: inline-grid;
      place-items: center;
      border: 2px solid var(--ink);
      border-radius: 8px;
      background: var(--subject-color);
      color: white;
      font-size: 0.9rem;
      font-weight: 900;
    }

    .game-list {
      display: grid;
      gap: 10px;
    }

    .game-link {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
      min-height: 76px;
      align-items: center;
      padding: 12px;
      border: 2px solid rgba(23, 33, 31, 0.78);
      border-radius: 8px;
      background: var(--surface);
      text-decoration: none;
      box-shadow: 4px 4px 0 rgba(23, 33, 31, 0.2);
      transition: transform 140ms ease, box-shadow 140ms ease;
    }

    .game-link:hover,
    .game-link:focus-visible {
      transform: translateY(-2px);
      box-shadow: 4px 7px 0 rgba(23, 33, 31, 0.24);
      outline: 3px solid rgba(242, 184, 75, 0.55);
      outline-offset: 2px;
    }

    .game-link.missing {
      opacity: 0.55;
      pointer-events: none;
    }

    .game-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .game-copy strong,
    .game-copy small {
      overflow-wrap: anywhere;
      letter-spacing: 0;
    }

    .game-copy strong { font-size: 1rem; }
    .game-copy small {
      color: var(--muted);
      font-size: 0.88rem;
      line-height: 1.35;
    }

    .empty-grade {
      display: grid;
      gap: 14px;
      padding: 30px 0;
    }

    .empty-grade p {
      max-width: 680px;
      color: var(--muted);
      line-height: 1.6;
      margin: 0;
    }

    .placeholder-units,
    .planned-unit-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(92px, 1fr));
      gap: 10px;
    }

    .placeholder-units span {
      min-height: 58px;
      display: grid;
      place-items: center;
      border: 2px dashed #9aa7a2;
      border-radius: 8px;
      color: var(--muted);
      font-weight: 900;
      background: rgba(255,255,255,0.52);
    }

    .planned-unit-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .planned-unit {
      display: grid;
      gap: 10px;
      min-height: 168px;
      padding: 14px;
      border: 2px dashed #9aa7a2;
      border-radius: 8px;
      background: rgba(255,255,255,0.56);
    }

    .planned-unit h4 {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.25;
      letter-spacing: 0;
    }

    .planned-subjects {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      align-content: start;
    }

    .planned-subjects span {
      min-height: 30px;
      display: inline-flex;
      align-items: center;
      border: 1px solid color-mix(in srgb, var(--subject-color) 45%, #17211f);
      border-radius: 999px;
      padding: 4px 9px;
      background: color-mix(in srgb, var(--subject-color) 18%, white);
      color: #23312d;
      font-size: 0.78rem;
      font-weight: 900;
    }

    footer {
      margin-top: 36px;
      padding-top: 18px;
      border-top: 2px solid var(--line);
      color: var(--muted);
      font-weight: 800;
    }

    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
      .uoi-strip { grid-template-columns: repeat(6, minmax(104px, 1fr)); overflow-x: auto; padding-bottom: 8px; }
      .grade-tabs { grid-template-columns: repeat(5, minmax(124px, 1fr)); overflow-x: auto; padding-bottom: 8px; }
      .subjects-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .app-shell { width: min(100% - 20px, 1180px); padding-top: 14px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .hero h1 { font-size: 2.28rem; }
      .unit-heading { grid-template-columns: 1fr; }
      .placeholder-units,
      .planned-unit-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>

<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">PYP</div>
        <div>
          <div>IB PYP Games</div>
          <small>UOI learning map</small>
        </div>
      </div>
      <strong>Standalone HTML5 · iPad landscape · PC</strong>
    </header>

    <nav class="grade-tabs" aria-label="Grade selection">
${gradeTabs}
    </nav>

    <section class="hero" aria-live="polite">
      <div>
        <p class="eyebrow" id="hero-eyebrow">${escapeHtml(initialHero.eyebrow)}</p>
        <h1 id="hero-title">${escapeHtml(initialHero.title)}</h1>
        <p id="hero-summary">${escapeHtml(initialHero.summary)}</p>
      </div>
      <div class="uoi-strip" id="hero-units" aria-label="${escapeHtml(initialHero.stripLabel)}">
        ${initialHeroUnits}
      </div>
    </section>

    <main>
${panels}
    </main>

    <footer>Built for Grade 1-5 IB PYP learning paths. Add new UOI documents by extending <code>src/data/curriculum-map.json</code>.</footer>
  </div>

  <script>
    const heroData = ${serializeForScript(heroData)};
    const tabs = Array.from(document.querySelectorAll('.grade-tab'));
    const panels = Array.from(document.querySelectorAll('.grade-panel'));
    const heroEyebrow = document.querySelector('#hero-eyebrow');
    const heroTitle = document.querySelector('#hero-title');
    const heroSummary = document.querySelector('#hero-summary');
    const heroUnits = document.querySelector('#hero-units');

    function updateHero(id) {
      const grade = heroData.find(item => item.id === id) || heroData[0];
      heroEyebrow.textContent = grade.eyebrow;
      heroTitle.textContent = grade.title;
      heroSummary.textContent = grade.summary;
      heroUnits.setAttribute('aria-label', grade.stripLabel);
      heroUnits.replaceChildren(...grade.units.map(unit => {
        const chip = document.createElement('span');
        chip.textContent = unit;
        return chip;
      }));
    }

    function activateGrade(id) {
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.grade === id));
      panels.forEach(panel => panel.classList.toggle('active', panel.id === id));
      updateHero(id);
      window.history.replaceState(null, '', '#' + id);
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => activateGrade(tab.dataset.grade));
    });

    const initial = window.location.hash.replace('#', '');
    if (initial && document.getElementById(initial)) {
      activateGrade(initial);
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
          console.log('ServiceWorker registration failed:', error);
        });
      });
    }
  </script>
</body>

</html>
`;
}

function buildPrecacheUrls(curriculum) {
  const urls = new Set([
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
  ]);

  for (const href of collectGameHrefs(curriculum)) {
    urls.add(`/${href}`);
  }

  return [...urls].sort((a, b) => a.localeCompare(b));
}

function updateServiceWorker(curriculum) {
  const swPath = resolve(srcDir, 'sw.js');
  let swContent = readFileSync(swPath, 'utf8');

  const now = new Date();
  const version = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  swContent = swContent.replace(
    /const CACHE_VERSION = '[^']+';/,
    `const CACHE_VERSION = '${version}';`,
  );

  const precacheUrls = buildPrecacheUrls(curriculum)
    .map(url => `    '${url}'`)
    .join(',\n');

  swContent = swContent.replace(
    /const PRECACHE_URLS = \[[\s\S]*?\];/,
    `const PRECACHE_URLS = [\n${precacheUrls}\n];`,
  );

  writeFileSync(swPath, swContent, 'utf8');
  console.log(`Updated sw.js cache version to ${version}`);
}

function main() {
  if (!existsSync(curriculumPath)) {
    throw new Error(`Missing curriculum map: ${curriculumPath}`);
  }

  const pages = findGamePages(srcDir);
  const curriculum = normalizeCurriculum(readJson(curriculumPath), pages);
  validateCurriculum(curriculum, pages);

  const indexHtml = generateIndexHtml(curriculum);
  writeFileSync(resolve(srcDir, 'index.html'), indexHtml, 'utf8');
  console.log(`Generated index.html with ${curriculum.grades.length} grades`);

  updateServiceWorker(curriculum);
}

main();
