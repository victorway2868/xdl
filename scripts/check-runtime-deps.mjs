#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

const projectRoot = process.cwd();

const aliasPrefixes = [
  '@/',
  '@main/',
  '@shared/',
  '@renderer/',
  '@plugins/',
];

const ignorePackages = new Set([
  'electron',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walk(dir, exts, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, exts, files);
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function isAliasImport(source) {
  return aliasPrefixes.some((p) => source.startsWith(p));
}

function isBuiltin(source) {
  if (source.startsWith('node:')) return true;
  return builtinModules.includes(source);
}

function topLevelPackage(source) {
  if (source.startsWith('@')) {
    const parts = source.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : source;
  }
  return source.split('/')[0];
}

function extractImports(code) {
  const sources = new Set();
  const patterns = [
    /import\s+[^'"()]*?from\s+['"]([^'"\\]+)['"]/g, // import x from 'y'
    /import\s+['"]([^'"\\]+)['"]/g, // import 'y'
    /require\(\s*['"]([^'"\\]+)['"]\s*\)/g, // require('y')
    /import\(\s*['"]([^'"\\]+)['"]\s*\)/g, // import('y')
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code)) !== null) {
      sources.add(m[1]);
    }
  }
  return Array.from(sources);
}

function collectRuntimePackages() {
  const mainDir = path.join(projectRoot, 'src', 'main');
  const preloadDir = path.join(projectRoot, 'src', 'main'); // preload lives under main root in this project
  const files = [];
  if (fs.existsSync(mainDir)) walk(mainDir, ['.ts', '.tsx', '.js', '.mjs'], files);
  if (fs.existsSync(preloadDir)) walk(preloadDir, ['.ts', '.tsx', '.js', '.mjs'], files);

  const packages = new Set();
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    for (const src of extractImports(code)) {
      if (src.startsWith('.') || isAliasImport(src) || isBuiltin(src)) continue;
      const name = topLevelPackage(src);
      if (ignorePackages.has(name)) continue;
      packages.add(name);
    }
  }
  return Array.from(packages).sort();
}

function main() {
  const pkgJsonPath = path.join(projectRoot, 'package.json');
  const pkg = readJson(pkgJsonPath);
  const deps = new Set(Object.keys(pkg.dependencies || {}));
  const devDeps = new Set(Object.keys(pkg.devDependencies || {}));

  const runtimePkgs = collectRuntimePackages();

  const missing = [];
  for (const name of runtimePkgs) {
    if (!deps.has(name)) {
      missing.push(name);
    }
  }

  if (missing.length) {
    console.error('\n[check-runtime-deps] 以下主进程/预加载依赖未在 dependencies 中：');
    for (const name of missing) {
      const where = devDeps.has(name) ? '(当前在 devDependencies)' : '(未声明)';
      console.error(` - ${name} ${where}`);
    }
    console.error('\n请将它们移动到 package.json 的 dependencies 后再打包。');
    process.exit(1);
  } else {
    console.log('[check-runtime-deps] OK：未发现缺失的运行时依赖。');
  }
}

main();


