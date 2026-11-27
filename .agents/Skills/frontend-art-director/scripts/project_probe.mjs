#!/usr/bin/env node
/** Read-only, dependency-free Node 20+ repo inventory. No installs or writes. */
import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.argv[2] || process.cwd());
if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`Directory not found: ${target}`);
  process.exit(2);
}
const exists = (p) => fs.existsSync(path.join(target, p));
const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(path.join(target, p), 'utf8')); }
  catch { return null; }
};
const pkg = readJson('package.json');
const packages = Object.assign({}, pkg?.dependencies || {}, pkg?.devDependencies || {});
const componentsConfig = readJson('components.json');
const needles = ['react','react-dom','next','vite','typescript','tailwindcss','gsap','@gsap/react','framer-motion','motion','three','@react-three/fiber','lenis','@21st-dev/cli','@21st-dev/magic','@radix-ui/react-dialog','@playwright/test','playwright','vitest','jest','@testing-library/react','lucide-react'];
const configs = ['vite.config.ts','vite.config.js','next.config.js','next.config.mjs','next.config.ts','tsconfig.json','postcss.config.js','postcss.config.mjs','tailwind.config.js','tailwind.config.ts','components.json','eslint.config.js','eslint.config.mjs','biome.json','playwright.config.ts','vitest.config.ts','AGENTS.md'];
const sourceRoots = ['src','app','pages','components','routes','styles','public','frontend','web'];
const dirs = sourceRoots.filter(exists);
let summary = { files: 0, tsx: 0, css: 0, tests: 0, imageFiles: 0 };
const skip = new Set(['node_modules','.git','.next','dist','build','coverage','.turbo','.cache','.venv','.agents']);
function scan(dir, depth=0) {
  if (depth > 7 || summary.files > 15000) return;
  let entries=[];
  try { entries=fs.readdirSync(dir,{withFileTypes:true}); } catch { return; }
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const full=path.join(dir,e.name);
    if (e.isDirectory()) scan(full,depth+1);
    else if (e.isFile()) {
      summary.files++;
      if (/\.tsx$/i.test(e.name)) summary.tsx++;
      if (/\.(css|scss|sass)$/i.test(e.name)) summary.css++;
      if (/\.(test|spec)\.[cm]?[jt]sx?$/i.test(e.name)) summary.tests++;
      if (/\.(png|jpg|jpeg|webp|svg|avif|gif)$/i.test(e.name)) summary.imageFiles++;
    }
  }
}
for (const d of dirs) {
  // Avoid a second scan of nested source roots already included through a scanned parent.
  if (['frontend','web'].includes(d) && (exists('src') || exists('app') || exists('pages'))) continue;
  scan(path.join(target,d));
}
const manager = exists('bun.lock') || exists('bun.lockb') ? 'bun'
  : exists('pnpm-lock.yaml') ? 'pnpm'
  : exists('yarn.lock') ? 'yarn'
  : exists('package-lock.json') ? 'npm' : 'unidentified';
const output = {
  project: target,
  packageName: pkg?.name || null,
  packageManager: manager,
  possibleMonorepo: ['pnpm-workspace.yaml','turbo.json','lerna.json','nx.json'].filter(exists),
  scripts: pkg?.scripts || {},
  knownDependencies: Object.fromEntries(needles.filter(x=>packages[x]).map(x=>[x, packages[x]])),
  knownConfigs: configs.filter(exists),
  configuredRegistryNames: Object.keys(componentsConfig?.registries || {}),
  roots: dirs,
  fileSummary: summary,
  notes: [
    !pkg ? 'No package.json in this directory; try the frontend app subdirectory.' : null,
    !packages['gsap'] ? 'GSAP not detected in this package manifest (may be in a workspace).' : null,
    !exists('components.json') ? 'No local shadcn components.json detected here.' : null,
    'This probe cannot verify Codex skills, connected MCP tools, authentication, or paid catalog access; check those live.',
  ].filter(Boolean),
};
process.stdout.write(JSON.stringify(output,null,2)+'\n');
