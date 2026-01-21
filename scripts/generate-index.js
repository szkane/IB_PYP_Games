/**
 * Auto-generate index.html and update sw.js cache list
 * Run before Vite build
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { resolve, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src');

// Category display names (can be customized)
const categoryNames = {
  'Chinese': 'Chinese',
  'literacy': 'Literacy',
  'math': 'Math',
  'science': 'Science'
};

/**
 * Extract title from HTML file
 */
function extractTitle(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/<title>([^<]+)<\/title>/i);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    console.warn(`Failed to read ${filePath}: ${e.message}`);
  }
  // Fallback to filename without extension
  return basename(filePath, '.html').replace(/_/g, ' ');
}

/**
 * Recursively find all HTML files
 * - Excludes root index.html (the main navigation page)
 * - Includes subdirectory index.html files (like movespelling/index.html)
 */
function findGamePages(dir, baseDir = dir, pages = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = resolve(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip hidden directories and special directories
      if (!file.startsWith('.')) {
        findGamePages(filePath, baseDir, pages);
      }
    } else if (file.endsWith('.html')) {
      const relativePath = relative(baseDir, filePath);
      const pathParts = relativePath.split('/');
      const category = pathParts[0];
      const depth = pathParts.length;
      
      // Skip root index.html
      if (relativePath === 'index.html') {
        continue;
      }
      
      // Include files at depth 2 (category/file.html)
      // Include subdirectory index.html at depth 3 (category/subdir/index.html)
      if (depth === 2 || (depth === 3 && file === 'index.html')) {
        pages.push({
          path: relativePath,
          category: category,
          title: extractTitle(filePath)
        });
      }
    }
  }
  
  return pages;
}

/**
 * Generate index.html content
 */
function generateIndexHtml(pages) {
  // Group by category
  const grouped = {};
  for (const page of pages) {
    if (!grouped[page.category]) {
      grouped[page.category] = [];
    }
    grouped[page.category].push(page);
  }
  
  // Build HTML sections
  let sections = '';
  const categoryOrder = ['Chinese', 'literacy', 'math', 'science'];
  
  for (const cat of categoryOrder) {
    if (grouped[cat] && grouped[cat].length > 0) {
      const displayName = categoryNames[cat] || cat;
      sections += `
        <h2>${displayName}</h2>
        <ul>
${grouped[cat].map(p => `            <li><a href="${p.path}">${p.title}</a></li>`).join('\n')}
        </ul>
`;
    }
  }
  
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IB PYP Games</title>
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#007bff">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }

        .container {
            max-width: 800px;
            margin: auto;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h1,
        h2 {
            color: #007bff;
            text-align: center;
        }

        ul {
            list-style: none;
            padding: 0;
        }

        li {
            margin-bottom: 10px;
        }

        a {
            text-decoration: none;
            color: #007bff;
            display: block;
            padding: 15px;
            background: #f0f8ff;
            border-radius: 5px;
            transition: background-color 0.3s;
        }

        a:hover {
            background-color: #e0f0ff;
        }

    </style>
</head>

<body>
    <div class="container">
        <h1>IB PYP Games</h1>
${sections}
    </div>
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
            });
        }
    </script>
</body>

</html>
`;
}

/**
 * Update sw.js cache list
 */
function updateServiceWorker(pages) {
  const swPath = resolve(srcDir, 'sw.js');
  let swContent = readFileSync(swPath, 'utf-8');
  
  // Build new cache list
  const cacheUrls = [
    "'/'",
    "'/index.html'",
    "'/manifest.json'",
    "'/icon-192.png'",
    "'/icon-512.png'",
    ...pages.map(p => `'/${p.path}'`)
  ];
  
  const newCacheArray = `const urlsToCache = [
    ${cacheUrls.join(',\n    ')}
];`;
  
  // Replace existing urlsToCache
  swContent = swContent.replace(
    /const urlsToCache = \[[\s\S]*?\];/,
    newCacheArray
  );
  
  writeFileSync(swPath, swContent);
  console.log('Updated sw.js cache list');
}

// Main
const pages = findGamePages(srcDir);
console.log(`Found ${pages.length} game pages:`);
pages.forEach(p => console.log(`  - [${p.category}] ${p.title}: ${p.path}`));

// Generate index.html
const indexHtml = generateIndexHtml(pages);
writeFileSync(resolve(srcDir, 'index.html'), indexHtml);
console.log('Generated index.html');

// Update sw.js
updateServiceWorker(pages);

console.log('Done!');
