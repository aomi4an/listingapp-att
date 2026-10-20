// Сборка всего проекта одной командой:  node build.mjs
//   --rid=linux-x64      платформа сервера (по умолчанию linux-x64; для ARM: linux-arm64)
//   --fx                 не вшивать .NET в сборку (на сервере тогда должен стоять .NET 10 Runtime)
//
// Результат: папка publish/ и архив listings-publish.tar.gz — их и заливаем на сервер.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rid = (args.find(a => a.startsWith('--rid=')) ?? '--rid=linux-x64').split('=')[1];
const frameworkDependent = args.includes('--fx');

const rel = p => path.relative(root, p) || '.';

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}    [${rel(cwd)}]`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✖ Ошибка на шаге: ${cmd}`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd) {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout ?? '').trim() : null;
}

// ---------- 0. Проверка инструментов ----------
const dotnetVersion = capture('dotnet --version');
if (!dotnetVersion || !dotnetVersion.startsWith('10.')) {
  console.error(`✖ Нужен .NET 10 SDK (dotnet --version → 10.x). Сейчас: ${dotnetVersion ?? 'не найден'}`);
  process.exit(1);
}
const ng = capture('ng version') !== null ? 'ng' : 'npx --yes @angular/cli';
console.log(`.NET SDK ${dotnetVersion}; Angular CLI: ${ng}`);

// ---------- 1. Каркас Angular-проекта (один раз) ----------
const webDir = path.join(root, 'web');
if (!fs.existsSync(path.join(webDir, 'package.json'))) {
  run(`${ng} new web --style=css --ssr=false --routing=false --skip-git --skip-tests --defaults`);
}

// ---------- 2. Накладываем наши исходники поверх каркаса ----------
// Папку app каркаса очищаем целиком: в web-src лежит весь код приложения (с маршрутами),
// а устаревшие файлы прошлых сборок не должны оставаться в web/src/app.
fs.rmSync(path.join(webDir, 'src', 'app'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'web-src', 'src'), path.join(webDir, 'src'), { recursive: true, force: true });
console.log('\n✔ Исходники Angular скопированы в web/src');

// ---------- 3. Сборка Angular ----------
run('npm run build', webDir);

const distRoot = path.join(webDir, 'dist');
let browserDir = null;
(function find(dir) {
  if (browserDir || !fs.existsSync(dir)) return;
  if (fs.existsSync(path.join(dir, 'index.html'))) { browserDir = dir; return; }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) find(path.join(dir, e.name));
})(distRoot);
if (!browserDir) { console.error('✖ Не найден результат сборки Angular (dist/**/index.html)'); process.exit(1); }

// ---------- 4. Кладём фронтенд в wwwroot API ----------
const wwwroot = path.join(root, 'api', 'wwwroot');
for (const f of fs.readdirSync(wwwroot)) if (f !== '.gitkeep') fs.rmSync(path.join(wwwroot, f), { recursive: true, force: true });
fs.cpSync(browserDir, wwwroot, { recursive: true });
console.log(`✔ Фронтенд скопирован в ${rel(wwwroot)}`);

// ---------- 5. Публикация .NET ----------
const publishDir = path.join(root, 'publish');
fs.rmSync(publishDir, { recursive: true, force: true });
const sc = frameworkDependent ? '--self-contained false' : '--self-contained true';
run(`dotnet publish api/ListingsApi.csproj -c Release -r ${rid} ${sc} -o publish`);

// ---------- 6. Архив ----------
const archive = path.join(root, 'listings-publish.tar.gz');
fs.rmSync(archive, { force: true });
run('tar -czf listings-publish.tar.gz -C publish .');

console.log(`
✔ ГОТОВО
  Папка:  publish/
  Архив:  listings-publish.tar.gz   (платформа: ${rid}, ${frameworkDependent ? 'нужен .NET 10 Runtime на сервере' : '.NET внутри, на сервере ничего ставить не нужно'})

Дальше — раздел «Развёртывание на сервере» в README.md
`);
