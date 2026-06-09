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

const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function main() {
  const args = parseArgs(process.argv);
  const categories = (args.categories || 'Passive,Neutral,Hostile')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const outPath = args.out || '/tmp/mob-categories.json';
  const url = args.url || 'https://minecraft.wiki/w/Mob';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);

  const data = await page.evaluate((wantedCategories) => {
    const clean = (v) => (v || '').replace(/\s+/g, ' ').trim();
    const sectionNodes = Array.from(document.querySelectorAll('h2, h3'));
    const wanted = new Set(wantedCategories.map((x) => x.toLowerCase()));
    /** @type {Record<string, Array<{title:string, href:string}>>} */
    const byCategory = {};

    for (const heading of sectionNodes) {
      const text = clean(heading.textContent || '');
      const category = wantedCategories.find((w) => text.toLowerCase().includes(w.toLowerCase()));
      if (!category) continue;

      const links = [];
      let node = heading.nextElementSibling;
      while (node && !/^H[23]$/.test(node.tagName)) {
        const anchors = Array.from(node.querySelectorAll('a[href^="/w/"]'));
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          if (!href.startsWith('/w/')) continue;
          if (href.includes(':')) continue;
          const title = clean(a.getAttribute('title') || a.textContent || '');
          if (!title) continue;
          links.push({
            title,
            href: `https://minecraft.wiki${href.split('#')[0]}`
          });
        }
        node = node.nextElementSibling;
      }

      const uniq = new Map();
      for (const l of links) {
        if (!uniq.has(l.href)) uniq.set(l.href, l);
      }
      byCategory[category] = Array.from(uniq.values());
    }

    const counts = Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, v.length])
    );

    return { byCategory, counts, extractedAt: new Date().toISOString() };
  }, categories);

  await browser.close();

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved category extraction to ${outPath}`);
  console.log(JSON.stringify(data.counts, null, 2));
}

main().catch((err) => {
  console.error('[extract_mob_categories] failed:', err);
  process.exit(1);
});
