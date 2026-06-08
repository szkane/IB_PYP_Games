/**
 * Print curriculum-driven URLs for manual browser QA.
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src');
const curriculumPath = resolve(srcDir, 'data/curriculum-map.json');
const requestedBaseUrl = process.argv[2];
const baseUrl = requestedBaseUrl || 'http://localhost:5173/';

function printHelp() {
  console.log(`Usage: npm run qa:urls [-- <base-url>]

Print curriculum-driven URLs for manual browser QA.

Examples:
  npm run qa:urls
  npm run qa:urls -- http://localhost:4173/
  npm run qa:urls -- https://example.com/pyp-games/`);
}

if (requestedBaseUrl === '--help' || requestedBaseUrl === '-h') {
  printHelp();
  process.exit(0);
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  return url.toString();
}

function joinUrl(base, path) {
  return new URL(path, base).toString();
}

function main() {
  let normalizedBaseUrl;
  try {
    normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  } catch {
    console.error(`Invalid base URL: ${baseUrl}`);
    console.error('Run npm run qa:urls -- --help for usage.');
    process.exit(1);
  }

  const curriculum = JSON.parse(readFileSync(curriculumPath, 'utf8'));
  const lines = [];

  lines.push('# Manual QA URLs');
  lines.push('');
  lines.push(`Base URL: ${normalizedBaseUrl}`);
  lines.push('');
  lines.push('## Homepage');
  lines.push(`- ${joinUrl(normalizedBaseUrl, '')}`);
  lines.push('');

  for (const grade of curriculum.grades) {
    lines.push(`## ${grade.label}`);
    lines.push(`- ${joinUrl(normalizedBaseUrl, `#${grade.id}`)} - ${grade.status === 'active' ? 'active curriculum map' : 'planned curriculum space'}`);

    for (const unit of grade.units || []) {
      lines.push('');
      lines.push(`### ${unit.label}: ${unit.title}`);
      lines.push(`Theme: ${unit.theme}`);
      for (const subject of unit.subjects || []) {
        lines.push(`- ${subject.label}`);
        for (const game of subject.games || []) {
          const href = game.href || game.path;
          lines.push(`  - ${joinUrl(normalizedBaseUrl, href)} - ${game.title}`);
        }
      }
    }

    lines.push('');
  }

  console.log(lines.join('\n'));
}

main();
