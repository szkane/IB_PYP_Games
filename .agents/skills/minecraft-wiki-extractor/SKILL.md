---
name: minecraft-wiki-extractor
description: Extract structured content and media assets from minecraft.wiki pages (especially mob/category pages) into project-ready JSON/JS data and local image files. Use this whenever the user asks to scrape or sync Minecraft wiki entities, categories, Chinese names, infobox media, or bulk-download assets from minecraft.wiki/zh.minecraft.wiki.
---

# Minecraft Wiki Extractor

Extracts data from `https://minecraft.wiki` and `https://zh.minecraft.wiki` into project-friendly formats.

This skill is optimized for workflows like:
- extracting grouped entities from index/list pages (e.g., Passive/Neutral/Hostile mobs),
- visiting each entity page,
- collecting Chinese names and media from infobox areas,
- downloading and renaming assets into category folders,
- generating `data.js`-style arrays.

## When to use

Use this skill when the user asks to:
- scrape Minecraft entities/items/blocks from wiki pages,
- collect multilingual labels (especially Chinese),
- download infobox images/gifs/webp in bulk,
- sync/update local game vocab datasets from official wiki content.

If the task involves a `minecraft.wiki` URL and structured extraction, prefer this skill.

## Included helper scripts

Located in `scripts/`:

- `extract_mob_categories.js`
  - Opens `/w/Mob` with Playwright and extracts all links in requested category sections.
- `enrich_entity_pages.js`
  - Opens each entity page and extracts English name, Chinese name/link, and infobox image URL.
- `download_assets.js`
  - Downloads image assets to `res/images/<Category>/` and emits `data.js`-ready records.

## Output contract

Default output structure per record:

```json
{
  "word": "axolotl",
  "en": "axolotl",
  "zh": "美西螈",
  "file": "axolotl.gif",
  "category": "Passive",
  "source": {
    "en_page": "https://minecraft.wiki/w/Axolotl",
    "zh_page": "https://zh.minecraft.wiki/w/美西螈",
    "image": "https://minecraft.wiki/images/thumb/..."
  }
}
```

For JS embedding:
- use compact object arrays,
- keep stable key order: `word`, `en`, `zh`, `file`.

## Required extraction behavior

1. Category list extraction from `/w/Mob` for target sections.
2. Per-entity enrichment from infobox image area and language popup.
3. Asset download with normalized naming into category folders.
4. Validation by count, file existence, and failures list.

## Playwright/DevTools workflow

Prefer Playwright session extraction for dynamic DOM access and anti-bot resilience.

Selector heuristics:
- Category headings: `h2/h3` + text/id anchors.
- Infobox media: `.infobox-imagearea img`, fallback to first infobox image.
- Language links: `#p-lang-btn-popup a[href*="zh.minecraft.wiki"]`.

## Failure handling

Never fail silently. Return:
- total extracted,
- total downloaded,
- failures list with reasons (`no-category-link`, `no-zh-link`, `no-image`, `download-failed`).
