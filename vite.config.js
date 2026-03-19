import { defineConfig } from 'vite';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, relative, dirname, join } from 'path';

// Recursively find all HTML files in src directory
function findHtmlFiles(dir, htmlFiles = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = resolve(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, htmlFiles);
    } else if (file.endsWith('.html')) {
      htmlFiles.push(filePath);
    }
  }
  return htmlFiles;
}

// Recursively copy directory
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const files = readdirSync(src);
  for (const file of files) {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Get all HTML files as rollup input
const srcDir = resolve(__dirname, 'src');
const htmlFiles = findHtmlFiles(srcDir);
const input = {};
for (const file of htmlFiles) {
  const relativePath = relative(srcDir, file);
  const name = relativePath.replace(/\.html$/, '').replace(/\//g, '_');
  input[name] = file;
}

export default defineConfig({
  root: 'src',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input,
      // Externalize CDN imports - these are loaded via importmap in HTML
      external: [
        'three',
        /^three\//,
        /^https:\/\//,
      ],
    },
    minify: 'terser',
    terserOptions: {
      mangle: true,
      compress: {
        drop_console: false,
      },
    },
  },
  plugins: [
    ViteMinifyPlugin({}),
    // Custom plugin to copy static files and non-module JS
    {
      name: 'copy-static-files',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');
        
        // Copy root static files
        const staticFiles = ['manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png'];
        for (const file of staticFiles) {
          const srcPath = resolve(srcDir, file);
          const destPath = resolve(distDir, file);
          if (existsSync(srcPath)) {
            mkdirSync(dirname(destPath), { recursive: true });
            copyFileSync(srcPath, destPath);
            console.log(`Copied: ${file}`);
          }
        }
        
        // Generic: Copy all non-module JS and asset directories for each game
        const categories = ['Chinese', 'literacy', 'math', 'science'];
        for (const category of categories) {
          const categoryPath = resolve(srcDir, category);
          if (!existsSync(categoryPath)) continue;
          
          const gameDirs = readdirSync(categoryPath);
          for (const gameDir of gameDirs) {
            const gamePath = resolve(categoryPath, gameDir);
            if (!statSync(gamePath).isDirectory()) continue;
            
            // Skip hidden directories
            if (gameDir.startsWith('.')) continue;
            
            // Copy js directory if exists (for non-module scripts)
            const jsSrc = resolve(gamePath, 'js');
            if (existsSync(jsSrc)) {
              const jsDest = resolve(distDir, category, gameDir, 'js');
              copyDir(jsSrc, jsDest);
              console.log(`Copied: ${category}/${gameDir}/js/`);
            }
            
            // Copy css directory if exists
            const cssSrc = resolve(gamePath, 'css');
            if (existsSync(cssSrc)) {
              const cssDest = resolve(distDir, category, gameDir, 'css');
              copyDir(cssSrc, cssDest);
              console.log(`Copied: ${category}/${gameDir}/css/`);
            }
            
            // Copy assets directory if exists (generic pattern)
            const assetsSrc = resolve(gamePath, 'assets');
            if (existsSync(assetsSrc)) {
              const assetsDest = resolve(distDir, category, gameDir, 'assets');
              copyDir(assetsSrc, assetsDest);
              console.log(`Copied: ${category}/${gameDir}/assets/`);
            }
            
            // Copy res directory if exists (for mc_words and similar games)
            const resSrc = resolve(gamePath, 'res');
            if (existsSync(resSrc)) {
              const resDest = resolve(distDir, category, gameDir, 'res');
              copyDir(resSrc, resDest);
              console.log(`Copied: ${category}/${gameDir}/res/`);
            }
            
            // Copy any other directories that might contain assets
            const gameFiles = readdirSync(gamePath);
            for (const item of gameFiles) {
              const itemPath = resolve(gamePath, item);
              const stat = statSync(itemPath);
              if (stat.isDirectory() && !['js', 'css', 'assets', 'res'].includes(item)) {
                // Check if directory contains asset files (not source code)
                const itemFiles = readdirSync(itemPath);
                const hasAssets = itemFiles.some(f => {
                  const ext = f.split('.').pop().toLowerCase();
                  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'json', 'xml'].includes(ext);
                });
                
                if (hasAssets) {
                  const src = resolve(gamePath, item);
                  const dest = resolve(distDir, category, gameDir, item);
                  copyDir(src, dest);
                  console.log(`Copied: ${category}/${gameDir}/${item}/`);
                }
              }
            }
          }
        }
      },
    },
  ],
});
