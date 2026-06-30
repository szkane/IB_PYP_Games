/**
 * Validate the PYP curriculum map against standalone HTML game pages.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, posix, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src');
const rootIndexPath = resolve(__dirname, '../index.html');
const curriculumPath = resolve(srcDir, 'data/curriculum-map.json');
const indexPath = resolve(srcDir, 'index.html');
const serviceWorkerPath = resolve(srcDir, 'sw.js');

const requiredSubjects = ['uoi', 'literacy', 'math', 'science', 'chinese'];
const newUoiGamePaths = [
  'uoi/goal_steps_quest.html',
  'uoi/community_helpers_sort.html',
  'uoi/story_sequencer.html',
  'uoi/needs_of_living_things.html',
  'uoi/life_cycle_builder.html',
  'uoi/g2_vocabulary.html',
];
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
      pages.push(relativePath);
    }
  }

  return pages;
}

function collectCurriculumEntries(curriculum) {
  const entries = [];
  for (const grade of curriculum.grades) {
    for (const unit of grade.units || []) {
      for (const subject of unit.subjects || []) {
        for (const game of subject.games || []) {
          entries.push({ grade, unit, subject, game });
        }
      }
    }
  }
  return entries;
}

function assertContains(errors, content, pattern, message) {
  if (!pattern.test(content)) {
    errors.push(message);
  }
}

function expectedMapHref(pagePath) {
  const pageDir = posix.dirname(pagePath);
  const href = posix.relative(pageDir, 'index.html');
  return href || 'index.html';
}

function fail(errors) {
  console.error(`Curriculum QA failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

function main() {
  const errors = [];
  const curriculum = readJson(curriculumPath);
  const rootIndexHtml = readFileSync(rootIndexPath, 'utf8');
  const indexHtml = readFileSync(indexPath, 'utf8');
  const serviceWorker = readFileSync(serviceWorkerPath, 'utf8');
  const pages = findGamePages(srcDir);
  const pageSet = new Set(pages);
  const entries = collectCurriculumEntries(curriculum);
  const mappedPaths = new Set(entries.map(entry => entry.game.path));

  assertContains(
    errors,
    indexHtml,
    /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/,
    'Generated index is missing a responsive viewport meta tag.',
  );
  assertContains(
    errors,
    indexHtml,
    /@media \(max-width: 900px\)/,
    'Generated index is missing the iPad/tablet responsive media query.',
  );
  assertContains(
    errors,
    indexHtml,
    /@media \(max-width: 640px\)/,
    'Generated index is missing the small-screen responsive media query.',
  );
  assertContains(
    errors,
    rootIndexHtml,
    /url=src\/index\.html/,
    'Root index should redirect to the generated PYP learning map.',
  );
  assertContains(
    errors,
    rootIndexHtml,
    /href="src\/index\.html"/,
    'Root index should include a manual link to the generated PYP learning map.',
  );

  if (indexHtml.includes('target="_blank"')) {
    errors.push('Generated index should keep game links in the same tab for iPad classroom flow.');
  }

  if (curriculum.grades.length !== 5) {
    errors.push(`Expected 5 grades, found ${curriculum.grades.length}.`);
  }

  for (const grade of curriculum.grades.filter(item => item.id !== 'g1' && item.id !== 'g2')) {
    if (grade.status !== 'planned') {
      errors.push(`${grade.label} should remain marked as planned until UOI documents are added.`);
    }

    const panelPattern = new RegExp(`<section class="grade-panel" id="${grade.id}"[\\s\\S]*?<\\/section>`);
    const panelMatch = indexHtml.match(panelPattern);
    if (!panelMatch) {
      errors.push(`Generated index is missing planned panel for ${grade.label}.`);
      continue;
    }

    const panelHtml = panelMatch[0];
    const plannedUnitCount = (panelHtml.match(/class="planned-unit"/g) || []).length;
    if (plannedUnitCount !== plannedThemes.length) {
      errors.push(`${grade.label} should show ${plannedThemes.length} planned units, found ${plannedUnitCount}.`);
    }

    for (const theme of plannedThemes) {
      if (!panelHtml.includes(theme)) {
        errors.push(`${grade.label} planned panel is missing theme: ${theme}.`);
      }
    }
  }

  const gradeOne = curriculum.grades.find(grade => grade.id === 'g1');
  if (!gradeOne) {
    errors.push('Missing Grade 1 curriculum entry.');
  } else {
    if ((gradeOne.units || []).length !== 6) {
      errors.push(`Expected Grade 1 to have 6 units, found ${(gradeOne.units || []).length}.`);
    }

    for (const unit of gradeOne.units || []) {
      const subjectIds = new Set((unit.subjects || []).map(subject => subject.id));
      const missingSubjects = requiredSubjects.filter(subject => {
        if (subject === 'science') {
          return unit.id === 'u1' || unit.id === 'u2' || unit.id === 'u3' || unit.id === 'u6'
            ? false
            : !subjectIds.has(subject);
        }
        return !subjectIds.has(subject);
      });
      if (missingSubjects.length > 0) {
        errors.push(`${unit.label} is missing subject lanes: ${missingSubjects.join(', ')}.`);
      }
    }
  }

  for (const entry of entries) {
    if (!pageSet.has(entry.game.path)) {
      errors.push(`Mapped game file does not exist: ${entry.game.path}.`);
    }

    const href = entry.game.href || entry.game.path;
    if (!indexHtml.includes(`href="${href}"`)) {
      errors.push(`Generated index is missing link href="${href}".`);
    }
    if (!serviceWorker.includes(`'/${href}'`)) {
      errors.push(`Service worker precache is missing curriculum href: /${href}.`);
    }
  }

  for (const page of pages) {
    if (!mappedPaths.has(page)) {
      errors.push(`HTML game is not assigned in curriculum map: ${page}.`);
    }

    const html = readFileSync(resolve(srcDir, page), 'utf8');
    if (!/<meta\s+name=["']viewport["']/i.test(html)) {
      errors.push(`HTML game is missing viewport meta: ${page}.`);
    }
    if (!html.includes('pyp-map-link') && !html.includes('map-link')) {
      errors.push(`HTML game is missing a PYP map return link: ${page}.`);
    }

    const linkMatch = html.match(/<a class="(?:pyp-map-link|map-link)" href="([^"]+)"/);
    if (linkMatch && linkMatch[1] !== expectedMapHref(page)) {
      errors.push(`HTML game has incorrect PYP map href: ${page} uses ${linkMatch[1]}, expected ${expectedMapHref(page)}.`);
    }
  }

  for (const grade of curriculum.grades) {
    if (!indexHtml.includes(grade.label)) {
      errors.push(`Generated index is missing grade label: ${grade.label}.`);
    }
  }

  for (const newGamePath of newUoiGamePaths) {
    if (!existsSync(resolve(srcDir, newGamePath))) {
      errors.push(`New UOI game is missing: ${newGamePath}.`);
      continue;
    }
    if (!mappedPaths.has(newGamePath)) {
      errors.push(`New UOI game is not mapped: ${newGamePath}.`);
    }

    const html = readFileSync(resolve(srcDir, newGamePath), 'utf8');
    assertContains(
      errors,
      html,
      /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/,
      `New UOI game is missing viewport meta: ${newGamePath}.`,
    );
    assertContains(
      errors,
      html,
      /<style>[\s\S]*<\/style>/,
      `New UOI game should carry its own embedded CSS: ${newGamePath}.`,
    );
    assertContains(
      errors,
      html,
      /<script>[\s\S]*<\/script>/,
      `New UOI game should carry its own embedded JavaScript: ${newGamePath}.`,
    );
    if (/<script\s+src=/i.test(html) || /<link\s+[^>]*rel=["']stylesheet["']/i.test(html)) {
      errors.push(`New UOI game should remain standalone without external scripts/stylesheets: ${newGamePath}.`);
    }
    assertContains(
      errors,
      html,
      /min-height\s*:\s*(4[4-9]|[5-9]\d|\d{3,})px/,
      `New UOI game is missing 44px+ touch target sizing: ${newGamePath}.`,
    );
    assertContains(
      errors,
      html,
      /@media\s*\(max-width:\s*82?0px\)/,
      `New UOI game is missing tablet responsive media query: ${newGamePath}.`,
    );
  }

  if (errors.length > 0) {
    fail(errors);
  }

  console.log(JSON.stringify({
    status: 'ok',
    grades: curriculum.grades.length,
    gradeOneUnits: gradeOne?.units?.length || 0,
    htmlPages: pages.length,
    mappedPaths: mappedPaths.size,
    curriculumEntries: entries.length,
    standaloneUoiGames: newUoiGamePaths.length,
  }, null, 2));
}

main();
