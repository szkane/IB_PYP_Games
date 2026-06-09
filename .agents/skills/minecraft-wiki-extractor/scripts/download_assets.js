#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function normalizeWord(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function normalizeFileStem(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ext.length <= 6) return ext;
  } catch {}
  return '.png';
}

function dataSnippet(recordsByCategory) {
  const chunks = [];
  for (const [category, records] of Object.entries(recordsByCategory)) {
    const items = records
      .map((r) => `{"word":"${r.word}","en":"${r.en}","zh":"${r.zh}","file":"${r.file}"}`)
      .join(',');
    chunks.push(`"${category}":[${items}]`);
  }
  return `{\n  ${chunks.join(',\n  ')}\n}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const inPath = args.in;
  const destRoot = args.dest;
  const outPath = args.out || '/tmp/mob-data.json';

  if (!inPath || !destRoot) {
    console.error('Usage: node download_assets.js --in <enriched.json> --dest <res/images> [--out <file>]');
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(inPath, 'utf8'));
  const records = raw.records || [];

  const failures = [];
  const results = [];

  for (const rec of records) {
    if (!rec.image) {
      failures.push({ title: rec.title, category: rec.category, reason: 'no-image' });
      continue;
    }

    const ext = extensionFromUrl(rec.image);
    const stem = normalizeFileStem(rec.title) || 'unknown';
    const file = `${stem}${ext}`;
    const word = normalizeWord(rec.title);
    const en = (rec.title || '').toLowerCase();
    const zh = rec.zh || rec.title || '';
    const categoryDir = path.join(destRoot, rec.category);
    const absFile = path.join(categoryDir, file);

    try {
      await fs.mkdir(categoryDir, { recursive: true });
      const response = await fetch(rec.image);
      if (!response.ok) {
        failures.push({ title: rec.title, category: rec.category, reason: `download-failed:${response.status}` });
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(absFile, Buffer.from(arrayBuffer));
      results.push({
        word,
        en,
        zh,
        file,
        category: rec.category,
        source: {
          en_page: rec.en_page || '',
          zh_page: rec.zh_page || '',
          image: rec.image
        }
      });
      console.log(`Downloaded [${rec.category}] ${file}`);
    } catch (error) {
      failures.push({ title: rec.title, category: rec.category, reason: `download-failed:${error.message}` });
    }
  }

  const recordsByCategory = results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({
      word: item.word,
      en: item.en,
      zh: item.zh,
      file: item.file
    });
    return acc;
  }, {});

  for (const cat of Object.keys(recordsByCategory)) {
    recordsByCategory[cat].sort((a, b) => a.en.localeCompare(b.en));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalInput: records.length,
      downloaded: results.length,
      failed: failures.length
    },
    failures,
    recordsByCategory,
    dataJsSnippet: dataSnippet(recordsByCategory)
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved output to ${outPath}`);
  console.log(JSON.stringify(output.summary, null, 2));
}

main().catch((err) => {
  console.error('[download_assets] failed:', err);
  process.exit(1);
});
