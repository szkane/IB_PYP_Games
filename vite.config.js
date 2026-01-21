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
        
        // Copy movespelling js directory (non-module scripts)
        const movespellingJsSrc = resolve(srcDir, 'literacy/movespelling/js');
        const movespellingJsDest = resolve(distDir, 'literacy/movespelling/js');
        if (existsSync(movespellingJsSrc)) {
          copyDir(movespellingJsSrc, movespellingJsDest);
          console.log('Copied: literacy/movespelling/js/');
        }
        
        // Copy movespelling assets/data directory (words.json)
        const movespellingDataSrc = resolve(srcDir, 'literacy/movespelling/assets/data');
        const movespellingDataDest = resolve(distDir, 'literacy/movespelling/assets/data');
        if (existsSync(movespellingDataSrc)) {
          copyDir(movespellingDataSrc, movespellingDataDest);
          console.log('Copied: literacy/movespelling/assets/data/');
        }
      },
    },
  ],
});
