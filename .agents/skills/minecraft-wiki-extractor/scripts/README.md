Helper scripts for `minecraft-wiki-extractor`.

## 1) Extract categories from /w/Mob

```bash
node .agent/skills/minecraft-wiki-extractor/scripts/extract_mob_categories.js \
  --categories Passive,Neutral,Hostile \
  --out /tmp/mob-categories.json
```

## 2) Enrich entity pages with zh + image

```bash
node .agent/skills/minecraft-wiki-extractor/scripts/enrich_entity_pages.js \
  --in /tmp/mob-categories.json \
  --out /tmp/mob-enriched.json
```

## 3) Download assets and emit mc_words data

```bash
node .agent/skills/minecraft-wiki-extractor/scripts/download_assets.js \
  --in /tmp/mob-enriched.json \
  --dest src/literacy/mc_words/res/images \
  --out /tmp/mob-data.json
```

`/tmp/mob-data.json` includes grouped `recordsByCategory` and a `dataJsSnippet`.
