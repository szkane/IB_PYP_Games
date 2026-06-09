#!/usr/bin/env node
import { chromium } from 'playwright';
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

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function enrichPage(page, category, entity) {
  const failures = [];
  await page.goto(entity.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(350);

  const info = await page.evaluate(() => {
    const text = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const title = text(document.querySelector('#firstHeading')?.textContent || '');

    const imageEl =
      document.querySelector('.infobox-imagearea img') ||
      document.querySelector('.infobox img');
    const imageUrl =
      imageEl?.getAttribute('src') ||
      imageEl?.getAttribute('data-src') ||
      imageEl?.currentSrc ||
      '';

    const langAnchor =
      document.querySelector('#p-lang-btn-popup a[href*="zh.minecraft.wiki"]') ||
      Array.from(document.querySelectorAll('a[href*="zh.minecraft.wiki"]'))[0];

    const zhHref = langAnchor?.getAttribute('href') || '';
    const zhName = text(langAnchor?.textContent || '');

    return { title, imageUrl, zhHref, zhName };
  });

  if (!info.imageUrl) failures.push('no-image');
  if (!info.zhHref) failures.push('no-zh-link');

  return {
    category,
    title: clean(info.title || entity.title),
    en_page: entity.href,
    image: info.imageUrl
      ? (info.imageUrl.startsWith('http') ? info.imageUrl : `https:${info.imageUrl}`)
      : '',
    zh_page: info.zhHref || '',
    zh: clean(info.zhName),
    failures
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const inPath = args.in;
  const outPath = args.out || '/tmp/mob-enriched.json';
  if (!inPath) {
    console.error('Missing --in <mob-categories.json>');
    process.exit(1);
  }

  const raw = JSON.parse(await fs.readFile(inPath, 'utf8'));
  const byCategory = raw.byCategory || {};

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const records = [];
  for (const [category, items] of Object.entries(byCategory)) {
    for (const entity of items) {
      const enriched = await enrichPage(page, category, entity);
      records.push(enriched);
      console.log(`[${category}] ${enriched.title} ${enriched.failures.length ? `(${enriched.failures.join(',')})` : ''}`);
    }
  }

  await browser.close();

  const grouped = records.reduce((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {});

  const summary = {
    total: records.length,
    withImage: records.filter((r) => r.image).length,
    withZh: records.filter((r) => r.zh_page).length,
    failures: records.filter((r) => r.failures.length).length
  };

  const payload = {
    extractedAt: new Date().toISOString(),
    summary,
    records,
    grouped
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved enriched records to ${outPath}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[enrich_entity_pages] failed:', err);
  process.exit(1);
});
