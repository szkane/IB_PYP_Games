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

function is3DGame(game) {
  const tags = Array.isArray(game.tags) ? game.tags.map(t => String(t).toLowerCase()) : [];
  if (tags.includes('3d')) return true;
  return /\b3d\b/i.test(game.title || '') || /3d/i.test(game.path || '');
}

function collectFeatured3DGames(curriculum) {
  const seen = new Set();
  const featured = [];
  const emojiByPath = {
    'science/g1_moon_phases.html': '🌙',
    'science/g1_day_and_night_detectives.html': '🌍',
    'science/g1_bike_gear.html': '⚙️',
    'math/g1_position_explorer.html': '🧸',
    'science/g2_light_shadow_master.html': '🔦',
    'math/g2_angle_finder.html': '📐',
    'math/g1_3D_shape.html': '🧊',
    'science/gesture-cosmos-hub.html': '🌌',
  };
  for (const grade of curriculum.grades) {
    for (const unit of grade.units || []) {
      for (const subject of unit.subjects || []) {
        for (const game of subject.games || []) {
          if (!game.exists || !is3DGame(game)) continue;
          if (!emojiByPath[game.path]) continue;
          const href = game.href || game.path;
          if (seen.has(href)) continue;
          seen.add(href);
          featured.push({
            title: game.title,
            href,
            grade: grade.label,
            subject: subject.label,
            emoji: emojiByPath[game.path],
            color: subject.meta.color,
          });
        }
      }
    }
  }
  return featured;
}

function renderSubject(subject) {
  const games = subject.games.map(game => {
    const href = game.exists ? (game.href || game.path) : '#';
    const disabled = game.exists ? '' : ' aria-disabled="true"';
    const badge3d = is3DGame(game) ? '<span class="badge-3d">3D ✨</span>' : '';
    return `
              <a class="game-link ${game.exists ? '' : 'missing'}${is3DGame(game) ? ' is-3d' : ''}" href="${escapeHtml(href)}"${disabled}>
                <span class="game-copy">
                  <span class="game-title-row"><strong>${escapeHtml(game.title)}</strong>${badge3d}</span>
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

function renderUnit(unit, numberText) {
  const subjectSections = unit.subjects.map(renderSubject).join('');
  const profiles = [...(unit.learnerProfile || []), ...(unit.atlSkills || [])]
    .map(item => `<span>${escapeHtml(item)}</span>`)
    .join('');

  return `
        <article class="unit-band" data-unit="${escapeHtml(unit.id)}">
          <div class="unit-heading">
            <div class="unit-number">${escapeHtml(numberText)}</div>
            <div>
              <p class="eyebrow">${escapeHtml(unit.label)}${unit.theme ? ' · ' + escapeHtml(unit.theme) : ''}</p>
              <h3>${escapeHtml(unit.title)}</h3>
              ${unit.centralIdea ? `<p>${escapeHtml(unit.centralIdea)}</p>` : ''}
              <div class="profile-row">${profiles}</div>
            </div>
          </div>
          <div class="subjects-grid">${subjectSections}</div>
        </article>`;
}

function renderGrade(grade) {
  const units = grade.units || [];
  const isActive = grade.id === 'g2' ? ' active' : '';
  const planned = grade.status === 'planned';
  
  let content = '';
  if (planned) {
    content = `
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
        </section>`;
  } else {
    let unitNumber = 1;
    content = units.map(unit => {
      const isHomeLearning = unit.id === 'home_learning';
      const numberText = isHomeLearning ? '🏠' : (unitNumber++).toString();
      return renderUnit(unit, numberText);
    }).join('');
  }

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
  const gradeTabs = curriculum.grades.map(grade => `
          <button class="grade-tab${grade.id === 'g2' ? ' active' : ''}" type="button" data-grade="${escapeHtml(grade.id)}">
            <span>${escapeHtml(grade.label)}</span>
            <small>${grade.status === 'active' ? 'Open' : 'Planned'}</small>
          </button>`).join('');

  const panels = curriculum.grades.map(renderGrade).join('');
  const heroData = buildHeroData(curriculum);
  const initialHero = heroData.find(item => item.id === 'g2') || heroData[0];
  const initialHeroUnits = initialHero.units
    .map(unit => `<span>${escapeHtml(unit)}</span>`)
    .join('');

  const featured3D = collectFeatured3DGames(curriculum);
  const showcaseCards = featured3D.map(item => `
          <a class="showcase-card" href="${escapeHtml(item.href)}" style="--card-accent:${escapeHtml(item.color)}">
            <span class="showcase-emoji">${item.emoji}</span>
            <span class="showcase-meta">
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.grade)} · ${escapeHtml(item.subject)}</small>
            </span>
            <span class="showcase-go">3D →</span>
          </a>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IB PYP Games | Gemini 4 Interactive 3D UOI Learning Map</title>
  <meta name="description" content="Grade and Unit organized HTML5 & Interactive 3D learning games for IB PYP students, powered by Gemini 4 Creative Learning.">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">
  <meta name="theme-color" content="#131b2e">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="PYP Games">
  <meta name="mobile-web-app-capable" content="yes">
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <style>
    :root {
      --ink: #111827;
      --muted: #52606d;
      --paper: #fffdf4;
      --surface: #ffffff;
      --line: #d8dfd8;
      --green: #2f6f62;
      --teal: #0ea5a4;
      --yellow: #ffe156;
      --coral: #ff6584;
      --blue: #38b6ff;
      --purple: #9b6dff;
      --border: 3px solid var(--ink);
      --shadow: 4px 4px 0 var(--ink);
      --shadow-sm: 2px 2px 0 var(--ink);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-rounded, "Avenir Next", "Nunito", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 10%, rgba(56, 182, 255, 0.16), transparent 36%),
        radial-gradient(circle at 88% 12%, rgba(155, 109, 255, 0.16), transparent 34%),
        linear-gradient(135deg, rgba(255, 225, 86, 0.14), transparent 40%),
        var(--paper);
    }

    a { color: inherit; }

    .app-shell {
      width: min(1200px, calc(100% - 32px));
      margin: 0 auto;
      padding: 18px 0 48px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      min-height: 58px;
      flex-wrap: wrap;
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
      border: var(--border);
      border-radius: 12px;
      background: var(--yellow);
      box-shadow: var(--shadow);
      font-size: 1rem;
    }

    .gemini-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 6px 14px;
      border: var(--border);
      border-radius: 999px;
      background: linear-gradient(135deg, #161d3a, #2c2459);
      color: #ffffff;
      font-size: 0.86rem;
      font-weight: 900;
      box-shadow: var(--shadow-sm);
    }

    .gemini-pill .spark {
      color: var(--yellow);
      font-size: 1rem;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
      gap: 22px;
      align-items: stretch;
      padding: 18px 0 18px;
    }

    .hero-copy {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      padding: 20px 22px;
      background: var(--surface);
      border: var(--border);
      border-radius: 18px;
      box-shadow: var(--shadow);
    }

    .hero h1 {
      margin: 4px 0 0;
      font-size: clamp(1.85rem, 3.4vw, 3rem);
      line-height: 1.05;
      letter-spacing: 0;
    }

    .hero p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.55;
    }

    .uoi-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
      gap: 8px;
      margin-top: 4px;
    }

    .uoi-strip span {
      display: grid;
      place-items: center;
      min-height: 54px;
      padding: 8px;
      border: 2.5px solid var(--ink);
      border-radius: 10px;
      background: var(--surface);
      box-shadow: 3px 3px 0 var(--ink);
      text-align: center;
      font-size: 0.8rem;
      font-weight: 900;
      line-height: 1.2;
    }

    .uoi-strip span:nth-child(1) { background: #ffe156; }
    .uoi-strip span:nth-child(2) { background: #8ce9d9; }
    .uoi-strip span:nth-child(3) { background: #ffb3c6; }
    .uoi-strip span:nth-child(4) { background: #b7ef7d; }
    .uoi-strip span:nth-child(5) { background: #9fd5ff; }
    .uoi-strip span:nth-child(6) { background: #ffc478; }

    /* Interactive 3D Hero Diorama */
    .hub-3d-card {
      position: relative;
      min-height: 290px;
      border: var(--border);
      border-radius: 18px;
      box-shadow: var(--shadow);
      background: radial-gradient(circle at 50% 35%, #232c5c 0%, #10152b 72%, #080b18 100%);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    #hub-3d-stage {
      width: 100%;
      flex: 1;
      min-height: 245px;
      touch-action: none;
      cursor: grab;
    }

    #hub-3d-stage:active { cursor: grabbing; }

    .hub-3d-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 3;
      background: rgba(255, 225, 86, 0.96);
      color: var(--ink);
      border: 2.5px solid var(--ink);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.78rem;
      font-weight: 900;
      box-shadow: 2px 2px 0 var(--ink);
      pointer-events: none;
    }

    .hub-3d-reset {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 3;
      min-height: 36px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.94);
      color: var(--ink);
      border: 2.5px solid var(--ink);
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 2px 2px 0 var(--ink);
      touch-action: manipulation;
    }

    .hub-3d-reset:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 var(--ink);
    }

    .hub-3d-caption {
      position: relative;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 14px;
      background: rgba(16, 21, 43, 0.92);
      border-top: 2.5px solid var(--ink);
      color: #f8fafc;
      font-size: 0.84rem;
      font-weight: 800;
    }

    .hub-3d-caption a {
      background: #4ecdc4;
      color: var(--ink);
      text-decoration: none;
      padding: 4px 10px;
      border-radius: 8px;
      border: 2px solid var(--ink);
      font-weight: 900;
      white-space: nowrap;
    }

    /* 3D Showcase Strip */
    .showcase-band {
      margin: 4px 0 20px;
      padding: 14px 16px;
      border: var(--border);
      border-radius: 18px;
      background: linear-gradient(135deg, #141b36 0%, #241f4b 100%);
      color: #ffffff;
      box-shadow: var(--shadow);
    }

    .showcase-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .showcase-head h2 {
      margin: 0;
      font-size: 1.08rem;
      font-weight: 900;
      color: var(--yellow);
    }

    .showcase-head span {
      font-size: 0.82rem;
      color: #cbd5e1;
      font-weight: 700;
    }

    .showcase-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .showcase-card {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 62px;
      padding: 10px 12px;
      border: 2.5px solid var(--ink);
      border-radius: 12px;
      background: #ffffff;
      color: var(--ink);
      text-decoration: none;
      box-shadow: 3px 3px 0 #000000;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .showcase-card:hover,
    .showcase-card:focus-visible {
      transform: translate(-1px, -2px);
      box-shadow: 5px 5px 0 var(--yellow);
      outline: none;
    }

    .showcase-card:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 #000000;
    }

    .showcase-emoji {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      display: grid;
      place-items: center;
      border: 2px solid var(--ink);
      border-radius: 10px;
      background: color-mix(in srgb, var(--card-accent) 26%, white);
      font-size: 1.25rem;
    }

    .showcase-meta {
      min-width: 0;
      flex: 1;
      display: grid;
      gap: 2px;
    }

    .showcase-meta strong {
      font-size: 0.88rem;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .showcase-meta small {
      font-size: 0.75rem;
      color: var(--muted);
      font-weight: 800;
    }

    .showcase-go {
      font-size: 0.74rem;
      font-weight: 900;
      padding: 3px 7px;
      border-radius: 999px;
      background: var(--yellow);
      border: 2px solid var(--ink);
      white-space: nowrap;
    }

    .grade-tabs {
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 10px;
      margin: 14px 0 12px;
    }

    .grade-tab {
      min-height: 60px;
      padding: 10px 12px;
      border: var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      text-align: left;
      box-shadow: var(--shadow);
      touch-action: manipulation;
      transition: transform 110ms ease, box-shadow 110ms ease;
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
      box-shadow: var(--shadow-sm);
    }

    .grade-tab.active small { color: #eaf7f3; }

    .grade-panel { display: none; }
    .grade-panel.active { display: block; }

    .grade-intro {
      display: grid;
      gap: 6px;
      margin-bottom: 18px;
      padding: 16px 0;
      border-top: 2px solid var(--line);
      border-bottom: 2px solid var(--line);
    }

    .eyebrow {
      margin: 0;
      color: var(--teal);
      font-weight: 900;
      text-transform: uppercase;
      font-size: 0.78rem;
      letter-spacing: 0.04em;
    }

    .grade-intro h2,
    .unit-heading h3,
    .empty-grade h3 {
      margin: 0;
      letter-spacing: 0;
    }

    .grade-intro h2 { font-size: clamp(1.7rem, 2.8vw, 2.6rem); }
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
      border: var(--border);
      border-radius: 12px;
      background: var(--yellow);
      box-shadow: var(--shadow);
      font-size: 1.5rem;
      font-weight: 900;
    }

    .unit-heading h3 { font-size: clamp(1.4rem, 2.5vw, 2.2rem); }
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
      border: 2px solid var(--ink);
      border-radius: 999px;
      padding: 4px 10px;
      background: #ffffff;
      color: var(--ink);
      font-size: 0.82rem;
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
      border: 2.5px solid var(--ink);
      border-radius: 10px;
      background: var(--subject-color);
      color: white;
      font-size: 0.9rem;
      font-weight: 900;
      box-shadow: 2px 2px 0 var(--ink);
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
      padding: 12px 14px;
      border: 2.5px solid var(--ink);
      border-radius: 12px;
      background: var(--surface);
      text-decoration: none;
      box-shadow: 4px 4px 0 rgba(17, 24, 39, 0.85);
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .game-link.is-3d {
      background: linear-gradient(135deg, #ffffff 78%, #eef7ff 100%);
    }

    .game-link:hover,
    .game-link:focus-visible {
      transform: translate(-1px, -2px);
      box-shadow: 6px 6px 0 var(--ink);
      outline: 3px solid rgba(56, 182, 255, 0.55);
      outline-offset: 2px;
    }

    .game-link:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--ink);
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

    .game-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .badge-3d {
      flex: 0 0 auto;
      padding: 2px 8px;
      border-radius: 999px;
      border: 2px solid var(--ink);
      background: linear-gradient(135deg, #ffe156, #8ce9d9);
      color: var(--ink);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.02em;
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
      border-radius: 12px;
      background: rgba(255,255,255,0.65);
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
      .showcase-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .uoi-strip { grid-template-columns: repeat(3, minmax(104px, 1fr)); }
      .grade-tabs { grid-template-columns: repeat(5, minmax(124px, 1fr)); overflow-x: auto; padding-bottom: 8px; }
      .subjects-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .app-shell { width: min(100% - 20px, 1200px); padding-top: 14px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .showcase-grid { grid-template-columns: 1fr; }
      .hero h1 { font-size: 1.85rem; }
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
          <small>Interactive 3D UOI Learning Map</small>
        </div>
      </div>
      <div class="gemini-pill"><span class="spark">✦</span> Gemini 4 Creative 3D Learning · iPad &amp; PC</div>
    </header>

    <nav class="grade-tabs" aria-label="Grade selection">
${gradeTabs}
    </nav>

    <section class="hero" aria-live="polite">
      <div class="hero-copy">
        <div>
          <p class="eyebrow" id="hero-eyebrow">${escapeHtml(initialHero.eyebrow)}</p>
          <h1 id="hero-title">${escapeHtml(initialHero.title)}</h1>
          <p id="hero-summary">${escapeHtml(initialHero.summary)}</p>
        </div>
        <div class="uoi-strip" id="hero-units" aria-label="${escapeHtml(initialHero.stripLabel)}">
          ${initialHeroUnits}
        </div>
      </div>

      <div class="hub-3d-card" aria-label="Interactive 3D Creative Learning Island">
        <span class="hub-3d-badge">✨ Drag to Orbit · Tap 3D Toys!</span>
        <button class="hub-3d-reset" id="hub-3d-reset" type="button">Reset View ↺</button>
        <div id="hub-3d-stage"></div>
        <div class="hub-3d-caption">
          <span id="hub-3d-status">🚀 Tap a floating 3D world to preview a Gemini 4 course!</span>
          <a id="hub-3d-launch" href="science/g1_moon_phases.html">Launch 3D →</a>
        </div>
      </div>
    </section>

    <section class="showcase-band" aria-label="Interactive 3D Creative Courses">
      <div class="showcase-head">
        <h2>🚀 Gemini 4 Interactive 3D Courses</h2>
        <span>Explore real-time Three.js worlds designed for hands-on IB PYP inquiry</span>
      </div>
      <div class="showcase-grid">
${showcaseCards}
      </div>
    </section>

    <main>
${panels}
    </main>

    <footer>Built for Grade 1-5 IB PYP learning paths · Enhanced with Gemini 4 Interactive 3D &amp; Three.js. Extend <code>src/data/curriculum-map.json</code> to add units.</footer>
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

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

    const stage = document.getElementById('hub-3d-stage');
    const statusEl = document.getElementById('hub-3d-status');
    const launchEl = document.getElementById('hub-3d-launch');
    const resetBtn = document.getElementById('hub-3d-reset');

    let audioCtx = null;
    function playChime(freq = 587.33) {
      try {
        if (!audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          audioCtx = new Ctx();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const t = audioCtx.currentTime;
        [freq, freq * 1.25, freq * 1.5].forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t + idx * 0.045);
          gain.gain.setValueAtTime(0.1, t + idx * 0.045);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.045 + 0.24);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t + idx * 0.045);
          osc.stop(t + idx * 0.045 + 0.26);
        });
      } catch (_) {}
    }

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, stage.clientWidth / Math.max(stage.clientHeight, 1), 0.1, 100);
      camera.position.set(0, 3.1, 7.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(stage.clientWidth, stage.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      stage.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enablePan = false;
      controls.minDistance = 4.6;
      controls.maxDistance = 11;
      controls.maxPolarAngle = Math.PI * 0.56;
      controls.minPolarAngle = 0.35;

      scene.add(new THREE.HemisphereLight(0xdff6ff, 0x2a1f52, 0.95));
      const keyLight = new THREE.DirectionalLight(0xfff5d6, 1.8);
      keyLight.position.set(5, 8, 6);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(0x38b6ff, 1.8, 18);
      rimLight.position.set(-5, 3, -4);
      scene.add(rimLight);
      const warmLight = new THREE.PointLight(0xff6584, 1.4, 16);
      warmLight.position.set(4, -1, 4);
      scene.add(warmLight);

      // Floating Creative Island Base
      const island = new THREE.Group();
      const topDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(2.55, 2.35, 0.36, 32),
        new THREE.MeshStandardMaterial({ color: 0x4ecdc4, roughness: 0.45, metalness: 0.08 })
      );
      topDisc.position.y = -0.95;
      island.add(topDisc);

      const rockCone = new THREE.Mesh(
        new THREE.ConeGeometry(2.32, 1.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x433878, roughness: 0.72, flatShading: true })
      );
      rockCone.rotation.x = Math.PI;
      rockCone.position.y = -1.8;
      island.add(rockCone);
      scene.add(island);

      // Interactive 3D Learning Toys
      const interactiveToys = [];

      // 1. Ringed Planet (Moon & Cosmos)
      const planetGroup = new THREE.Group();
      const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 28, 28),
        new THREE.MeshStandardMaterial({ color: 0xff6584, roughness: 0.35, metalness: 0.15 })
      );
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.09, 14, 48),
        new THREE.MeshStandardMaterial({ color: 0xffe156, roughness: 0.3, metalness: 0.35, emissive: 0x443300, emissiveIntensity: 0.3 })
      );
      ringMesh.rotation.x = Math.PI * 0.38;
      ringMesh.rotation.y = 0.25;
      planetGroup.add(planetMesh, ringMesh);
      planetGroup.position.set(-1.55, 0.55, 0.35);
      planetGroup.userData = {
        label: '🌙 Moon Phases 3D Observatory — Orbit Earth, Moon & Sun!',
        href: 'science/g1_moon_phases.html',
        freq: 523.25,
        baseY: 0.55,
        phase: 0,
        bounce: 0,
      };
      scene.add(planetGroup);
      interactiveToys.push(planetGroup);

      // 2. Earth Globe (Day & Night)
      const earthGroup = new THREE.Group();
      const earthSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 28, 28),
        new THREE.MeshStandardMaterial({ color: 0x2b8be6, roughness: 0.4, metalness: 0.1 })
      );
      const landMat = new THREE.MeshStandardMaterial({ color: 0x56d364, roughness: 0.5 });
      const land1 = new THREE.Mesh(new THREE.SphereGeometry(0.635, 16, 16, 0.2, 1.2, 0.7, 1.1), landMat);
      const land2 = new THREE.Mesh(new THREE.SphereGeometry(0.635, 16, 16, 3.1, 1.4, 1.0, 1.1), landMat);
      earthGroup.add(earthSphere, land1, land2);
      earthGroup.position.set(0.05, 0.9, -0.55);
      earthGroup.userData = {
        label: '🌍 Day & Night 3D Detectives — Spin Earth in real sunlight!',
        href: 'science/g1_day_and_night_detectives.html',
        freq: 587.33,
        baseY: 0.9,
        phase: 1.5,
        bounce: 0,
      };
      scene.add(earthGroup);
      interactiveToys.push(earthGroup);

      // 3. Mechanical Gear (Bike Gear 3D Lab)
      const gearGroup = new THREE.Group();
      const gearShape = new THREE.Shape();
      const teeth = 10;
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? 0.62 : 0.48;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) gearShape.moveTo(x, y);
        else gearShape.lineTo(x, y);
      }
      gearShape.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, 0, 0.2, 0, Math.PI * 2, true);
      gearShape.holes.push(hole);
      const gearMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(gearShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }),
        new THREE.MeshStandardMaterial({ color: 0xffe156, roughness: 0.25, metalness: 0.65 })
      );
      gearMesh.geometry.center();
      gearGroup.add(gearMesh);
      gearGroup.position.set(1.55, 0.45, 0.25);
      gearGroup.userData = {
        label: '⚙️ Bike Gear 3D Lab — Swap sprockets and pedal in 3D!',
        href: 'science/g1_bike_gear.html',
        freq: 659.25,
        baseY: 0.45,
        phase: 3.0,
        bounce: 0,
      };
      scene.add(gearGroup);
      interactiveToys.push(gearGroup);

      // 4. Crystal Geometry Prism (3D Shapes & Angles)
      const prismGroup = new THREE.Group();
      const prismMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.56, 0),
        new THREE.MeshStandardMaterial({ color: 0xb388ff, roughness: 0.18, metalness: 0.35, flatShading: true })
      );
      const wireMesh = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.58, 0)),
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      prismGroup.add(prismMesh, wireMesh);
      prismGroup.position.set(0.05, 0.12, 1.38);
      prismGroup.userData = {
        label: '📐 Angle Finder & 3D Shapes — Inspect geometry in 3D!',
        href: 'math/g2_angle_finder.html',
        freq: 783.99,
        baseY: 0.12,
        phase: 4.5,
        bounce: 0,
      };
      scene.add(prismGroup);
      interactiveToys.push(prismGroup);

      // Starfield
      const starGeo = new THREE.BufferGeometry();
      const starCount = 220;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 26;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff7cc, size: 0.09, transparent: true, opacity: 0.85 }));
      scene.add(stars);

      // Sparkle Burst Particles
      const bursts = [];
      function spawnBurst(pos) {
        const g = new THREE.Group();
        g.position.copy(pos);
        const colors = [0xffe156, 0xff6584, 0x4ecdc4, 0x38b6ff, 0xffffff];
        for (let i = 0; i < 14; i++) {
          const p = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.07, 0),
            new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 1 })
          );
          const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize();
          p.userData = { vel: dir.multiplyScalar(0.045 + Math.random() * 0.04) };
          g.add(p);
        }
        g.userData = { life: 1 };
        scene.add(g);
        bursts.push(g);
      }

      // Raycasting on Tap/Click
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let downPos = { x: 0, y: 0 };

      renderer.domElement.addEventListener('pointerdown', e => {
        downPos = { x: e.clientX, y: e.clientY };
      });

      renderer.domElement.addEventListener('pointerup', e => {
        const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (moved > 8) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(interactiveToys, true);
        if (hits.length > 0) {
          let target = hits[0].object;
          while (target.parent && !interactiveToys.includes(target)) target = target.parent;
          if (target.userData && target.userData.label) {
            target.userData.bounce = 1.0;
            statusEl.textContent = target.userData.label;
            launchEl.href = target.userData.href;
            spawnBurst(target.position);
            playChime(target.userData.freq);
          }
        }
      });

      resetBtn.addEventListener('click', () => {
        controls.reset();
        camera.position.set(0, 3.1, 7.2);
        playChime(440);
      });

      const clock = new THREE.Clock();
      function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        interactiveToys.forEach(toy => {
          toy.rotation.y += 0.009;
          if (toy === gearGroup) toy.rotation.z -= 0.015;
          let extraY = 0;
          let s = 1;
          if (toy.userData.bounce > 0) {
            toy.userData.bounce = Math.max(0, toy.userData.bounce - 0.04);
            extraY = Math.sin(toy.userData.bounce * Math.PI) * 0.45;
            s = 1 + Math.sin(toy.userData.bounce * Math.PI) * 0.24;
          }
          toy.position.y = toy.userData.baseY + Math.sin(t * 1.8 + toy.userData.phase) * 0.12 + extraY;
          toy.scale.setScalar(s);
        });

        stars.rotation.y = t * 0.025;

        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.userData.life -= 0.032;
          b.children.forEach(p => {
            p.position.add(p.userData.vel);
            p.material.opacity = Math.max(0, b.userData.life);
          });
          if (b.userData.life <= 0) {
            scene.remove(b);
            bursts.splice(i, 1);
          }
        }

        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      window.addEventListener('resize', () => {
        const w = stage.clientWidth;
        const h = Math.max(stage.clientHeight, 240);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
    } catch (err) {
      console.warn('[Hub 3D] WebGL fallback:', err);
      stage.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#ffe156;font-weight:900;padding:20px;text-align:center;">✨ Explore our Interactive 3D Courses below!</div>';
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
    '/apple-touch-icon-180x180.png',
    '/apple-touch-icon.png',
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
