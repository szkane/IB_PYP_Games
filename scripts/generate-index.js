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
 * Generate index.html content with stunning visual design
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
  
  // Category icons and colors
  const categoryMeta = {
    'Chinese': { icon: '🀄', gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)' },
    'literacy': { icon: '📚', gradient: 'linear-gradient(135deg, #a29bfe, #6c5ce7)' },
    'math': { icon: '🔢', gradient: 'linear-gradient(135deg, #00b894, #00cec9)' },
    'science': { icon: '🔬', gradient: 'linear-gradient(135deg, #fdcb6e, #f39c12)' }
  };
  
  // Build HTML sections with game cards
  let sections = '';
  const categoryOrder = ['Chinese', 'literacy', 'math', 'science'];
  let cardIndex = 0;
  
  for (const cat of categoryOrder) {
    if (grouped[cat] && grouped[cat].length > 0) {
      const displayName = categoryNames[cat] || cat;
      const meta = categoryMeta[cat] || { icon: '🎮', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' };
      
      const gameCards = grouped[cat].map((p, i) => {
        const delay = (cardIndex + i) * 0.1;
        return `                <a href="${p.path}" class="game-card" style="animation-delay: ${delay}s">
                    <span class="card-icon">${meta.icon}</span>
                    <span class="card-title">${p.title}</span>
                    <span class="card-arrow">→</span>
                </a>`;
      }).join('\n');
      
      cardIndex += grouped[cat].length;
      
      sections += `
            <section class="category-section">
                <h2 class="category-title">
                    <span class="category-icon" style="background: ${meta.gradient}">${meta.icon}</span>
                    ${displayName}
                </h2>
                <div class="games-grid">
${gameCards}
                </div>
            </section>
`;
    }
  }
  
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IB PYP Games | Interactive Learning Adventures</title>
    <meta name="description" content="Explore interactive educational games for IB Primary Years Programme students. Learn Chinese, Literacy, Math, and Science through play.">
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#1a1a2e">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0f0f1a;
            --bg-secondary: #1a1a2e;
            --text-primary: #ffffff;
            --text-secondary: #a0a0b0;
            --accent-cyan: #00f5ff;
            --accent-purple: #bf5af2;
            --accent-pink: #ff6b9d;
            --accent-orange: #ff9f43;
            --card-bg: rgba(255, 255, 255, 0.03);
            --card-border: rgba(255, 255, 255, 0.08);
            --glow-cyan: rgba(0, 245, 255, 0.3);
            --glow-purple: rgba(191, 90, 242, 0.3);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Quicksand', sans-serif;
            line-height: 1.6;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Aurora Background */
        .aurora-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
        }

        .aurora-bg::before,
        .aurora-bg::after {
            content: '';
            position: absolute;
            width: 150%;
            height: 150%;
            background: radial-gradient(ellipse at 20% 50%, var(--glow-purple) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 20%, var(--glow-cyan) 0%, transparent 40%),
                        radial-gradient(ellipse at 40% 80%, rgba(255, 107, 157, 0.15) 0%, transparent 45%);
            animation: aurora 20s ease-in-out infinite alternate;
        }

        .aurora-bg::after {
            animation-delay: -10s;
            animation-direction: alternate-reverse;
        }

        @keyframes aurora {
            0% { transform: translate(-10%, -10%) rotate(0deg); }
            100% { transform: translate(10%, 10%) rotate(15deg); }
        }

        /* Grid Pattern Overlay */
        .grid-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            background-size: 60px 60px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 24px 80px;
            position: relative;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 60px;
            padding: 40px 0;
        }

        .logo {
            font-family: 'Nunito', sans-serif;
            font-size: clamp(2.5rem, 8vw, 4rem);
            font-weight: 900;
            background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 50%, var(--accent-pink) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.02em;
            margin-bottom: 12px;
            animation: glow-text 3s ease-in-out infinite alternate;
        }

        @keyframes glow-text {
            0% { filter: drop-shadow(0 0 20px var(--glow-cyan)); }
            100% { filter: drop-shadow(0 0 30px var(--glow-purple)); }
        }

        .tagline {
            font-size: 1.1rem;
            color: var(--text-secondary);
            font-weight: 500;
            letter-spacing: 0.3em;
            text-transform: uppercase;
        }

        /* Floating decorations */
        .decoration {
            position: absolute;
            font-size: 2rem;
            opacity: 0.6;
            animation: float 6s ease-in-out infinite;
            pointer-events: none;
        }

        .decoration:nth-child(1) { top: 10%; left: 5%; animation-delay: 0s; }
        .decoration:nth-child(2) { top: 15%; right: 8%; animation-delay: 1s; }
        .decoration:nth-child(3) { top: 50%; left: 2%; animation-delay: 2s; }
        .decoration:nth-child(4) { top: 70%; right: 3%; animation-delay: 3s; }

        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
        }

        /* Category Sections */
        .category-section {
            margin-bottom: 50px;
        }

        .category-title {
            font-family: 'Nunito', sans-serif;
            font-size: 1.8rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--card-border);
        }

        .category-icon {
            width: 46px;
            height: 46px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.3);
        }

        /* Games Grid */
        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
        }

        /* Game Cards */
        .game-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            text-decoration: none;
            color: var(--text-primary);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            animation: card-enter 0.6s ease-out backwards;
        }

        @keyframes card-enter {
            0% {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .game-card::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 16px;
            padding: 2px;
            background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple), var(--accent-pink), var(--accent-orange));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .game-card:hover {
            transform: translateY(-4px) scale(1.02);
            background: rgba(255, 255, 255, 0.06);
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.4),
                        0 0 60px -20px var(--glow-cyan);
        }

        .game-card:hover::before {
            opacity: 1;
        }

        .card-icon {
            font-size: 1.6rem;
            flex-shrink: 0;
            opacity: 0.8;
            transition: transform 0.3s ease;
        }

        .game-card:hover .card-icon {
            transform: scale(1.2) rotate(-5deg);
        }

        .card-title {
            flex: 1;
            font-weight: 600;
            font-size: 1rem;
            line-height: 1.4;
        }

        .card-arrow {
            font-size: 1.2rem;
            opacity: 0;
            transform: translateX(-10px);
            transition: all 0.3s ease;
            color: var(--accent-cyan);
        }

        .game-card:hover .card-arrow {
            opacity: 1;
            transform: translateX(0);
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid var(--card-border);
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .footer-hearts {
            font-size: 1.5rem;
            margin-bottom: 8px;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        /* Responsive */
        @media (max-width: 640px) {
            .container {
                padding: 24px 16px 60px;
            }
            
            .header {
                margin-bottom: 40px;
                padding: 20px 0;
            }

            .games-grid {
                grid-template-columns: 1fr;
            }

            .category-title {
                font-size: 1.4rem;
            }

            .tagline {
                font-size: 0.85rem;
                letter-spacing: 0.2em;
            }

            .decoration {
                display: none;
            }
        }

    </style>
</head>

<body>
    <div class="aurora-bg"></div>
    <div class="grid-overlay"></div>
    
    <div class="container">
        <div class="decoration">✨</div>
        <div class="decoration">🚀</div>
        <div class="decoration">🌟</div>
        <div class="decoration">💫</div>

        <header class="header">
            <h1 class="logo">IB PYP Games</h1>
            <p class="tagline">Interactive Learning Adventures</p>
        </header>

        <main>
${sections}
        </main>

        <footer class="footer">
            <div class="footer-hearts">🎮 ❤️ 📖</div>
            <p>Made for curious minds</p>
        </footer>
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
 * Update sw.js cache version with build timestamp
 * This ensures each deployment gets a fresh cache
 */
function updateServiceWorker() {
  const swPath = resolve(srcDir, 'sw.js');
  let swContent = readFileSync(swPath, 'utf-8');
  
  // Generate version from current timestamp (YYYYMMDDHHMMSS format)
  const now = new Date();
  const version = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  
  // Update the CACHE_VERSION constant
  swContent = swContent.replace(
    /const CACHE_VERSION = '[^']*';/,
    `const CACHE_VERSION = '${version}';`
  );
  
  writeFileSync(swPath, swContent);
  console.log(`Updated sw.js cache version to: ${version}`);
}

// Main
const pages = findGamePages(srcDir);
console.log(`Found ${pages.length} game pages:`);
pages.forEach(p => console.log(`  - [${p.category}] ${p.title}: ${p.path}`));

// Generate index.html
const indexHtml = generateIndexHtml(pages);
writeFileSync(resolve(srcDir, 'index.html'), indexHtml);
console.log('Generated index.html');

// Update sw.js cache version
updateServiceWorker();

console.log('Done!');
